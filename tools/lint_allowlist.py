#!/usr/bin/env python3
"""lint_allowlist — one shrinking-only grandfather ledger for both claim linters.

Why this exists
---------------
Adoption day is the moment a guardrail dies or lives. `lint_claims docs/` finds
110 unevidenced claims and `lint_certifications docs/` finds 5; a gate that is
red against the existing corpus on the day it is switched on is a gate somebody
deletes by lunchtime. Owner Decision 1 chose a *shrinking allowlist* over fixing
all of them (many are legitimate attributed or refuted claims) and over
date-based grandfathering (which hides the debt): each already-dirty file is
recorded with the count it had at adoption, passes at or below that count, and
**fails the instant the count rises**. An unlisted file must be clean.

The orchestrator extended Decision 1 to *both* linters, because Task 7's CI runs
both as gates. So the mechanism lives here, once, and each linter calls it —
"a rule enforced by every caller remembering it is enforced until the first one
forgets", the same reasoning the linters use for their excluded-dir lists.

The accepted downside, recorded rather than hidden: an allowlist prevents
regression but does not force progress. If nobody reduces the numbers they stay
forever, so the total is printed on **every** run — a number nobody sees is a
number nobody reduces (Decision 1's own words).

Format of `tools/.lint_allowlist`
----------------------------------
One record per line, three TAB-separated fields, LF-terminated, UTF-8:

    linter<TAB>path<TAB>accepted_hit_count

`linter` is `lint_claims` or `lint_certifications` — the same file grandfathers
both, namespaced by this field. `path` is repository-relative posix, so a record
reads the same on Windows, in CI, and in a shell. `#` comment lines and blank
lines are ignored. Regenerate with `--write-allowlist` (see the linters).

Shrinking-only, enforced two ways
---------------------------------
* Reading (`evaluate`): current > recorded is a regression (recorded defaults to
  0 for an unlisted file, so a newly dirty file is a regression too). current <
  recorded still passes but is reported as *tightenable*.
* Writing (`rewrite`): a count may be lowered or dropped freely, but **raising an
  existing entry or adding a new dirty file is refused** unless `accept_regression`
  is passed, and every refusal is returned so the caller can print it. The one
  exception is the very first capture for a linter (no prior entries): that is
  adoption, and it records whatever is there.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ALLOWLIST_PATH = REPO_ROOT / "tools" / ".lint_allowlist"

# The linter names used as the first field; kept here so both linters and the
# tests agree on the exact strings.
LINT_CLAIMS = "lint_claims"
LINT_CERTIFICATIONS = "lint_certifications"


class AllowlistError(ValueError):
    """A malformed `.lint_allowlist` line. Fail closed rather than guess."""


def rel_key(path, repo_root: Path = REPO_ROOT) -> str:
    """Repository-relative posix path — the canonical allowlist key.

    Both linters key their per-file counts this way so the keys match the
    on-disk records regardless of the platform or the working directory the hook
    or CI job happens to run from. A path outside the repository (a temp fixture)
    falls back to its absolute posix form, which simply never matches a record.
    """
    p = Path(path).resolve()
    try:
        return p.relative_to(repo_root).as_posix()
    except ValueError:
        return p.as_posix()


@dataclass(frozen=True)
class Regression:
    """A file whose current count exceeds what the allowlist grants."""

    linter: str
    path: str
    recorded: int
    current: int

    def __str__(self) -> str:
        if self.recorded == 0:
            return (f"{self.path}: {self.current} hit(s), not grandfathered "
                    f"(allowlist records 0) — must be clean")
        return (f"{self.path}: {self.current} hit(s), above the grandfathered "
                f"count of {self.recorded}")


@dataclass(frozen=True)
class Tightening:
    """A file now below its recorded count — the allowlist can be tightened."""

    linter: str
    path: str
    recorded: int
    current: int

    def __str__(self) -> str:
        return (f"{self.path}: {self.current} hit(s), below the recorded "
                f"{self.recorded} — allowlist can be tightened")


@dataclass(frozen=True)
class Refusal:
    """A change `--write-allowlist` declined because it would loosen the gate."""

    kind: str  # "raise" (existing entry up) or "add" (new dirty file)
    linter: str
    path: str
    recorded: int
    current: int

    def __str__(self) -> str:
        if self.kind == "add":
            return (f"{self.path}: refused to grandfather a new dirty file "
                    f"({self.current} hit(s)) — fix it, or re-run with "
                    f"--accept-regression")
        return (f"{self.path}: refused to raise {self.recorded} -> {self.current} "
                f"— re-run with --accept-regression to accept the regression")


@dataclass(frozen=True)
class Evaluation:
    """The verdict for one linter's run against the allowlist."""

    regressions: list[Regression] = field(default_factory=list)
    tightenings: list[Tightening] = field(default_factory=list)
    debt_hits: int = 0
    debt_files: int = 0


