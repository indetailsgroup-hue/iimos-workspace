"""Deterministic, byte-reproducible releases over a coverage snapshot.

A release publishes what a registry root holds at the moment it is measured. It
signs nothing, freezes nothing, and grants no manufacturing, export or
production authority. A release over an empty registry succeeds and says
plainly that it covers nothing.

Determinism rules, all of them load-bearing:

- UTF-8 JSON, sorted keys, LF line endings, no trailing whitespace.
- **No wall-clock value inside the hashed payload.** Creation metadata lives in
  the manifest, outside :attr:`RegistryRelease.payload_sha256`.
- Record order is derived from a total order over canonical IDs after
  duplicates are refused. Input order therefore cannot change the output bytes.
- Unordered collections are refused rather than sorted, in the payload and in
  every record that feeds it. A ``set`` anywhere in an output path passes a
  single-process test and changes in the field.
- Any value that cannot be canonicalized deterministically is refused. There is
  no best-effort fallback.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime, timedelta
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
from types import MappingProxyType

from .coverage import (
    SNAPSHOT_SCHEMA,
    CoverageSnapshot,
    canonical_value,
)
from .ingestion import _require_string, _require_text


RELEASE_ID_PREFIX = "release:connector-registry:"
AUTHORITY_STATE = "NOT-FOR-PRODUCTION"
REGISTRY_PAYLOAD_FILENAME = "registry.json"
RELEASE_MANIFEST_FILENAME = "release-manifest.json"

_SEMANTIC_VERSION = re.compile(r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)")
_SHA256 = re.compile(r"[0-9a-f]{64}")


def _plain(value: object) -> object:
    """Render a canonical snapshot into the plain types ``json`` accepts."""

    if isinstance(value, Mapping):
        return {key: _plain(item) for key, item in value.items()}
    if isinstance(value, tuple):
        return [_plain(item) for item in value]
    return value


def canonical_json_bytes(payload: object) -> bytes:
    """Serialize deterministically, or refuse.

    Sorted keys, LF terminator, UTF-8. Every value passes the closed
    admitted-type allowlist first, so a ``Decimal``, ``bytearray``,
    ``frozenset`` or non-finite ``float`` is refused rather than coerced.
    """

    canonical = canonical_value(payload, "payload")
    text = json.dumps(
        _plain(canonical),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    )
    try:
        encoded = text.encode("utf-8")
    except UnicodeEncodeError as error:
        raise ValueError(
            "payload must be encodable as UTF-8 without surrogates"
        ) from error
    return encoded + b"\n"


def _require_semantic_version(value: object) -> str:
    text = _require_text(value, "version")
    if _SEMANTIC_VERSION.fullmatch(text) is None:
        raise ValueError(
            "version must be MAJOR.MINOR.PATCH with no leading zeros, "
            "no prerelease and no build metadata"
        )
    return text


def _require_created_at(value: object) -> str:
    text = _require_string(value, "created_at_utc")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError as error:
        raise ValueError(
            "created_at_utc must be an ISO-8601 timestamp with a UTC offset"
        ) from error
    if parsed.tzinfo is None or parsed.utcoffset() != timedelta(0):
        raise ValueError(
            "created_at_utc must carry an explicit UTC offset"
        )
    return text


def _require_digest(value: object, field_name: str) -> str:
    text = _require_text(value, field_name)
    if _SHA256.fullmatch(text) is None:
        raise ValueError(
            f"{field_name} must be exactly 64 lowercase hexadecimal characters"
        )
    return text


def _exact_snapshot(snapshot: object) -> CoverageSnapshot:
    """Require exact type identity, not ``isinstance``.

    A subclass can override ``__getattribute__`` and answer one way while the
    counts are read, then another way once the release is published.
    """

    if type(snapshot) is not CoverageSnapshot:
        raise TypeError("snapshot must be exactly a CoverageSnapshot")
    return snapshot


def snapshot_payload(snapshot: CoverageSnapshot) -> Mapping[str, object]:
    """The hashed payload. It contains no wall-clock value, by construction."""

    _exact_snapshot(snapshot)
    unbacked = set(snapshot.unbacked_item_ids)
    return MappingProxyType(
        {
            "authority_state": AUTHORITY_STATE,
            "blocked_source_count": snapshot.blocked_source_count.as_payload(),
            "blocked_sources": tuple(
                record.as_payload() for record in snapshot.blocked_sources
            ),
            "classification_counts": MappingProxyType(
                {
                    state: measured.as_payload()
                    for state, measured in snapshot.classification_counts.items()
                }
            ),
            "classified_item_count": snapshot.classified_item_count.as_payload(),
            "coverage_statement": snapshot.coverage_statement,
            "dimension_verified_counts": MappingProxyType(
                {
                    dimension: measured.as_payload()
                    for dimension, measured in (
                        snapshot.dimension_verified_counts.items()
                    )
                }
            ),
            "discovered_item_count": snapshot.discovered_item_count,
            "evidence_gate_findings": tuple(
                finding.as_payload()
                for finding in snapshot.evidence_gate_findings
            ),
            "items": tuple(
                item.as_payload(
                    evidence_backed=item.item_id not in unbacked
                )
                for item in snapshot.items
            ),
            "registered_source_count": (
                snapshot.registered_source_count.as_payload()
            ),
            "schema": SNAPSHOT_SCHEMA,
            "source_denominator": tuple(
                entry.as_payload() for entry in snapshot.source_denominator
            ),
            "unbacked_verified_item_count": (
                snapshot.unbacked_verified_item_count.as_payload()
            ),
            "unclassified": tuple(
                record.as_payload() for record in snapshot.unclassified
            ),
            "unclassified_item_count": (
                snapshot.unclassified_item_count.as_payload()
            ),
        }
    )


def source_denominator_digest(snapshot: CoverageSnapshot) -> str:
    """SHA-256 over the exact set of sources the snapshot measured against."""

    _exact_snapshot(snapshot)
    return hashlib.sha256(
        canonical_json_bytes(
            {
                "schema": SNAPSHOT_SCHEMA + "#source-denominator",
                "source_denominator": tuple(
                    entry.as_payload()
                    for entry in snapshot.source_denominator
                ),
            }
        )
    ).hexdigest()


@dataclass(frozen=True)
class RegistryRelease:
    """Release identity, digests, and creation metadata kept outside them."""

    release_id: str
    version: str
    payload_sha256: str
    source_denominator_sha256: str
    created_at_utc: str
    payload_bytes: bytes

    def __post_init__(self) -> None:
        version = _require_semantic_version(self.version)
        _require_text(self.release_id, "release_id")
        if self.release_id != RELEASE_ID_PREFIX + version:
            raise ValueError(
                f"release_id must be {RELEASE_ID_PREFIX}{version}"
            )
        _require_digest(self.payload_sha256, "payload_sha256")
        _require_digest(
            self.source_denominator_sha256, "source_denominator_sha256"
        )
        _require_created_at(self.created_at_utc)
        if type(self.payload_bytes) is not bytes:
            raise TypeError("payload_bytes must be exactly bytes")
        if not self.payload_bytes.endswith(b"\n"):
            raise ValueError("payload_bytes must end with a single LF")
        if b"\r" in self.payload_bytes:
            raise ValueError("payload_bytes must not contain CR")
        if (
            hashlib.sha256(self.payload_bytes).hexdigest()
            != self.payload_sha256
        ):
            raise ValueError("payload_sha256 does not match payload_bytes")

    def manifest(self) -> Mapping[str, object]:
        """Creation metadata lives here, outside the hashed payload."""

        return MappingProxyType(
            {
                "authority_state": AUTHORITY_STATE,
                "created_at_utc": self.created_at_utc,
                "payload_sha256": self.payload_sha256,
                "release_id": self.release_id,
                "source_denominator_sha256": self.source_denominator_sha256,
                "version": self.version,
            }
        )

    def manifest_bytes(self) -> bytes:
        return canonical_json_bytes(self.manifest())


def build_release_from_snapshot(
    snapshot: CoverageSnapshot,
    *,
    version: str,
    created_at_utc: str,
) -> RegistryRelease:
    """Build a release from an already-measured snapshot."""

    resolved_version = _require_semantic_version(version)
    resolved_created_at = _require_created_at(created_at_utc)
    _exact_snapshot(snapshot)
    payload = canonical_json_bytes(snapshot_payload(snapshot))
    return RegistryRelease(
        release_id=RELEASE_ID_PREFIX + resolved_version,
        version=resolved_version,
        payload_sha256=hashlib.sha256(payload).hexdigest(),
        source_denominator_sha256=source_denominator_digest(snapshot),
        created_at_utc=resolved_created_at,
        payload_bytes=payload,
    )


def build_release(
    *,
    root: object,
    version: str,
    created_at_utc: str,
) -> RegistryRelease:
    """Produce a release from a registry root.

    Flags are validated before any filesystem work, so a malformed version
    cannot cause a root to be read — Task 7 shipped a guard that never ran when
    the input was empty, and this is the same failure shape.
    """

    resolved_version = _require_semantic_version(version)
    resolved_created_at = _require_created_at(created_at_utc)

    from .coverage import build_snapshot

    return build_release_from_snapshot(
        build_snapshot(root),
        version=resolved_version,
        created_at_utc=resolved_created_at,
    )


def write_new_files(outputs: Mapping[object, bytes]) -> None:
    """Publish every file or none of them, never overwriting anything.

    The link step is what makes the check-then-write race safe: ``os.link``
    fails if the destination appeared after the collision check, so an external
    process cannot be overwritten between the two.
    """

    if not isinstance(outputs, Mapping):
        raise TypeError("outputs must be a mapping of path to bytes")

    resolved: list[tuple[Path, bytes]] = []
    for destination, content in outputs.items():
        path = Path(destination).resolve()
        if type(content) is not bytes:
            raise TypeError(f"{path}: content must be exactly bytes")
        resolved.append((path, content))
    resolved.sort(key=lambda entry: str(entry[0]))

    seen: set[Path] = set()
    for path, _content in resolved:
        if path in seen:
            raise ValueError(f"duplicate output path: {path}")
        seen.add(path)
        if not path.parent.is_dir():
            raise FileNotFoundError(
                f"output parent directory must already exist: {path.parent}"
            )
        if path.exists():
            raise FileExistsError(f"output path already exists: {path}")

    temporary_outputs: list[tuple[Path, Path]] = []
    published: list[tuple[Path, Path]] = []
    try:
        for destination, content in resolved:
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
            published.append((temporary_path, destination))
    except BaseException:
        for temporary_path, destination in reversed(published):
            try:
                if os.path.samefile(temporary_path, destination):
                    destination.unlink()
            except OSError:
                pass
        raise
    finally:
        for temporary_path, _destination in temporary_outputs:
            temporary_path.unlink(missing_ok=True)
