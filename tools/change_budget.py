#!/usr/bin/env python3
"""change_budget — prove which files you actually touched, before you say so.

Why this exists
---------------
On 21 July 2026 an agent edited 12 files in a worktree, reported "touched only
the intended files, nothing else disturbed", and was wrong. The dirty count had
gone 35 -> 52 when 12 edits should have produced 47. Five changes came from the
agent's own background work: a `.superpowers/` directory carrying a session
token, and four `.pyc` files recompiled by a test run.

Nobody noticed for twenty minutes, and only then because the totals were added
up by hand on a hunch.

The claim "I only touched X" is checkable arithmetic. This makes the check cost
nothing, so there is no excuse for asserting it unchecked.

Usage
-----
Snapshot before you start:

    python tools/change_budget.py snapshot --root determined-williams

Then, after editing, declare what you believe you touched:

    python tools/change_budget.py check --root determined-williams \\
        --expect "docs/plans/*.md" --expect "docs/plans/*.html"

Exit codes
----------
    0  every change is inside the declared budget
    1  changes exist outside the budget  -> do NOT claim "nothing else was touched"
    2  usage error, or no snapshot to compare against
"""

from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path

STATE_DIR = Path(__file__).resolve().parent / ".change_budget"


def _digest(p: Path) -> str:
    """Content digest, so an edit to an ALREADY-dirty file is still detected.

    `git status --porcelain` reports one entry per dirty path. Appending to a file
    that is already listed produces no new entry, so an entry-only comparison is
    blind to it. That blind spot was found on the first real test of this tool and
    would have made it silently useless for the most common case: continuing to
    edit files that were already modified.

    Directories get a cheap signature instead of a content hash. An untracked
    directory entry can cover gigabytes; hashing them recursively made the first
    version exceed a ten-minute timeout on this workspace. Entry names plus sizes
    and mtimes catch every change that matters here without reading the bytes.
    """
    try:
        if p.is_dir():
            h = hashlib.sha256()
            for f in sorted(p.rglob("*"))[:5000]:
                try:
                    st = f.stat()
                    h.update(f"{f}|{st.st_size}|{int(st.st_mtime)}".encode("utf-8", "replace"))
                except OSError:
                    continue
            return "dir:" + h.hexdigest()[:13]
        if p.stat().st_size > 40 * 1024 * 1024:
            st = p.stat()
            return f"big:{st.st_size}:{int(st.st_mtime)}"
        return hashlib.sha256(p.read_bytes()).hexdigest()[:16]
    except (OSError, ValueError):
        return "unreadable"


def status(root: Path) -> list[tuple[str, str, str]]:
    r = subprocess.run(["git", "-C", str(root), "status", "--porcelain"],
                       capture_output=True, timeout=300)
    if r.returncode != 0:
        print(f"not a git repository: {root}", file=sys.stderr)
        raise SystemExit(2)
    out = []
    for line in r.stdout.decode("utf-8", "replace").splitlines():
        if not line.strip():
            continue
        st = line[:2].strip() or "?"
        path = line[3:].strip().strip('"')
        out.append((st, path, _digest(root / path)))
    return out


def key(root: Path) -> Path:
    safe = str(root.resolve()).replace(":", "").replace("\\", "_").replace("/", "_")
    return STATE_DIR / f"{safe}.json"


