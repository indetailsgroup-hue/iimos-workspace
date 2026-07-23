"""Tests for the shrinking allowlist and deep re-verification — plan Task 6.

Two owner decisions are pinned here:

  * Decision 1 (grandfathering): a shrinking allowlist. A listed file passes at
    or below its recorded count and fails the moment the count rises; an unlisted
    file must be clean. `--write-allowlist` may only lower a count, never raise
    one, unless `--accept-regression` is given. The mechanism is shared by both
    linters (orchestrator scope extension), so its unit tests live against the
    shared module `tools/lint_allowlist.py` rather than either linter.

  * Decision 2 + O-3 (freshness): `lint_claims --deep` re-runs `verify_absence`
    for every recorded absence term over the code corpus — both roots *minus*
    `docs/` — and fails if the term is now present. Excluding `docs/` is what
    keeps the re-run from finding the claim's own prose (O-3: `--deep` was
    self-refuting). The allowlist never absorbs a deep failure: a dead claim is a
    correctness error, not grandfathered debt.

The plan's Step 1 spec tests appear here adapted to the real API: the allowlist
is keyed by repository-relative posix path (the on-disk `.lint_allowlist`
format), so the fixture's key is computed with `rel_key`, not spelled by hand.

None of these tests may depend on the contents of `determined-williams/` or
`worktrees/`; every deep test passes explicit `--root`s at temporary fixtures.
"""

from __future__ import annotations

import io
import shutil
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

from tools import lint_certifications as lc
from tools import verify_absence as va
from tools.lint_allowlist import (
    Allowlist,
    AllowlistError,
    debt_line,
    rel_key,
)
from tools.lint_claims import deep_scan, lint, lint_file

FIXTURES = Path(__file__).resolve().parent / "fixtures"
GRANDFATHERED = FIXTURES / "grandfathered.md"
DEAD_CLAIM = FIXTURES / "dead_claim.md"


def _tmpdir(test: unittest.TestCase) -> Path:
    root = Path(tempfile.mkdtemp())
    test.addCleanup(shutil.rmtree, root, ignore_errors=True)
    return root


def _write(root: Path, rel: str, text: str) -> Path:
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")
    return p


# --------------------------------------------------------------------------- #
# Plan Task 6 Step 1 — the two allowlist spec tests, adapted to the real API.
# --------------------------------------------------------------------------- #
class TestPlanStep1SpecTests(unittest.TestCase):
    def test_allowlisted_file_passes_at_recorded_count(self):
        self.assertEqual(lint([GRANDFATHERED], allowlist={rel_key(GRANDFATHERED): 3}), [])

    def test_allowlisted_file_fails_when_count_increases(self):
        # The recorded ceiling is 2 but the file carries 3 unevidenced claims.
        self.assertNotEqual(lint([GRANDFATHERED], allowlist={rel_key(GRANDFATHERED): 2}), [])

    def test_grandfathered_fixture_carries_exactly_three_claims(self):
        # Pins the ceiling the spec tests assume. If detector calibration shifts,
        # this fails loudly rather than silently changing what "3" means.
        self.assertEqual(len(lint_file(GRANDFATHERED)), 3)

    def test_no_allowlist_means_every_finding_survives(self):
        self.assertEqual(len(lint([GRANDFATHERED])), 3)


