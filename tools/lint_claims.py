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
    python tools/lint_claims.py --deep           # also re-verify every recorded absence
    python tools/lint_claims.py docs/ --write-allowlist  # (re)capture the ledger

    0  every negative claim carries matching evidence (within the allowlist), and
       under --deep every recorded absence is still true
    1  an unevidenced/over-count claim, or a dead claim under --deep
    2  a named path does not exist, or is an excluded tree

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

Freshness — the `--deep` mode
-----------------------------
Local mode matches a block on its recorded term, not on whether the search it
records is still true: if the artifact is implemented tomorrow, a correct block
describes a claim that has become false with no edit to any document. `--deep`
(Decision 2) closes that by re-running `verify_absence` for every recorded
absence term over the code corpus and failing when the term is now present. It
searches both roots **minus `docs/`** (see `DEEP_EXCLUDE`). The allowlist never
absorbs a deep failure — a dead claim is a correctness error, not debt.

Grandfathering — the allowlist
------------------------------
The existing corpus fails local mode loudly and on purpose (110 findings at
adoption). `tools/.lint_allowlist` records each already-dirty file's count so the
gate does not go red on day one; a file fails the moment its count rises, and an
unlisted file must be clean. The mechanism is shared with `lint_certifications`
and lives in `tools/lint_allowlist.py`. `--write-allowlist` (re)captures it, and
every run ends with the grandfathered debt so the number stays visible.
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

from tools import verify_absence  # noqa: E402
from tools.claim_detect import find_negative_claims  # noqa: E402
from tools.lint_allowlist import (  # noqa: E402
    DEFAULT_ALLOWLIST_PATH,
    LINT_CLAIMS,
    Allowlist,
    debt_line,
)

# What `--deep` refuses to search. `docs/` is excluded because the subject of an
# absence claim is the code and the product repository, not the prose asserting
# things about them — and the prose *contains* the very term it claims is absent,
# both in the claim sentence and in the pasted evidence block, so searching it
# would mark every documented claim dead the moment it is written (orchestrator
# finding O-3, `--deep` is self-refuting). Accepted, recorded limitation: a claim
# about a *documentation* artifact ("no runbook exists") is invisible to `--deep`.
#
# Adoption surfaced that `docs/` is not the only prose location: the SDD ledger
# `.superpowers/sdd/progress.md` quoted the template's example term while
# documenting O-3 itself, so `--deep` reported the template's one honest claim
# as "dead" — the same self-refutation in a tree the original ruling did not
# enumerate. The implementer refused to widen this set silently and escalated;
# the recorded ruling is two-part:
#
#   1. `.superpowers` joins the exclusion — a session ledger is prose *about*
#      the work, the same class as `docs/`, and can never be where an artifact
#      lives.
#   2. `tests` stays IN the search, deliberately. A term appearing in tests
#      usually means the artifact exists — tests import real code — and blinding
#      deep mode to that would weaken a genuine presence check. The cost is that
#      a term quoted in a test fixture can still kill a claim; the template's
#      example term was therefore renamed to a synthetic one that exists nowhere
#      outside the template, fixing the collision at its source instead of by
#      ever-wider exclusion. The term is deliberately not written in this
#      comment: the first draft named it here, and deep mode promptly found it
#      on this very line and declared the template's claim dead — the third
#      demonstration in one day that mentioning a term is indistinguishable
#      from its existence to a text search.
#   3. `worktrees` is excluded because it holds review checkouts of unmerged
#      third-party branches — copies under inspection, not authority. A term
#      present only there is not "implemented"; letting it kill a live claim
#      was demonstrated with a schema name that exists solely in a worktree
#      artifact. (A review workflow refuted this finding; the orchestrator's
#      spot-check reproduced it. Refuters are fallible in both directions.)
#      `determined-williams` is in this set for a different reason entirely:
#      it is already deep mode's own second ROOT, so pruning it from the
#      governance-root walk merely stops the same tree being searched twice.
DEEP_EXCLUDE = frozenset({"docs", ".superpowers", "worktrees", "determined-williams"})

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


@dataclass(frozen=True)
class DeepFinding:
    """A recorded absence that `--deep` re-verified and found to be dead.

    Not routed through the allowlist: the allowlist grandfathers *unevidenced*
    claims (Decision 1), whereas a dead claim is an evidenced claim gone false
    (Decision 2). Debt is tolerated; a false statement is not.
    """

    path: str
    line: int
    term: str
    location: str

    def __str__(self) -> str:
        return (f"{self.path}:{self.line}: evidence for '{self.term}' is stale "
                f"— term now present at {self.location}")


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


