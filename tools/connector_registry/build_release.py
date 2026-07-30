"""Build a deterministic release over one connector-registry root.

Two consecutive builds of the same input produce byte-identical
``registry.json`` and identical digests, in separate processes and under
``PYTHONHASHSEED=random``. Input order does not change the output.

The command signs nothing, freezes nothing, and grants no manufacturing,
export or production authority. A release over an empty registry succeeds and
states plainly that it covers nothing.

By default nothing is written: the manifest is printed to standard output.
``--out-dir`` publishes ``registry.json`` and ``release-manifest.json`` into an
existing directory, all-or-nothing, never overwriting an existing file.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
PACKAGE_SOURCE = REPOSITORY_ROOT / "packages" / "component-master" / "src"
sys.path.insert(0, str(PACKAGE_SOURCE))

from monolith_component_master.releases import (  # noqa: E402
    REGISTRY_PAYLOAD_FILENAME,
    RELEASE_MANIFEST_FILENAME,
    _require_created_at,
    _require_semantic_version,
    build_release,
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
            "Build a deterministic coverage release over one registry root "
            "and print its manifest."
        )
    )
    parser.add_argument(
        "--root",
        required=True,
        type=Path,
        help="registry root directory to release",
    )
    parser.add_argument(
        "--version",
        required=True,
        help="semantic release version, MAJOR.MINOR.PATCH",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=None,
        help="existing directory to publish registry.json and the manifest into",
    )
    parser.add_argument(
        "--created-at",
        default=None,
        help=(
            "ISO-8601 UTC creation timestamp for the manifest; it never "
            "enters the hashed payload"
        ),
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _parser()
    arguments = parser.parse_args(argv)

    try:
        # Every flag is validated before any filesystem work. Task 7 shipped a
        # guard that never ran when the input was empty; the same shape here
        # would let a malformed version reach the disk.
        version = _require_semantic_version(arguments.version)
        created_at = _require_created_at(
            datetime.now(timezone.utc).isoformat()
            if arguments.created_at is None
            else arguments.created_at
        )

        payload_path: Path | None = None
        manifest_path: Path | None = None
        if arguments.out_dir is not None:
            out_dir = arguments.out_dir.resolve()
            if not out_dir.is_dir():
                raise FileNotFoundError(
                    f"--out-dir must be an existing directory: {out_dir}"
                )
            payload_path = out_dir / REGISTRY_PAYLOAD_FILENAME
            manifest_path = out_dir / RELEASE_MANIFEST_FILENAME
            collisions = tuple(
                str(path)
                for path in (payload_path, manifest_path)
                if path.exists()
            )
            if collisions:
                raise FileExistsError(
                    "output path already exists: " + ", ".join(collisions)
                )

        release = build_release(
            root=arguments.root,
            version=version,
            created_at_utc=created_at,
        )
        manifest = release.manifest_bytes()

        if payload_path is not None and manifest_path is not None:
            write_new_files(
                {
                    payload_path: release.payload_bytes,
                    manifest_path: manifest,
                }
            )

        _emit(manifest)
    except (OSError, TypeError, ValueError, json.JSONDecodeError) as error:
        parser.exit(2, f"error: {error}\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
