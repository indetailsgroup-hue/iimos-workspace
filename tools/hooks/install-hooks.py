#!/usr/bin/env python3
"""Point this repository's git at tools/hooks. Idempotent; prints what it did.

`git config --local core.hooksPath tools/hooks` makes git run the *tracked*
hooks under `tools/hooks/` instead of the untracked `.git/hooks/`, so the
pre-commit guardrail travels with the repository. Run once per clone:

    python tools/hooks/install-hooks.py

Safe to run again: it reads the current value first and only writes when it
differs, then verifies the setting took effect. Python stdlib only.
"""

from __future__ import annotations

import stat
import subprocess
import sys
from pathlib import Path

HOOKS_REL = "tools/hooks"


def _git(repo_root: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", "-C", str(repo_root), *args],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )


def repo_root_from_here() -> Path:
    """The git top-level containing this script (not the caller's cwd)."""
    here = Path(__file__).resolve().parent
    r = _git(here, "rev-parse", "--show-toplevel")
    if r.returncode != 0:
        raise SystemExit(f"not inside a git repository: {here}\n{r.stderr.strip()}")
    return Path(r.stdout.strip())


def ensure_executable(path: Path) -> None:
    """Add the execute bits so POSIX git will run the hook.

    On Windows git runs a hook via its shebang regardless of this bit, so a
    filesystem that ignores chmod is not a failure — hence the swallowed error."""
    try:
        path.chmod(path.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    except OSError:
        pass


def install(repo_root: Path | str) -> tuple[str, bool]:
    """Set core.hooksPath -> tools/hooks. Returns (message, changed).

    Idempotent: if the value is already `tools/hooks` nothing is written. Always
    verifies the final state and raises if it is not what was intended."""
    repo_root = Path(repo_root)
    pre_commit = repo_root / HOOKS_REL / "pre-commit"
    if pre_commit.exists():
        ensure_executable(pre_commit)

    current = _git(repo_root, "config", "--local", "--get", "core.hooksPath")
    cur = current.stdout.strip() if current.returncode == 0 else ""

    if cur == HOOKS_REL:
        msg, changed = f"core.hooksPath already = {HOOKS_REL} (idempotent no-op)", False
    else:
        res = _git(repo_root, "config", "--local", "core.hooksPath", HOOKS_REL)
        if res.returncode != 0:
            raise SystemExit(f"failed to set core.hooksPath: {res.stderr.strip()}")
        prev = f" (was {cur!r})" if cur else ""
        msg, changed = f"set core.hooksPath -> {HOOKS_REL}{prev}", True

    check = _git(repo_root, "config", "--local", "--get", "core.hooksPath")
    got = check.stdout.strip() if check.returncode == 0 else ""
    if got != HOOKS_REL:
        raise SystemExit(f"verification failed: core.hooksPath is {got!r}, "
                         f"expected {HOOKS_REL!r}")
    return msg, changed


def main() -> int:
    repo_root = repo_root_from_here()
    msg, _ = install(repo_root)
    print(msg)
    print(f"verified: (git -C {repo_root} config --get core.hooksPath) -> {HOOKS_REL}")
    print("active hook: pre-commit - lints staged docs/*.md in local mode "
          "(bypass a commit with --no-verify)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
