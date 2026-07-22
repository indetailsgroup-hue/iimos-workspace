#!/usr/bin/env python3
"""lint_claims — a negative claim about a named artifact must carry its search.

Why this exists
---------------
Seven of the twelve errors recorded on 2026-07-21 shared one signature: a search
was run one way, it found nothing, and the empty result was published as absence.
`verify_absence.py` can prove a search was thorough, and `claim_detect.py` can
recognise the sentence shape that needs one. Both were opt-in, and the rule that
was supposed to make an agent reach for them was written down by the agent that
then broke it four more times. This file is the part that does not ask.

`claim_detect` decides what a *claim* is. This decides what counts as *evidence*
for one: an evidence block, in the grammar of `docs/_templates/evidence-block.md`,
whose recorded term is the artifact the sentence names.

    python tools/lint_claims.py                  # docs/, the default
    python tools/lint_claims.py docs/adr         # a subtree
    python tools/lint_claims.py docs/one-file.md # one file

    0  every negative claim carries matching evidence
    1  at least one does not
    2  a named path does not exist

Three questions the plan left open, and the answers this file implements
-----------------------------------------------------------------------
1. **A sentence naming several artifacts needs evidence for every one.** A `Hit`
   carries `term` and `terms`; accepting the first would make "publish the
   unevidenced claim next to an evidenced one" the cheapest way through the
   linter. The costs are not symmetric: a false pass publishes exactly the error
   this project is trying to stop, while a false fail costs one more paste. So
   this fails closed, and reports the first term still lacking evidence.

2. **Evidence counts anywhere in the same document.** The template tells an
   author to put the block directly after the claiming paragraph, but that is
   guidance to a writer, not a parse rule — and a linter that measures distance
   turns every reorganisation of a document into a failure, which is how linters
   end up disabled. Term match is the discriminator. The residual risk (a block
   further away, or stale) is not new: the owner's Decision 2 already assigns
   staleness to `--deep`, which re-runs the search in CI rather than trusting
   proximity. Document scope is the boundary because evidence should travel with
   the claim it licenses.

3. **A comment inside a fenced block is an illustration, never evidence.**
   `claim_detect` masks fenced regions because their contents are displayed
   rather than asserted; reading a fenced comment as proof would invert that rule
   inside the same feature — a fenced negation would not be a claim, but a fenced
   comment would license one. It is also concretely exploitable:
   `docs/_templates/evidence-block.md` prints the grammar with the placeholder
   term `TERM`, so any document quoting the format would otherwise hand out free
   evidence for whatever term the example used.

What this does not check
------------------------
Freshness. A block is matched on its recorded term, not on whether the search it
records is still true — if the artifact is implemented tomorrow, a correct block
describes a claim that has become false with no edit to any document. That is
Decision 2's `--deep` mode, and it is Task 6's, not this file's. Nor is there an
allowlist here: the existing corpus fails this linter loudly and on purpose, and
grandfathering is a separate, deliberate, shrinking decision.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# Importing this module puts the repository root on sys.path; running the file
# puts tools/ there instead, and the sibling import below then fails. The plan's
# interface is `python tools/lint_claims.py`, and all three enforcement layers
# call it that way, so the script form is the one that has to work.
if __package__ in (None, ""):  # pragma: no cover - exercised by subprocess tests
    sys.path.insert(0, str(REPO_ROOT))

from tools.claim_detect import find_negative_claims  # noqa: E402

# Verbatim from docs/_templates/evidence-block.md, which publishes this exact
# expression as the parser. Retyping it from memory is how the document and the
# tool drift apart, so it is copied rather than re-derived.
EVIDENCE_COMMENT = re.compile(
    r"<!--\s*verify_absence:\s*(?P<term>\S.*?)\s+@\s+(?P<date>\d{4}-\d{2}-\d{2})\s*-->"
)

# `determined-williams` and `worktrees` hold uncommitted third-party work and are
# named in the plan. The rest is ordinary build noise. This lives in the tool and
# not in the caller: a rule enforced by every caller remembering it is enforced
# until the first one forgets.
EXCLUDED_DIRS = frozenset(
    {
        "determined-williams",
        "worktrees",
        ".git",
        ".venv",
        "venv",
        "node_modules",
        "__pycache__",
        ".pytest_cache",
        ".next",
        ".cache",
        "dist",
        "build",
        "coverage",
    }
)

_FENCE = ("```", "~~~")


@dataclass(frozen=True)
class Finding:
    """One claim whose named artifact has no matching evidence block."""

    path: str
    line: int
    term: str
    sentence: str

    def __str__(self) -> str:
        return f"{self.path}:{self.line}: unevidenced absence claim about '{self.term}'"


def evidence_terms(text: str) -> set[str]:
    """Terms recorded by evidence blocks that are asserted rather than displayed."""
    return {m.group("term") for m in EVIDENCE_COMMENT.finditer(_mask_fenced_blocks(text))}


def lint_text(text: str, path: str = "<text>") -> list[Finding]:
    """Negative claims in `text` naming an artifact no evidence block covers."""
    evidenced = evidence_terms(text)
    findings = []
    for hit in find_negative_claims(text):
        missing = [t for t in hit.terms if t not in evidenced]
        if missing:
            findings.append(Finding(path, hit.line, missing[0], hit.sentence))
    return findings


def lint_file(path: Path) -> list[Finding]:
    """Lint one document. Thai and English share the corpus, so encoding is explicit."""
    text = Path(path).read_text(encoding="utf-8", errors="replace")
    return lint_text(text, display_path(path))


def display_path(path: Path) -> str:
    """Repo-relative and posix, so output is stable across CI, hook, and shell."""
    path = Path(path).resolve()
    try:
        return path.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def is_excluded(path: Path) -> bool:
    """Whether any component of `path`, as given, is an excluded directory."""
    return any(part in EXCLUDED_DIRS for part in Path(path).parts)


def iter_markdown_files(paths: list[Path]) -> list[Path]:
    """Markdown under `paths`, never descending into an excluded tree.

    The guard on the *root* is not redundant with the pruning below it. Pruning
    removes excluded children during the walk, but when the argument itself is
    an excluded tree the walk starts inside it and no pruning ever sees the
    name. That exact call — `lint_claims.py worktrees` — walked 54,577
    third-party files before this guard existed.

    A named markdown file outside the excluded trees is always linted: naming a
    file is an unambiguous instruction, and silently doing nothing would be a
    worse answer than either linting it or refusing to.
    """
    out: list[Path] = []
    for path in paths:
        if is_excluded(path):
            continue  # main() has already refused these loudly; library callers get the same safety
        if path.is_file():
            if path.suffix.lower() == ".md":
                out.append(path)
            continue
        for dirpath, dirnames, filenames in os.walk(path):
            dirnames[:] = sorted(d for d in dirnames if d not in EXCLUDED_DIRS)
            out.extend(
                Path(dirpath) / fn for fn in sorted(filenames) if fn.lower().endswith(".md")
            )
    return out


def default_paths() -> list[Path]:
    """`docs/`, resolved against the repository rather than the caller's cwd."""
    return [REPO_ROOT / "docs"]