# --------------------------------------------------------------------------- #
# Deep mode — Decision 2 + O-3.
# --------------------------------------------------------------------------- #
class TestDeepMode(unittest.TestCase):
    def _code_root_with_symbol(self) -> Path:
        root = _tmpdir(self)
        _write(root, "src/exporter.ts", "export function zombieSymbol() { return 1; }\n")
        return root

    def test_deep_mode_fails_when_term_is_now_found(self):
        # Evidence says NOT LOCATED, but verify_absence finds zombieSymbol today.
        self.assertNotEqual(lint([DEAD_CLAIM], deep=True, roots=[self._code_root_with_symbol()]), [])

    def test_deep_mode_passes_when_term_is_absent(self):
        # Pins that deep fails for *presence*, not unconditionally.
        empty = _tmpdir(self)
        _write(empty, "src/unrelated.ts", "export const x = 1;\n")
        self.assertEqual(lint([DEAD_CLAIM], deep=True, roots=[empty]), [])

    def test_deep_mode_excludes_docs_subtree(self):
        # O-3: a hit that lives only under docs/ must not resurrect the claim,
        # or every documented absence marks itself dead the moment it is written.
        root = _tmpdir(self)
        _write(root, "docs/notes.md", "We mention zombieSymbol only in prose here.\n")
        self.assertEqual(lint([DEAD_CLAIM], deep=True, roots=[root]), [])

    def test_deep_finding_message_names_the_stale_term_and_location(self):
        findings = lint([DEAD_CLAIM], deep=True, roots=[self._code_root_with_symbol()])
        self.assertEqual(len(findings), 1)
        msg = str(findings[0])
        self.assertIn("zombieSymbol", msg)
        self.assertIn("stale", msg)
        self.assertIn("exporter.ts", msg)

    def test_deep_scan_reports_roots_exclusions_and_term_count(self):
        # "Deep mode must print what it searched" — the metadata that header uses.
        empty = _tmpdir(self)
        findings, meta = deep_scan([DEAD_CLAIM], roots=[empty])
        self.assertEqual(findings, [])
        self.assertIn("docs", meta["exclusions"])
        self.assertEqual(meta["terms"], 1)  # one evidence comment in the fixture

    def test_non_deep_run_does_not_re_verify(self):
        # Without --deep the dead claim is invisible: it is locally evidenced.
        self.assertEqual(lint([DEAD_CLAIM]), [])


# --------------------------------------------------------------------------- #
# Allowlist module — shrinking-only semantics, shared by both linters.
# --------------------------------------------------------------------------- #
class TestAllowlistEvaluation(unittest.TestCase):
    def test_unlisted_file_with_hits_is_a_regression_at_recorded_zero(self):
        ev = Allowlist({}).evaluate("lint_claims", {"docs/a.md": 2})
        self.assertEqual([(r.recorded, r.current) for r in ev.regressions], [(0, 2)])

    def test_file_at_recorded_count_passes(self):
        al = Allowlist({"lint_claims": {"docs/a.md": 3}})
        self.assertEqual(al.evaluate("lint_claims", {"docs/a.md": 3}).regressions, [])

    def test_file_above_recorded_count_is_a_regression_naming_file_and_counts(self):
        al = Allowlist({"lint_claims": {"docs/a.md": 3}})
        ev = al.evaluate("lint_claims", {"docs/a.md": 4})
        self.assertEqual(len(ev.regressions), 1)
        msg = str(ev.regressions[0])
        self.assertIn("docs/a.md", msg)
        self.assertIn("3", msg)
        self.assertIn("4", msg)

    def test_file_below_recorded_count_passes_but_is_tightenable(self):
        al = Allowlist({"lint_claims": {"docs/a.md": 3}})
        ev = al.evaluate("lint_claims", {"docs/a.md": 1})
        self.assertEqual(ev.regressions, [])
        self.assertEqual([(t.path, t.recorded, t.current) for t in ev.tightenings],
                         [("docs/a.md", 3, 1)])

    def test_entries_are_namespaced_by_linter(self):
        al = Allowlist({"lint_claims": {"docs/a.md": 3}})
        ev = al.evaluate("lint_certifications", {"docs/a.md": 1})
        self.assertEqual([(r.recorded, r.current) for r in ev.regressions], [(0, 1)])

    def test_debt_line_counts_only_this_linters_entries(self):
        al = Allowlist({
            "lint_claims": {"docs/a.md": 3, "docs/b.md": 2},
            "lint_certifications": {"docs/c.md": 5},
        })
        self.assertEqual(debt_line("lint_claims", al), "allowlisted debt: 5 hits across 2 files")
        self.assertEqual(debt_line("lint_certifications", al),
                         "allowlisted debt: 5 hits across 1 files")

    def test_debt_line_when_nothing_is_grandfathered(self):
        self.assertEqual(debt_line("lint_claims", Allowlist({})),
                         "allowlisted debt: 0 hits across 0 files")


