"""Regression tests for the defects found by the Tasks 2/3 adversarial review.

Every test here encodes a bypass or violation that was DEMONSTRATED against the
shipped linters — reproduced by the orchestrator, several also adjudicated by an
independent cross-vendor model — not one that was merely theorised. The probe
outputs live in the session record; each docstring states what actually
happened before the fix.
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from tools import lint_certifications as lc
from tools import lint_claims as lcl

REPO = Path(__file__).resolve().parent.parent.parent


def _run(tool: str, *args: str) -> tuple[int, str, str]:
    r = subprocess.run(
        [sys.executable, str(REPO / "tools" / tool), *args],
        capture_output=True, text=True, encoding="utf-8", cwd=REPO, timeout=60,
    )
    return r.returncode, r.stdout, r.stderr


# Content both linters flag. The absence claims must name an artifact —
# `claim_detect` only reports a negation that is *about* something nameable, so
# plain prose like "there is no supported path" passes clean and would have made
# every negative assertion in ExcludedRootRefusal vacuous. The two control tests
# below are what caught that while this fixture was being written.
VIOLATING_MARKDOWN = (
    "# Fix plan\n"
    "\n"
    "There is no `mpr_exporter` anywhere in the repository.\n"
    "\n"
    "The `thermal_guard` module is missing.\n"
    "\n"
    "The `panel_gate` output is safe for production use.\n"
)


class ExcludedRootRefusal(unittest.TestCase):
    """`lint_claims.py worktrees` walked 54,577 third-party files and reported
    findings from them. The exclusion pruned children during the walk but never
    looked at the root itself. Both linters must now refuse loudly (exit 2):
    a silent skip would print a clean summary over a tree the tool refused to
    read, which is a stronger false claim than any it lints.

    These tests used to pass the literal relative path `worktrees`. That
    directory is untracked local clutter — `git ls-files worktrees` returns
    nothing — so the tests passed only on a checkout that happened to have one
    and failed in every fresh clone with `no such path: worktrees`. Measured on
    one commit: 12 OK in the governance root, 4 failures in a fresh worktree.
    The condition under test is now constructed rather than borrowed from
    whatever is lying around on the developer's disk.

    The fixture tree carries an unevidenced absence claim and an uncorroborated
    certification, so a linter that failed to refuse would emit findings rather
    than an empty green. `test_the_fixture_would_be_reported_if_not_excluded`
    proves that, and without it the negative assertions below would be vacuous.
    """

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        root = Path(self._tmp.name)
        self.worktrees = root / "worktrees"
        self.determined = root / "determined-williams"
        self.nested_file = self.worktrees / "demo-monolith" / "FIX_PLAN.md"
        self.nested_file.parent.mkdir(parents=True)
        self.nested_file.write_text(VIOLATING_MARKDOWN, encoding="utf-8")
        self.determined.mkdir()
        (self.determined / "NOTES.md").write_text(
            VIOLATING_MARKDOWN, encoding="utf-8"
        )
        # Same content under a name no exclusion matches, to prove the fixture
        # is one the linters would otherwise report.
        self.plain = root / "plain"
        self.plain.mkdir()
        (self.plain / "NOTES.md").write_text(VIOLATING_MARKDOWN, encoding="utf-8")

    def tearDown(self):
        self._tmp.cleanup()

    def test_claims_control_the_fixture_is_reported_when_not_excluded(self):
        """The control for lint_claims. If this ever goes green-and-clean, the
        refusal tests below have become vacuous and are proving nothing."""
        code, out, err = _run("lint_claims.py", str(self.plain))
        self.assertNotEqual(code, 0)
        self.assertIn("unevidenced", out + err)
        self.assertNotIn("refusing excluded path", err)

    def test_certifications_control_the_fixture_is_reported_when_not_excluded(self):
        """The same control for lint_certifications, which reports a different
        marker and would not be exercised by the claims control alone."""
        code, out, err = _run("lint_certifications.py", str(self.plain))
        self.assertNotEqual(code, 0)
        self.assertIn("uncorroborated certification", out + err)
        self.assertNotIn("refusing excluded path", err)

    def test_lint_claims_refuses_worktrees_as_root(self):
        code, out, err = _run("lint_claims.py", str(self.worktrees))
        self.assertEqual(code, 2)
        self.assertIn("refusing excluded path", err)
        self.assertNotIn("unevidenced", out)

    def test_lint_claims_refuses_determined_williams_as_root(self):
        code, out, err = _run("lint_claims.py", str(self.determined))
        self.assertEqual(code, 2)
        self.assertIn("refusing excluded path", err)
        self.assertNotIn("unevidenced", out)

    def test_lint_claims_refuses_a_file_inside_an_excluded_tree(self):
        code, _, err = _run("lint_claims.py", str(self.nested_file))
        self.assertEqual(code, 2)
        self.assertIn("refusing excluded path", err)

    def test_lint_certifications_refuses_excluded_root_instead_of_green(self):
        """Before the fix this exited 0 and printed the affirmative summary."""
        code, out, err = _run("lint_certifications.py", str(self.worktrees))
        self.assertEqual(code, 2)
        self.assertIn("refusing excluded path", err)
        self.assertNotIn("every certification carries evidence", out)

    def test_both_exclusion_sets_carry_the_third_party_trees(self):
        """`lint_claims` keeps two exclusion sets: `EXCLUDED_DIRS` prunes the
        local walk and `DEEP_EXCLUDE` prunes the nightly deep sweep. Mutating
        `EXCLUDED_DIRS` is caught by the refusal tests above — measured: removing
        `worktrees` from it turns their exit 2 into exit 1 and produces two
        failures. **Mutating `DEEP_EXCLUDE` was caught by nothing**, so the deep
        sweep could silently start reading third-party trees. The deep sweep is
        too expensive to drive from a unit test, so this pins the constant
        instead: cheap, and it fails the moment either set loses a name."""
        for name in ("worktrees", "determined-williams"):
            self.assertIn(name, lcl.EXCLUDED_DIRS)
            self.assertIn(name, lcl.DEEP_EXCLUDE)
            self.assertIn(name, lc.EXCLUDED_DIR_NAMES)

    def test_library_walk_still_skips_excluded_roots(self):
        self.assertEqual(lcl.iter_markdown_files([Path("worktrees")]), [])


class MarkerBypasses(unittest.TestCase):
    """Bypasses that silenced a certification without recording any check."""

    CERT = "The `rm -rf` guard is safe.\n\n"

    def test_the_linters_own_remediation_hint_is_not_a_label(self):
        """The failure message prints the marker format with a placeholder
        label; pasting that hint verbatim passed the length check, so the
        tool's own output was a working bypass of the tool."""
        text = self.CERT + "<!-- adversary: what you attacked it with, and what happened -->\n"
        self.assertEqual(len(lc.lint_text(text)), 1)

    def test_a_real_label_still_passes(self):
        text = self.CERT + "<!-- adversary: fed /tmp/../home traversal to the guard; it refused -->\n"
        self.assertEqual(lc.lint_text(text), [])

    def test_a_marker_inside_a_fence_is_an_illustration_not_evidence(self):
        """Documenting the marker format next to a certification silenced the
        finding: markers were scanned in raw text while lint_claims masked
        fences for the identical case."""
        text = self.CERT + "```markdown\n<!-- adversary: tried traversal, guard held -->\n```\n"
        self.assertEqual(len(lc.lint_text(text)), 1)

    def test_an_unterminated_marker_cannot_span_the_document(self):
        """With DOTALL, `<!-- adversary:` closed pages later by an unrelated
        `-->` created one span covering everything between them."""
        filler = "Paragraph.\n" * 8
        text = (self.CERT + "<!-- adversary: unclosed\n" + filler
                + "`exportDxf` is safe.\n\n<!-- ordinary comment -->\n")
        findings = lc.lint_text(text)
        self.assertEqual(len(findings), 2, [f.report() for f in findings])