def _mask_fenced_blocks(text: str) -> str:
    """Blank ``` / ~~~ regions, preserving newlines so line numbers stay true."""
    out = []
    inside = False
    for line in text.splitlines(keepends=True):
        if line.lstrip().startswith(_FENCE):
            inside = not inside
            out.append(_blank(line))
        else:
            out.append(_blank(line) if inside else line)
    return "".join(out)


def _blank(text: str) -> str:
    return "".join(c if c == "\n" else " " for c in text)


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(
        description="Fail when a negative claim about a named artifact has no verify_absence block."
    )
    ap.add_argument("paths", nargs="*", type=Path, help="files or directories; defaults to docs/")
    args = ap.parse_args(argv)

    # The corpus is bilingual; a Windows console defaults to a code page that
    # cannot encode Thai, and a linter that crashes while reporting is a linter
    # that gets removed.
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

    paths = args.paths or default_paths()
    missing = [p for p in paths if not p.exists()]
    if missing:
        for p in missing:
            print(f"no such path: {p}", file=sys.stderr)
        return 2

    # An explicitly named excluded path is refused, not skipped. Skipping would
    # print a clean summary and exit 0 — a green light for a tree this tool is
    # forbidden to inspect, which is a stronger false claim than any it lints.
    refused = [p for p in paths if is_excluded(p)]
    if refused:
        for p in refused:
            print(f"refusing excluded path: {p} (third-party tree; see EXCLUDED_DIRS)",
                  file=sys.stderr)
        return 2

    findings = [f for path in iter_markdown_files(paths) for f in lint_file(path)]
    for finding in findings:
        print(finding)

    if findings:
        files = len({f.path for f in findings})
        print(f"\n{len(findings)} unevidenced absence claim(s) in {files} file(s)")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
