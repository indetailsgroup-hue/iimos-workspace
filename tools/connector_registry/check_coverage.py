"""Report measured coverage over one connector-registry root.

Reads the documented local JSONL contract described in
``monolith_component_master.coverage`` and writes a canonical coverage
snapshot to standard output. No network access, no registry mutation, no
release mutation, and no manufacturing authorization.

Every count in the output carries its denominator and the function that
produced it. A discovered item that no rule classifies is named, not dropped;
with ``--fail-on-unclassified`` it also fails the run.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
PACKAGE_SOURCE = REPOSITORY_ROOT / "packages" / "component-master" / "src"
sys.path.insert(0, str(PACKAGE_SOURCE))

from monolith_component_master.coverage import build_snapshot  # noqa: E402
from monolith_component_master.releases import (  # noqa: E402
    canonical_json_bytes,
    snapshot_payload,
    write_new_files,
)


def _emit(payload: bytes) -> None:
    """Write exact bytes, so no platform newline translation can occur."""

    stream = getattr(sys.stdout, "buffer", None)
    if stream is None:
        sys.stdout.write(payload.decode("utf-8"))
        return
    stream.write(payload)
    stream.flush()


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Measure classified coverage, evidence-dimension counts and "
            "blocked sources over one registry root."
        )
    )
    parser.add_argument(
        "--root",
        required=True,
        type=Path,
        help="registry root directory to measure",
    )
    parser.add_argument(
        "--fail-on-unclassified",
        action="store_true",
        help="exit non-zero when any discovered item is unclassified",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="new canonical coverage-snapshot JSON output (never overwritten)",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _parser()
    arguments = parser.parse_args(argv)

    try:
        # Flags first, before any filesystem read of the root: an output
        # collision must be refused even when the registry holds nothing.
        destination = None
        if arguments.out is not None:
            destination = arguments.out.resolve()
            if destination.exists():
                raise FileExistsError(
                    f"output path already exists: {destination}"
                )

        snapshot = build_snapshot(arguments.root)

        # Decided before anything is published: a failing run must leave no
        # output at all, not an output plus a non-zero exit.
        if arguments.fail_on_unclassified and snapshot.unclassified:
            raise ValueError(
                "unclassified discovered items: "
                + ", ".join(
                    f"{record.item_id} ({record.origin}, {record.reason})"
                    for record in snapshot.unclassified
                )
            )

        payload = canonical_json_bytes(snapshot_payload(snapshot))
        if destination is not None:
            write_new_files({destination: payload})

        _emit(payload)
    except (OSError, TypeError, ValueError, json.JSONDecodeError) as error:
        parser.exit(2, f"error: {error}\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