class TestAllowlistFormat(unittest.TestCase):
    def test_body_is_tab_separated_linter_path_count(self):
        al = Allowlist({"lint_claims": {"docs/a.md": 3}})
        body = [l for l in al.to_text().splitlines() if l and not l.startswith("#")]
        self.assertEqual(body, ["lint_claims\tdocs/a.md\t3"])

    def test_header_explains_shrinking_and_regeneration(self):
        text = Allowlist({}).to_text()
        header = "\n".join(l for l in text.splitlines() if l.startswith("#")).lower()
        self.assertIn("shrink", header)
        self.assertIn("--write-allowlist", header)

    def test_parse_round_trips(self):
        al = Allowlist({
            "lint_claims": {"docs/a.md": 3, "docs/b.md": 1},
            "lint_certifications": {"docs/a.md": 2},
        })
        self.assertEqual(Allowlist.parse(al.to_text()).entries, al.entries)

    def test_load_missing_file_is_empty(self):
        self.assertEqual(Allowlist.load(_tmpdir(self) / "nope").entries, {})

    def test_malformed_line_raises(self):
        with self.assertRaises(AllowlistError):
            Allowlist.parse("lint_claims\tdocs/a.md\tnotanumber\n")

    def test_lines_are_sorted_for_stable_diffs(self):
        al = Allowlist({"lint_claims": {"docs/z.md": 1, "docs/a.md": 1}})
        body = [l for l in al.to_text().splitlines() if l and not l.startswith("#")]
        self.assertEqual(body, ["lint_claims\tdocs/a.md\t1", "lint_claims\tdocs/z.md\t1"])


class TestAllowlistRewrite(unittest.TestCase):
    def test_write_lowers_a_reduced_count(self):
        new, refusals = Allowlist({"lint_claims": {"docs/a.md": 5}}).rewrite(
            "lint_claims", {"docs/a.md": 2})
        self.assertEqual(new.recorded("lint_claims", "docs/a.md"), 2)
        self.assertEqual(refusals, [])

    def test_write_refuses_to_raise_without_accept_regression(self):
        new, refusals = Allowlist({"lint_claims": {"docs/a.md": 2}}).rewrite(
            "lint_claims", {"docs/a.md": 5})
        self.assertEqual(new.recorded("lint_claims", "docs/a.md"), 2)  # ceiling kept
        self.assertEqual([r.kind for r in refusals], ["raise"])
        self.assertIn("docs/a.md", str(refusals[0]))

    def test_write_raises_with_accept_regression(self):
        new, refusals = Allowlist({"lint_claims": {"docs/a.md": 2}}).rewrite(
            "lint_claims", {"docs/a.md": 5}, accept_regression=True)
        self.assertEqual(new.recorded("lint_claims", "docs/a.md"), 5)
        self.assertEqual(refusals, [])

    def test_write_refuses_a_new_dirty_file_after_adoption(self):
        new, refusals = Allowlist({"lint_claims": {"docs/a.md": 2}}).rewrite(
            "lint_claims", {"docs/a.md": 2, "docs/new.md": 3})
        self.assertEqual(new.recorded("lint_claims", "docs/new.md"), 0)  # not grandfathered
        self.assertEqual([r.kind for r in refusals], ["add"])

    def test_initial_adoption_accepts_every_dirty_file(self):
        new, refusals = Allowlist({}).rewrite(
            "lint_claims", {"docs/a.md": 2, "docs/b.md": 3})
        self.assertEqual(refusals, [])
        self.assertEqual(new.recorded("lint_claims", "docs/a.md"), 2)
        self.assertEqual(new.recorded("lint_claims", "docs/b.md"), 3)

    def test_write_preserves_the_other_linters_entries(self):
        al = Allowlist({"lint_claims": {"docs/a.md": 2}, "lint_certifications": {"docs/c.md": 4}})
        new, _ = al.rewrite("lint_claims", {"docs/a.md": 1})
        self.assertEqual(new.recorded("lint_certifications", "docs/c.md"), 4)

    def test_write_drops_a_file_scanned_clean(self):
        new, _ = Allowlist({"lint_claims": {"docs/a.md": 2}}).rewrite("lint_claims", {"docs/a.md": 0})
        self.assertEqual(new.recorded("lint_claims", "docs/a.md"), 0)
        self.assertNotIn("docs/a.md", new.entries.get("lint_claims", {}))

    def test_write_preserves_a_prior_entry_that_was_not_scanned(self):
        al = Allowlist({"lint_claims": {"docs/a.md": 2, "docs/far.md": 3}})
        new, _ = al.rewrite("lint_claims", {"docs/a.md": 1})  # far.md absent from this scan
        self.assertEqual(new.recorded("lint_claims", "docs/far.md"), 3)