def cmd_snapshot(root: Path) -> int:
    entries = status(root)
    STATE_DIR.mkdir(exist_ok=True)
    key(root).write_text(json.dumps({
        "root": str(root.resolve()),
        "taken_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "entries": [list(e) for e in entries],
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"snapshot: {len(entries)} dirty entries at {root}")
    print(f"stored:   {key(root)}")
    return 0


def cmd_check(root: Path, expect: list[str], show: int) -> int:
    kp = key(root)
    if not kp.exists():
        print(f"no snapshot for {root}. Run `snapshot` before editing.", file=sys.stderr)
        return 2
    before_raw = json.loads(kp.read_text(encoding="utf-8"))
    before = {tuple(e) for e in before_raw["entries"]}
    now = set(status(root))

    before_by_path = {p: (s, d) for s, p, d in before}
    now_by_path = {p: (s, d) for s, p, d in now}

    # A path present in both snapshots with a different digest was edited further.
    # Reporting it as one "vanished" plus one "appeared" entry is technically true
    # and completely unreadable, so it is separated out.
    modified = sorted(
        (now_by_path[p][0], p, now_by_path[p][1])
        for p in before_by_path.keys() & now_by_path.keys()
        if before_by_path[p][1] != now_by_path[p][1]
    )
    modified_paths = {p for _, p, _ in modified}

    appeared = sorted((e for e in now - before if e[1] not in modified_paths),
                      key=lambda e: e[1])
    vanished = sorted((e for e in before - now if e[1] not in modified_paths),
                      key=lambda e: e[1])

    def budgeted(path: str) -> bool:
        return any(fnmatch.fnmatch(path, pat) or path.startswith(pat.rstrip("*"))
                   for pat in expect)

    changes = appeared + modified
    inside = [e for e in changes if budgeted(e[1])]
    outside = [e for e in changes if not budgeted(e[1])]

    print(f"# change_budget — {root}")
    print(f"\nsnapshot taken : {before_raw['taken_at']}  ({len(before)} dirty)")
    print(f"now            : {len(now)} dirty")
    print(f"declared budget: {len(expect)} pattern(s)")
    for p in expect:
        print(f"  - {p}")

    print(f"\n## inside the budget: {len(inside)}")
    for st, p, _ in inside[:show]:
        print(f"  {st:<2} {p}")
    if len(inside) > show:
        print(f"  … and {len(inside) - show} more")

    print(f"\n## OUTSIDE the budget: {len(outside)}")
    for st, p, _ in outside[:show]:
        note = "   (already dirty before — CONTENT CHANGED since snapshot)" if p in modified_paths else ""
        print(f"  {st:<2} {p}{note}")
    if len(outside) > show:
        print(f"  … and {len(outside) - show} more")

    if vanished:
        print(f"\n## no longer dirty: {len(vanished)}")
        for st, p, _ in vanished[:show]:
            print(f"  {st:<2} {p}")

    print("\n" + "=" * 72)
    print(f"arithmetic: {len(before)} dirty before  ·  {len(appeared)} new  "
          f"·  {len(modified)} edited-again  ·  {len(vanished)} resolved  ->  {len(now)} dirty now")
    print(f"budget     : {len(inside)} inside  ·  {len(outside)} OUTSIDE")

    if outside:
        print("\nRESULT: CHANGES OUTSIDE THE DECLARED BUDGET.")
        print("You may not write \"only the intended files were touched\".")
        print("Explain every line above, or add it to the budget and say why.")
        print("\nCommon causes seen in this project:")
        print("  - a tool wrote state into the tree (.superpowers/ carries a session token)")
        print("  - a test run recompiled bytecode (__pycache__/*.pyc)")
        print("  - a background agent edited files while you were working")
        return 1

    print("\nRESULT: clean. Every change is inside the declared budget.")
    print("This sentence is now supported: \"only the declared files were touched\".")
    return 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="Verify that only the files you declared actually changed.")
    sub = ap.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("snapshot", help="record dirty state before editing")
    s.add_argument("--root", default=".")

    c = sub.add_parser("check", help="compare current dirty state against the snapshot")
    c.add_argument("--root", default=".")
    c.add_argument("--expect", action="append", default=[],
                   help="repeatable glob or path prefix you intended to change")
    c.add_argument("--show", type=int, default=20)

    a = ap.parse_args(argv)
    root = Path(a.root)
    if not root.exists():
        print(f"no such root: {root}", file=sys.stderr)
        return 2

    if a.cmd == "snapshot":
        return cmd_snapshot(root)
    if not a.expect:
        print("check requires at least one --expect pattern", file=sys.stderr)
        return 2
    return cmd_check(root, a.expect, a.show)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