class QuotedExcerptIsNotATranscript(unittest.TestCase):
    """A fenced `text` block holding a blockquote (`> ...`) plus one more line
    was read as command-and-output, because bare `>` counted as a shell prompt.
    In Markdown a bare `>` is quotation, and any quoted excerpt was evidence."""

    def test_blockquote_in_a_fence_is_not_evidence(self):
        text = ("The `rm -rf` guard is safe.\n\n"
                "```text\n> The guard checks the prefix.\nIt held in every case.\n```\n")
        self.assertEqual(len(lc.lint_text(text)), 1)

    def test_dollar_prompted_transcript_is_still_evidence(self):
        text = ("The `rm -rf` guard is safe.\n\n"
                "```console\n$ bash tools/attack_guard.sh --traversal\nguard refused: path escapes /tmp\n```\n")
        self.assertEqual(lc.lint_text(text), [])


class WindowPolicyIsPinned(unittest.TestCase):
    def test_window_is_five_lines(self):
        """The boundary tests derive their fixtures from WINDOW_LINES, so
        widening it to 500 passed the whole suite (mutation-tested; confirmed
        independently by a cross-vendor reviewer). The window is a POLICY —
        derived in the module docstring from the widest legitimate layout —
        not an implementation detail, so the number itself is pinned here.
        Changing it must be a decision that edits this test, not a drive-by."""
        self.assertEqual(lc.WINDOW_LINES, 5)


if __name__ == "__main__":
    unittest.main()