@dataclass(frozen=True)
class Allowlist:
    """Grandfathered counts, namespaced by linter: {linter: {path: count}}."""

    entries: dict[str, dict[str, int]] = field(default_factory=dict)

    # -- construction ------------------------------------------------------- #
    @classmethod
    def parse(cls, text: str) -> "Allowlist":
        entries: dict[str, dict[str, int]] = {}
        for lineno, raw in enumerate(text.splitlines(), 1):
            line = raw.rstrip("\n")
            stripped = line.strip()
            # `# adopted: <linter>` marks a linter as captured even when every
            # entry has since been fixed and dropped. Without it, an emptied
            # section was indistinguishable from a never-captured linter, so the
            # one-time adoption exemption recurred and a new dirty file could be
            # grandfathered without --accept-regression (found by the
            # cross-vendor reviewer, reproduced before fixing).
            if stripped.startswith("# adopted:"):
                entries.setdefault(stripped.removeprefix("# adopted:").strip(), {})
                continue
            if not stripped or stripped.startswith("#"):
                continue
            parts = line.split("\t")
            if len(parts) != 3:
                raise AllowlistError(
                    f"line {lineno}: expected 'linter<TAB>path<TAB>count', got {raw!r}")
            linter, path, count_s = parts
            try:
                count = int(count_s)
            except ValueError as exc:
                raise AllowlistError(f"line {lineno}: count is not an integer: {count_s!r}") from exc
            if count < 0:
                raise AllowlistError(f"line {lineno}: negative count: {count_s!r}")
            entries.setdefault(linter, {})[path] = count
        return cls(entries)

    @classmethod
    def load(cls, path: Path = DEFAULT_ALLOWLIST_PATH) -> "Allowlist":
        """Load the ledger, or an empty one if the file does not exist yet.

        A missing file is adoption's normal starting state, not an error: the
        linters then treat every finding as a regression, which is exactly the
        pre-allowlist behaviour and keeps them useful before the first capture.
        """
        p = Path(path)
        if not p.exists():
            return cls({})
        return cls.parse(p.read_text(encoding="utf-8"))

    # -- reading ------------------------------------------------------------ #
    def recorded(self, linter: str, path: str) -> int:
        """The grandfathered count for `path` under `linter`; 0 if unlisted."""
        return self.entries.get(linter, {}).get(path, 0)

    def debt(self, linter: str) -> tuple[int, int]:
        """(total grandfathered hits, number of grandfathered files) for `linter`."""
        listed = self.entries.get(linter, {})
        return sum(listed.values()), len(listed)

    def evaluate(self, linter: str, counts: dict[str, int]) -> Evaluation:
        """Judge this run's per-file `counts` against the recorded ceilings."""
        prior = self.entries.get(linter, {})
        regressions: list[Regression] = []
        tightenings: list[Tightening] = []
        for path, current in counts.items():
            rec = prior.get(path, 0)
            if current > rec:
                regressions.append(Regression(linter, path, rec, current))
            elif path in prior and current < rec:
                tightenings.append(Tightening(linter, path, rec, current))
        regressions.sort(key=lambda r: r.path)
        tightenings.sort(key=lambda t: t.path)
        debt_hits, debt_files = self.debt(linter)
        return Evaluation(regressions, tightenings, debt_hits, debt_files)

    # -- writing ------------------------------------------------------------ #
    def rewrite(
        self,
        linter: str,
        counts: dict[str, int],
        accept_regression: bool = False,
    ) -> tuple["Allowlist", list[Refusal]]:
        """Return a new ledger with `linter`'s entries recaptured from `counts`.

        `counts` must hold every *scanned* file (0 included): a scanned file at 0
        is dropped (it was fixed), whereas a prior entry absent from `counts` was
        not scanned this run and is preserved untouched, so capturing a subtree
        never silently discards the rest of the ledger.

        Shrinking-only: raising an existing entry or adding a new dirty file is
        refused unless `accept_regression`. The first capture for a linter (no
        prior entries) is adoption and records everything.
        """
        prior = self.entries.get(linter, {})
        # Adoption is keyed on the linter never having been captured — not on
        # the section being empty. An emptied section means every grandfathered
        # file was fixed, and re-opening the exemption at that moment would let
        # the next dirty file walk in silently.
        adopting = linter not in self.entries
        scanned = set(counts)
        new: dict[str, int] = {}
        refusals: list[Refusal] = []

        # Preserve prior entries this scan did not cover.
        for path, rec in prior.items():
            if path not in scanned:
                new[path] = rec

        for path, current in sorted(counts.items()):
            if current <= 0:
                continue  # clean -> not listed
            rec = prior.get(path)
            if rec is None:
                if adopting or accept_regression:
                    new[path] = current
                else:
                    refusals.append(Refusal("add", linter, path, 0, current))
            elif current > rec and not accept_regression:
                refusals.append(Refusal("raise", linter, path, rec, current))
                new[path] = rec  # keep the old ceiling
            else:
                new[path] = current  # lower, equal, or an accepted raise

        merged = dict(self.entries)
        merged[linter] = new
        return Allowlist(merged), refusals

    # -- serialisation ------------------------------------------------------ #
    def to_text(self) -> str:
        lines = [
            "# .lint_allowlist — shrinking-only grandfather ledger for the claim guardrails.",
            "#",
            "# Format: linter<TAB>path<TAB>accepted_hit_count  (path is repo-relative posix).",
            "# A listed file passes at or below its count and FAILS if the count rises;",
            "# an unlisted file must be clean. Counts may only shrink over time.",
            "#",
            "# Regenerate (adoption, or to tighten after fixing claims):",
            "#     python tools/lint_claims.py docs/ --write-allowlist",
            "#     python tools/lint_certifications.py docs/ --write-allowlist",
            "# Raising a count or grandfathering a new file needs --accept-regression.",
            "#",
            "# Every linter run prints: 'allowlisted debt: N hits across M files'.",
        ]
        for linter in sorted(self.entries):
            # The marker survives even when the section is empty, so adoption
            # stays a once-per-linter event across save/load round-trips.
            lines.append(f"# adopted: {linter}")
            for path in sorted(self.entries[linter]):
                lines.append(f"{linter}\t{path}\t{self.entries[linter][path]}")
        return "\n".join(lines) + "\n"

    def write(self, path: Path = DEFAULT_ALLOWLIST_PATH) -> None:
        # newline="\n" so the ledger is LF-terminated on every platform.
        Path(path).write_text(self.to_text(), encoding="utf-8", newline="\n")


def debt_line(linter: str, allowlist: Allowlist) -> str:
    """The line every run ends with. Stable wording, per Decision 1."""
    hits, files = allowlist.debt(linter)
    return f"allowlisted debt: {hits} hits across {files} files"