def deep_roots(roots=None) -> list[Path]:
    """The corpus `--deep` searches: the repo and `determined-williams`, minus
    what does not exist. `verify_absence`'s own defaults; overridable for tests so
    a deep test never depends on the real product tree's contents."""
    if roots is None:
        roots = [REPO_ROOT, REPO_ROOT / "determined-williams"]
    return [Path(r) for r in roots if Path(r).exists()]


def deep_locate(term: str, roots: list[Path], exclude: frozenset[str] = DEEP_EXCLUDE) -> str | None:
    """Re-run `verify_absence`'s four searches for `term`; return where it is now
    present, or None. Imported rather than subprocessed: one process, structured
    results instead of parsed stdout, and terms de-duplicated by the caller — a
    subprocess per term over `determined-williams` would be the slow path
    Decision 2 already flags. `docs/` is pruned so the claim's own prose cannot
    resurrect it (O-3)."""
    forms = verify_absence.variants(term)
    pats = [re.compile(re.escape(f), re.IGNORECASE) for f in forms]
    pathspecs = [f":(exclude){name}" for name in sorted(exclude)]
    for root in roots:
        root = Path(root)
        if not root.exists():
            continue
        names = verify_absence.search_names(root, pats, exclude)
        if names:
            return f"{_rel(names[0], root)} (filename)"
        hits, _ = verify_absence.search_content(root, pats, None, 1, exclude)
        if hits:
            path, line, _ = hits[0]
            return f"{_rel(path, root)}:{line}"
        res = verify_absence.git(root, "grep", "-rniI", "-e", term, "--", ".", *pathspecs)
        if res is not None and res[0] == "ok":
            first = next((ln for ln in res[1].splitlines() if ln.strip()), "")
            if first:
                return f"git-tracked: {first[:120]}"
        res = verify_absence.git(root, "log", "--oneline", "-S", term, "--", ".", *pathspecs)
        if res is not None and res[0] == "ok" and res[1].strip():
            return f"git-history: {res[1].splitlines()[0][:120]}"
    return None


def _rel(path: Path, root: Path) -> str:
    try:
        return Path(path).relative_to(root).as_posix()
    except ValueError:
        return Path(path).as_posix()


def deep_scan(files, roots=None) -> tuple[list[DeepFinding], dict]:
    """Re-verify every evidence comment's term across the deep corpus.

    Returns `(findings, meta)`; `meta` carries the roots, exclusions and term
    count so the CLI can print what it searched — deep output has to be usable as
    evidence in its own right. Terms are de-duplicated so a term repeated across
    documents costs one search, not one per occurrence."""
    corpus = deep_roots(roots)
    findings: list[DeepFinding] = []
    cache: dict[str, str | None] = {}
    terms = 0
    for f in files:
        text = Path(f).read_text(encoding="utf-8", errors="replace")
        masked = _mask_fenced_blocks(text)
        dp = display_path(f)
        for m in EVIDENCE_COMMENT.finditer(masked):
            term = m.group("term")
            terms += 1
            line = text.count("\n", 0, m.start()) + 1
            if term not in cache:
                cache[term] = deep_locate(term, corpus)
            location = cache[term]
            if location is not None:
                findings.append(DeepFinding(dp, line, term, location))
    meta = {
        "roots": [str(r) for r in corpus],
        "exclusions": sorted(DEEP_EXCLUDE),
        "terms": terms,
    }
    return findings, meta


