"""Ingest local reviewed candidates into separate promoted/quarantine JSONL.

Input contract:
- ``--source-manifest`` is a JSON array of SourceContext objects.
- ``--assertions`` is JSONL with one CandidateRecord object per nonblank line,
  including a nested ``assertions`` array of FieldAssertion objects.
- ``--out`` receives promoted candidate JSONL.
- ``--quarantine`` receives reason-coded QuarantineRecord JSONL.

The command performs no network access, review-state changes, registry writes,
release mutation, or manufacturing authorization.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys
import tempfile
from types import MappingProxyType
from typing import Any


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
PACKAGE_SOURCE = REPOSITORY_ROOT / "packages" / "component-master" / "src"
sys.path.insert(0, str(PACKAGE_SOURCE))

from monolith_component_master.adapters.reviewed_assertions import (  # noqa: E402
    ReviewedAssertionAdapter,
    SourceContext,
)
from monolith_component_master.evidence import FieldAssertion  # noqa: E402
from monolith_component_master.ingestion import (  # noqa: E402
    CandidateRecord,
    QuarantineRecord,
    _require_canonical_id,
)


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Validate local HUMAN_REVIEWED assertions and write separate "
            "deterministic promoted and quarantine JSONL files."
        )
    )
    parser.add_argument("--brand", required=True, help="canonical brand ID")
    parser.add_argument(
        "--source-manifest",
        required=True,
        type=Path,
        help="JSON array of explicit source context objects",
    )
    parser.add_argument(
        "--assertions",
        required=True,
        type=Path,
        help="JSONL candidate records with nested field assertions",
    )
    parser.add_argument(
        "--out",
        required=True,
        type=Path,
        help="new promoted-candidate JSONL output",
    )
    parser.add_argument(
        "--quarantine",
        required=True,
        type=Path,
        help="new quarantine-record JSONL output",
    )
    return parser


def _require_object(value: object, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise TypeError(f"{label} must be a JSON object")
    return value


def _load_source_contexts(path: Path) -> tuple[SourceContext, ...]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise TypeError("source manifest must be a JSON array")
    return tuple(
        SourceContext(**_require_object(item, "source context"))
        for item in payload
    )


def _load_candidates(path: Path, brand_id: str) -> tuple[CandidateRecord, ...]:
    candidates: list[CandidateRecord] = []
    for line_number, raw_line in enumerate(
        path.read_text(encoding="utf-8").splitlines(),
        start=1,
    ):
        if not raw_line.strip():
            continue
        payload = _require_object(
            json.loads(raw_line),
            f"assertions line {line_number}",
        )
        assertion_payloads = payload.get("assertions")
        if not isinstance(assertion_payloads, list):
            raise TypeError(
                f"assertions line {line_number} must contain an assertions array"
            )
        candidate_payload = dict(payload)
        candidate_payload["assertions"] = tuple(
            FieldAssertion(
                **_require_object(
                    assertion,
                    f"assertions line {line_number} assertion",
                )
            )
            for assertion in assertion_payloads
        )
        candidate = CandidateRecord(**candidate_payload)
        if candidate.brand_id != brand_id:
            raise ValueError(
                f"candidate {candidate.candidate_id} brand_id "
                f"{candidate.brand_id!r} does not match --brand {brand_id!r}"
            )
        candidates.append(candidate)
    return tuple(candidates)


def _jsonable(value: object) -> object:
    if isinstance(value, MappingProxyType):
        return {str(key): _jsonable(item) for key, item in value.items()}
    if isinstance(value, dict):
        return {str(key): _jsonable(item) for key, item in value.items()}
    if isinstance(value, (tuple, list)):
        return [_jsonable(item) for item in value]
    return value


def _candidate_payload(candidate: CandidateRecord) -> dict[str, object]:
    return {
        "assertions": [
            {
                "assertion_id": assertion.assertion_id,
                "entity_id": assertion.entity_id,
                "field_path": assertion.field_path,
                "locator": assertion.locator,
                "review_state": assertion.review_state,
                "reviewer": assertion.reviewer,
                "source_id": assertion.source_id,
                "value": _jsonable(assertion.value),
            }
            for assertion in candidate.assertions
        ],
        "brand_id": candidate.brand_id,
        "candidate_id": candidate.candidate_id,
        "entity_kind": candidate.entity_kind,
        "extraction_method": candidate.extraction_method,
    }


def _quarantine_payload(record: QuarantineRecord) -> dict[str, object]:
    return {
        "candidate_id": record.candidate_id,
        "evidence_ids": list(record.evidence_ids),
        "owner_role": record.owner_role,
        "reason_code": record.reason_code,
    }


def _jsonl_bytes(records: list[dict[str, object]]) -> bytes:
    return "".join(
        json.dumps(record, sort_keys=True, separators=(",", ":")) + "\n"
        for record in records
    ).encode("utf-8")


def _write_new_outputs(
    promoted_path: Path,
    promoted_bytes: bytes,
    quarantine_path: Path,
    quarantine_bytes: bytes,
) -> None:
    promoted_parent = promoted_path.parent
    quarantine_parent = quarantine_path.parent
    if not promoted_parent.is_dir() or not quarantine_parent.is_dir():
        raise FileNotFoundError("output parent directories must already exist")

    temporary_outputs: list[tuple[Path, Path]] = []
    published_outputs: list[tuple[Path, Path]] = []
    try:
        for destination, content in (
            (quarantine_path, quarantine_bytes),
            (promoted_path, promoted_bytes),
        ):
            with tempfile.NamedTemporaryFile(
                mode="wb",
                prefix=f".{destination.name}.",
                suffix=".tmp",
                dir=destination.parent,
                delete=False,
            ) as temporary:
                temporary.write(content)
                temporary.flush()
                os.fsync(temporary.fileno())
                temporary_outputs.append((Path(temporary.name), destination))

        for temporary_path, destination in temporary_outputs:
            os.link(temporary_path, destination)
            published_outputs.append((temporary_path, destination))
    except BaseException:
        for temporary_path, destination in reversed(published_outputs):
            try:
                if os.path.samefile(temporary_path, destination):
                    destination.unlink()
            except OSError:
                pass
        raise
    finally:
        for temporary_path, _destination in temporary_outputs:
            temporary_path.unlink(missing_ok=True)


def main(argv: list[str] | None = None) -> int:
    parser = _parser()
    arguments = parser.parse_args(argv)
    promoted_path = arguments.out.resolve()
    quarantine_path = arguments.quarantine.resolve()

    try:
        # Validate the flag itself, not only each candidate: with zero
        # candidates no per-candidate comparison runs, so an uncanonical brand
        # would otherwise write two unattributed output files and exit zero.
        _require_canonical_id(arguments.brand, "--brand")
        if promoted_path == quarantine_path:
            raise ValueError("--out and --quarantine must be different paths")
        collisions = tuple(
            path for path in (promoted_path, quarantine_path) if path.exists()
        )
        if collisions:
            raise FileExistsError(
                "output path already exists: "
                + ", ".join(str(path) for path in collisions)
            )

        source_contexts = _load_source_contexts(
            arguments.source_manifest.resolve()
        )
        candidates = _load_candidates(
            arguments.assertions.resolve(),
            arguments.brand,
        )
        adapter = ReviewedAssertionAdapter(source_contexts)
        promoted: list[dict[str, object]] = []
        quarantined: list[dict[str, object]] = []
        for candidate in candidates:
            result = adapter.ingest(candidate)
            promoted.extend(
                _candidate_payload(record)
                for record in result.promoted
            )
            quarantined.extend(
                _quarantine_payload(record)
                for record in result.quarantined
            )

        _write_new_outputs(
            promoted_path,
            _jsonl_bytes(promoted),
            quarantine_path,
            _jsonl_bytes(quarantined),
        )
    except (OSError, TypeError, ValueError, json.JSONDecodeError) as error:
        parser.exit(2, f"error: {error}\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
