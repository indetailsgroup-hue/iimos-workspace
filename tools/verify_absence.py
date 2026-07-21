#!/usr/bin/env python3
"""verify_absence — make "it doesn't exist" an evidenced claim instead of a guess.

Why this exists
---------------
On 21 July 2026, seven of twelve recorded errors in one working session shared a
single signature: a search was run one way, it found nothing, and the result was
reported as absence. Every one of those was wrong.

    "5 skills are behind upstream"      wrong sha comparison
    "431 test files"                    counted node_modules
    "DXF has no production prohibition" the comment is in Thai; the grep was English
    "ADR-065 does not exist"            searched filenames; it lives inside a register
    "HOMAG publishes no API"            read marketing pages, not technical docs

The rule against this was already written down. Writing it down did not work —
it was violated four more times after being authored. Only mechanisms worked.

This is the mechanism. It searches every way the failures above were missed, and
it prints what it covered so the output can be pasted as the citation.

    python tools/verify_absence.py ADR-065
    python tools/verify_absence.py computePanelCutSize --ext .ts,.tsx
    python tools/verify_absence.py "tenant_id" --root determined-williams

Exit codes
----------
    0  found somewhere  -> an absence claim is REFUTED
    1  not located      -> absence is *supported*, and still may not be stated as
                          "does not exist" (see the wording block it prints)
    2  usage error
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    "dist", "build", ".next", ".cache", "coverage", ".pytest_cache",
}

# Files that record the commands you ran. Searching them means matching your own
# invocation of this tool and calling it evidence. Found on the first true-negative
# test: a deliberately nonexistent symbol "matched" because the permission
# allowlist had just logged the command containing it.
SKIP_FILES = {
    "settings.local.json",
    "shell-snapshots",
    ".bash_history",
}

TEXT_EXT = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".sql", ".md", ".mdx",
    ".json", ".yaml", ".yml", ".toml", ".html", ".css", ".sh", ".ps1", ".txt",
    ".dxf", ".mpr", ".cix", ".env.example", ".gitignore", ".gitattributes",
}


def variants(term: str) -> list[str]:
    """Forms the same identifier is written in across this codebase."""
    out = {term, term.lower(), term.upper()}
    # ADR-065 <-> adr_065 <-> adr 065 <-> ADR065
    for sep in ("-", "_", " "):
        for other in ("-", "_", " ", ""):
            if sep in term:
                out.add(term.replace(sep, other))
    # camelCase <-> snake_case
    snake = re.sub(r"(?<!^)(?=[A-Z])", "_", term).lower()
    out.add(snake)
    out.add(snake.replace("_", "-"))
    return sorted(o for o in out if o)


def walk(root: Path, exts: set[str] | None):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            if fn in SKIP_FILES:
                continue
            p = Path(dirpath) / fn
            if exts is not None:
                if p.suffix.lower() not in exts:
                    continue
            elif p.suffix.lower() not in TEXT_EXT:
                continue
            yield p


def search_content(root: Path, pats: list[re.Pattern], exts, limit: int):
    hits = []
    for p in walk(root, exts):
        try:
            text = p.read_text(encoding="utf-8", errors="replace")
        except (OSError, ValueError):
            continue
        for i, line in enumerate(text.splitlines(), 1):
            if any(pat.search(line) for pat in pats):
                hits.append((p, i, line.strip()[:160]))
                if len(hits) >= limit:
                    return hits, True
    return hits, False


def search_names(root: Path, pats: list[re.Pattern]):
    out = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in list(dirnames) + filenames:
            if any(pat.search(name) for pat in pats):
                out.append(Path(dirpath) / name)
    return out


def git(root: Path, *args: str) -> tuple[str, str] | None:
    """Return (status, stdout).

    status is one of: "ok" (command ran), "no-match" (ran, found nothing),
    "unavailable" (not a repo, or git missing).

    `git grep` exits 1 when there are simply no matches. Treating that as a
    failure would report "not a git repository" for a perfectly good repo —
    the exact conflation of "my search failed" with "the thing is not there"
    that this tool exists to prevent. It was present in the first version of
    this file and caught on the first regression run.
    """
    try:
        r = subprocess.run(["git", "-C", str(root), *args],
                           capture_output=True, timeout=90)
    except (OSError, subprocess.SubprocessError):
        return None
    out = r.stdout.decode("utf-8", "replace")
    if r.returncode == 0:
        return ("ok", out)
    if r.returncode == 1 and not r.stderr.strip():
        return ("no-match", "")
    return None


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(
        description="Search every way a false 'does not exist' has been produced in this project.")
    ap.add_argument("term")
    ap.add_argument("--root", action="append", default=None,
                    help="repeatable; defaults to the two known roots")
    ap.add_argument("--ext", default=None,
                    help="comma-separated extensions to restrict content search, e.g. .ts,.tsx")
    ap.add_argument("--limit", type=int, default=40)
    a = ap.parse_args(argv)

    here = Path(__file__).resolve().parent.parent
    roots = [Path(r) for r in a.root] if a.root else [here, here / "determined-williams"]
    roots = [r for r in roots if r.exists()]
    if not roots:
        print("no existing root to search", file=sys.stderr)
        return 2

    exts = None
    if a.ext:
        exts = {e if e.startswith(".") else "." + e for e in a.ext.lower().split(",")}

    forms = variants(a.term)
    pats = [re.compile(re.escape(f), re.IGNORECASE) for f in forms]

    print(f"# verify_absence — {a.term}")
    print(f"\nvariants searched ({len(forms)}): {', '.join(forms)}")
    print(f"roots: {len(roots)}")
    for r in roots:
        print(f"  - {r}")
    print(f"content extensions: {'all text types' if exts is None else ', '.join(sorted(exts))}")
    print(f"excluded directories: {', '.join(sorted(SKIP_DIRS))}")
    print("encoding: utf-8 (Thai comments and identifiers are in scope)")

    found = False

    for r in roots:
        print(f"\n## {r}")

        names = search_names(r, pats)
        print(f"\n### filename / directory-name matches: {len(names)}")
        for p in names[:15]:
            print(f"  {p.relative_to(r)}")
        if len(names) > 15:
            print(f"  … and {len(names) - 15} more")
        found = found or bool(names)

        hits, truncated = search_content(r, pats, exts, a.limit)
        print(f"\n### content matches: {len(hits)}{'+ (truncated)' if truncated else ''}")
        for p, ln, txt in hits[:20]:
            print(f"  {p.relative_to(r)}:{ln}: {txt}")
        if len(hits) > 20:
            print(f"  … and {len(hits) - 20} more")
        found = found or bool(hits)

        res = git(r, "grep", "-rniI", "-e", a.term)
        if res is None:
            print("\n### git grep (tracked files): NOT SEARCHED — not a git repository, or git unavailable")
        elif res[0] == "no-match":
            print("\n### git grep (tracked files only): 0 — searched, nothing tracked matches")
        else:
            lines = [l for l in res[1].splitlines() if l.strip()]
            print(f"\n### git grep (tracked files only): {len(lines)}")
            for l in lines[:10]:
                print(f"  {l[:170]}")
            if len(lines) > 10:
                print(f"  … and {len(lines) - 10} more")
            found = found or bool(lines)

        res = git(r, "log", "--oneline", "-S", a.term, "--", ".")
        if res is None:
            print("### git history: NOT SEARCHED — not a git repository, or git unavailable")
        elif res[0] == "no-match":
            print("### git history: 0 — searched, no commit adds or removes the term")
        else:
            lines = [l for l in res[1].splitlines() if l.strip()]
            print(f"### git history (commits adding/removing the term): {len(lines)}")
            for l in lines[:8]:
                print(f"  {l}")
            found = found or bool(lines)

    print("\n" + "=" * 72)
    if found:
        print("RESULT: FOUND — an absence claim about this term is REFUTED.")
        print("Cite the location above. Do not write that it does not exist.")
        return 0

    print("RESULT: NOT LOCATED by any method above.")
    print()
    print("This still does NOT license the words \"does not exist\".")
    print("The only wording this output supports is:")
    print()
    print(f"    \"{a.term} was not located in {len(roots)} root(s) by filename,")
    print("     content, git-tracked, and git-history search on <date>.\"")
    print()
    print("Absence remains UNKNOWN until a search of the places this tool cannot")
    print("reach also comes back empty: binary assets, licensed or paywalled vendor")
    print("documentation, external services, other branches, and anything stored")
    print("under a name that shares no substring with the term.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