def lint(paths, *, allowlist: dict[str, int] | None = None, deep: bool = False, roots=None):
    """Library entry point: findings that *survive* the allowlist, plus any dead
    claims when `deep`. `[]` means the run passes.

    `allowlist` is a flat `{repo-relative-posix-path: count}` mapping (the
    `lint_claims` view of `.lint_allowlist`); a file is suppressed at or below its
    count. Deep findings are never suppressed."""
    files = iter_markdown_files([Path(p) for p in paths])
    prior = allowlist or {}
    surviving: list = []
    for f in files:
        dp = display_path(f)
        found = lint_file(f)
        if len(found) > prior.get(dp, 0):
            surviving.extend(found)
    if deep:
        deep_findings, _ = deep_scan(files, roots=roots)
        surviving.extend(deep_findings)
    return surviving


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
    ap.add_argument("--deep", action="store_true",
                    help="re-run verify_absence for every recorded absence term; fail if it is "
                         "now present (Decision 2). Searches the code corpus, minus docs/.")
    ap.add_argument("--write-allowlist", dest="write_allowlist", action="store_true",
                    help="(re)capture the shrinking allowlist from this run's counts and exit.")
    ap.add_argument("--accept-regression", dest="accept_regression", action="store_true",
                    help="with --write-allowlist, permit raising a count or grandfathering a new "
                         "dirty file. Off by default: the ledger may only shrink.")
    ap.add_argument("--allowlist", type=Path, default=DEFAULT_ALLOWLIST_PATH,
                    help="path to the ledger (default: tools/.lint_allowlist).")
    ap.add_argument("--root", dest="roots", action="append", type=Path, default=None,
                    help="deep-mode search root override (repeatable); defaults to the repo and "
                         "determined-williams.")
    args = ap.parse_args(argv)

    # The corpus is bilingual; a Windows console defaults to a code page that
    # cannot encode Thai, and a linter that crashes while reporting is a linter
    # that gets removed.
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

    paths = args.paths or default_paths()
    # An explicitly named excluded path is refused, not skipped. Skipping would
    # print a clean summary and exit 0 — a green light for a tree this tool is
    # forbidden to inspect, which is a stronger false claim than any it lints.
    refused = [p for p in paths if is_excluded(p)]
    if refused:
        for p in refused:
            print(f"refusing excluded path: {p} (third-party tree; see EXCLUDED_DIRS)",
                  file=sys.stderr)
        return 2

    missing = [p for p in paths if not p.exists()]
    if missing:
        for p in missing:
            print(f"no such path: {p}", file=sys.stderr)
        return 2

    files = iter_markdown_files(paths)
    findings_by_file = {display_path(f): lint_file(f) for f in files}
    counts = {dp: len(fs) for dp, fs in findings_by_file.items()}

    if args.write_allowlist:
        return _write_allowlist(counts, args.allowlist, args.accept_regression)

    allowlist = Allowlist.load(args.allowlist)
    ev = allowlist.evaluate(LINT_CLAIMS, counts)

    # Print the raw findings for every file over its grandfathered count (recorded
    # 0 for an unlisted file). Findings at or below the count are suppressed —
    # that is what grandfathering buys — but stay counted in the debt line.
    printed = 0
    for path in sorted(r.path for r in ev.regressions):
        for finding in findings_by_file.get(path, []):
            print(finding)
            printed += 1

    deep_findings: list[DeepFinding] = []
    if args.deep:
        deep_findings, meta = deep_scan(files, roots=args.roots)
        print("\n# deep re-verification (Decision 2 + O-3)")
        print(f"roots ({len(meta['roots'])}): " + "; ".join(meta["roots"]))
        print(f"excluded: {', '.join(meta['exclusions'])}/ + standard build/vcs trees")
        print(f"absence terms re-verified: {meta['terms']}")
        for finding in deep_findings:
            print(finding)

    if ev.regressions:
        print(f"\n{printed} unevidenced absence claim(s) beyond the allowlist in "
              f"{len(ev.regressions)} file(s)")
    if deep_findings:
        print(f"{len(deep_findings)} dead absence claim(s): recorded evidence is now stale")
    for tightening in ev.tightenings:
        print(f"tighten: {tightening}")

    print(debt_line(LINT_CLAIMS, allowlist))
    return 1 if (ev.regressions or deep_findings) else 0


def _write_allowlist(counts: dict[str, int], path: Path, accept_regression: bool) -> int:
    """Recapture the lint_claims entries, refusing to loosen unless permitted."""
    allowlist = Allowlist.load(path)
    updated, refusals = allowlist.rewrite(LINT_CLAIMS, counts, accept_regression)
    updated.write(path)
    listed = updated.entries.get(LINT_CLAIMS, {})
    print(f"wrote {len(listed)} lint_claims record(s) to {display_path(path)}")
    for refusal in refusals:
        print(f"refused: {refusal}")
    print(debt_line(LINT_CLAIMS, updated))
    # A refusal means the capture did NOT record everything the caller scanned.
    # Exiting 0 here read as "maintenance succeeded" while the very next lint
    # run stayed red — the cross-vendor review named it the cheapest superficial
    # green in the design. The tightened ledger is still written; the exit code
    # now tells the truth about the refusals.
    return 1 if refusals else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
