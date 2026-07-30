"""Proof that the personal installation is a copy of the governed source.

The install under `~/.codex/skills/book-to-skill` is what Codex actually loads.
Nothing else in this suite looks at it, so without this test the governed tree
could be audited, tested, and still differ from the bytes in use — which is
exactly the state this reconciliation found.

The installed directory is passed in through `BOOK_TO_SKILL_INSTALLED_DIR` so
the test never guesses a machine path; the run that supplies it is the run that
produces the evidence.
"""

from __future__ import annotations

import os
from hashlib import sha256
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "tools" / "codex-skills" / "book-to-skill"
ENV_VAR = "BOOK_TO_SKILL_INSTALLED_DIR"

IGNORED_PARTS = {"__pycache__", ".pytest_cache"}


def tree(root: Path) -> dict[str, str]:
    return {
        path.relative_to(root).as_posix(): sha256(path.read_bytes()).hexdigest()
        for path in sorted(root.rglob("*"))
        if path.is_file() and not IGNORED_PARTS.intersection(path.parts)
    }


@pytest.mark.skipif(
    ENV_VAR not in os.environ,
    reason=f"set {ENV_VAR} to the installed skill directory to verify the deployment",
)
def test_personal_installation_matches_governed_source() -> None:
    installed = Path(os.environ[ENV_VAR]).resolve(strict=True)
    assert tree(installed) == tree(SOURCE)


@pytest.mark.skipif(ENV_VAR not in os.environ, reason=f"{ENV_VAR} is not set")
def test_installed_tree_has_no_symlinks_or_repositories() -> None:
    installed = Path(os.environ[ENV_VAR]).resolve(strict=True)
    suspicious = [
        path.relative_to(installed).as_posix()
        for path in installed.rglob("*")
        if path.is_symlink() or path.name == ".git"
    ]
    assert suspicious == []