# --------------------------------------------------------------------------- #
# verify_absence --exclude — the minimal option deep mode needs (O-3).
# --------------------------------------------------------------------------- #
class TestVerifyAbsenceExclude(unittest.TestCase):
    def _root(self) -> Path:
        root = _tmpdir(self)
        _write(root, "docs/note.txt", "the term wobbleZonk appears only in docs\n")
        _write(root, "src/keep.txt", "nothing relevant here\n")
        return root

    def _run(self, argv):
        buf = io.StringIO()
        with redirect_stdout(buf):
            code = va.main(argv)
        return code, buf.getvalue()

    def test_without_exclude_the_term_is_found(self):
        code, _ = self._run(["wobbleZonk", "--root", str(self._root())])
        self.assertEqual(code, 0)

    def test_exclude_hides_a_match_under_the_named_directory(self):
        code, _ = self._run(["wobbleZonk", "--root", str(self._root()), "--exclude", "docs"])
        self.assertEqual(code, 1)

    def test_output_records_the_exclusion(self):
        _, out = self._run(["wobbleZonk", "--root", str(self._root()), "--exclude", "docs"])
        self.assertIn("docs", out)
        self.assertRegex(out.lower(), r"exclud")


# --------------------------------------------------------------------------- #
# lint_certifications shares the allowlist (orchestrator scope extension).
# --------------------------------------------------------------------------- #
class TestCertificationsAllowlist(unittest.TestCase):
    """The same shrinking-only ledger governs the certification linter, so the
    Task 7 CI gate for certifications is not red against the corpus on day one."""

    CERT = "`exportDxf` is safe.\n"

    def _run(self, argv):
        buf = io.StringIO()
        with redirect_stdout(buf):
            code = lc.main(argv)
        return code, buf.getvalue()

    def test_unlisted_certification_fails_and_prints_debt(self):
        alp = _tmpdir(self) / "al"
        f = _write(_tmpdir(self), "docs/c.md", self.CERT)
        code, out = self._run([str(f), "--allowlist", str(alp)])
        self.assertEqual(code, 1)
        self.assertIn("allowlisted debt:", out)

    def test_grandfathered_certification_passes_after_capture(self):
        alp = _tmpdir(self) / "al"
        f = _write(_tmpdir(self), "docs/c.md", self.CERT)
        self._run([str(f), "--allowlist", str(alp), "--write-allowlist"])
        code, out = self._run([str(f), "--allowlist", str(alp)])
        self.assertEqual(code, 0)
        self.assertIn("allowlisted debt: 1 hits across 1 files", out)

    def test_capture_writes_a_certification_namespaced_record(self):
        alp = _tmpdir(self) / "al"
        f = _write(_tmpdir(self), "docs/c.md", self.CERT)
        self._run([str(f), "--allowlist", str(alp), "--write-allowlist"])
        loaded = Allowlist.load(alp)
        self.assertEqual(loaded.debt("lint_certifications"), (1, 1))
        self.assertEqual(loaded.debt("lint_claims"), (0, 0))

    def test_count_rising_above_the_record_fails(self):
        alp = _tmpdir(self) / "al"
        root = _tmpdir(self)
        f = _write(root, "docs/c.md", self.CERT)
        self._run([str(f), "--allowlist", str(alp), "--write-allowlist"])
        # A second certification appears in the same file: 1 -> 2, over the record.
        f.write_text(self.CERT + "`importDxf` is clean.\n", encoding="utf-8")
        code, _ = self._run([str(f), "--allowlist", str(alp)])
        self.assertEqual(code, 1)


if __name__ == "__main__":
    unittest.main()
