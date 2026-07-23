"""Regression tests for the cross-vendor (GPT-5.6 Sol) review of Task 6.

Both defects were reproduced mechanically before being fixed; each test here
pins one of the fixes.
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from tools.lint_allowlist import Allowlist

REPO = Path(__file__).resolve().parent.parent.parent


class AdoptionIsOncePerLinter(unittest.TestCase):
    """`adopting = not prior` re-opened the one-time adoption exemption the
    moment a linter's last entry was fixed and dropped: the next dirty file was
    then grandfathered without --accept-regression. Adoption is now keyed on
    the linter never having been captured, and the `# adopted:` marker keeps
    that fact alive across save/load even when the section is empty."""

    def test_emptied_section_does_not_readopt(self):
        led = Allowlist({"lint_claims": {"docs/x.md": 1}})
        led2, r1 = led.rewrite("lint_claims", {"docs/x.md": 0}, False)
        self.assertEqual(led2.entries.get("lint_claims"), {})
        self.assertEqual(r1, [])
        led3, r2 = led2.rewrite("lint_claims", {"docs/new_dirty.md": 7}, False)
        self.assertEqual(led3.entries.get("lint_claims"), {},
                         "a dirty file walked into an emptied ledger without --accept-regression")
        self.assertEqual([x.kind for x in r2], ["add"])

    def test_adopted_marker_survives_a_round_trip(self):
        led = Allowlist({"lint_claims": {}})
        reparsed = Allowlist.parse(led.to_text())
        self.assertIn("lint_claims", reparsed.entries)
        led2, refusals = reparsed.rewrite("lint_claims", {"docs/dirty.md": 3}, False)
        self.assertEqual(led2.entries.get("lint_claims"), {})
        self.assertTrue(refusals)

    def test_true_first_capture_still_adopts(self):
        led = Allowlist({})
        led2, refusals = led.rewrite("lint_claims", {"docs/dirty.md": 3}, False)
        self.assertEqual(led2.entries.get("lint_claims"), {"docs/dirty.md": 3})
        self.assertEqual(refusals, [])


class WriteAllowlistExitCode(unittest.TestCase):
    """--write-allowlist printed its refusals and then exited 0 — a maintenance
    command reporting success while recording less than the caller scanned.
    The write still happens; the exit code now carries the refusals."""

    def _run(self, tool: str, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run(
            [sys.executable, str(REPO / "tools" / tool), *args],
            capture_output=True, text=True, encoding="utf-8", cwd=REPO, timeout=120,
        )

    def test_refused_capture_exits_nonzero(self):
        with tempfile.TemporaryDirectory() as td:
            d = Path(td)
            doc = d / "dirty.md"
            doc.write_text("`ghostArtifactQq` does not exist.\n", encoding="utf-8")
            ledger = d / "ledger.txt"
            # a pre-existing ledger with an unrelated entry: not adoption
            ledger.write_text("# adopted: lint_claims\nlint_claims\tdocs/other.md\t2\n",
                              encoding="utf-8")
            r = self._run("lint_claims.py", str(doc), "--allowlist", str(ledger),
                          "--write-allowlist")
            self.assertIn("refused", r.stdout)
            self.assertEqual(r.returncode, 1)

    def test_clean_capture_still_exits_zero(self):
        with tempfile.TemporaryDirectory() as td:
            d = Path(td)
            doc = d / "clean.md"
            doc.write_text("nothing to see here\n", encoding="utf-8")
            ledger = d / "ledger.txt"
            r = self._run("lint_claims.py", str(doc), "--allowlist", str(ledger),
                          "--write-allowlist")
            self.assertEqual(r.returncode, 0)


class DeepIsNeverAbsorbedByTheAllowlist(unittest.TestCase):
    """The rule existed in prose and in the pristine code, but no test crossed
    the deep+allowlist seam: a mutation routing dead claims through the
    grandfathered ceiling survived the whole suite. This test crosses it."""

    def test_dead_claim_survives_a_grandfathered_ceiling(self):
        from tools import lint_claims as lc
        with tempfile.TemporaryDirectory() as td:
            d = Path(td)
            code = d / "src"; code.mkdir()
            (code / "impl.py").write_text("def zombieRulingProbe(): pass\n", encoding="utf-8")
            doc = d / "claim.md"
            doc.write_text(
                "`zombieRulingProbe` was not located anywhere.\n\n"
                "<!-- verify_absence: zombieRulingProbe @ 2026-07-23 -->\n\n"
                "```\nRESULT: NOT LOCATED by any method above.\n```\n",
                encoding="utf-8",
            )
            key = lc.display_path(doc)
            # generous ceiling: local findings fully absorbed
            findings = lc.lint([doc], allowlist={key: 99}, deep=True, roots=[code])
            dead = [f for f in findings if "stale" in str(f) or type(f).__name__ == "DeepFinding"]
            self.assertTrue(dead, "a dead claim was absorbed by an allowlist ceiling")


class ClaimsCliLoadsTheLedger(unittest.TestCase):
    """The certifications CLI had a capture->pass->regress pin; the claims CLI
    had none, so a mutation that never loaded the ledger survived green and
    Task 7's exact gate invocation was unguarded."""

    def _run(self, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run(
            [sys.executable, str(REPO / "tools" / "lint_claims.py"), *args],
            capture_output=True, text=True, encoding="utf-8", cwd=REPO, timeout=120,
        )

    def test_grandfathered_file_passes_and_regression_fails_through_the_cli(self):
        from tools.lint_claims import display_path
        with tempfile.TemporaryDirectory() as td:
            d = Path(td)
            doc = d / "grand.md"
            doc.write_text("`ghostCliProbe` does not exist.\n", encoding="utf-8")
            ledger = d / "ledger.txt"
            key = display_path(doc)
            ledger.write_text(f"# adopted: lint_claims\nlint_claims\t{key}\t1\n", encoding="utf-8")

            at_ceiling = self._run(str(doc), "--allowlist", str(ledger))
            self.assertEqual(at_ceiling.returncode, 0,
                             f"grandfathered file failed through the CLI: {at_ceiling.stdout}")
            self.assertIn("allowlisted debt", at_ceiling.stdout)

            doc.write_text("`ghostCliProbe` does not exist.\n\n`secondGhostQq` is not implemented anywhere.\n",
                           encoding="utf-8")
            over_ceiling = self._run(str(doc), "--allowlist", str(ledger))
            self.assertEqual(over_ceiling.returncode, 1, "a count regression passed through the CLI")


class WorktreesAreNotDeepAuthority(unittest.TestCase):
    """A term present only in worktrees/ — review checkouts of unmerged
    third-party branches — must not kill a live claim. Demonstrated against the
    real corpus with a schema name unique to a worktree artifact; pinned here
    against a fixture tree so the suite never touches the real one."""

    def test_worktrees_subdir_is_not_searched(self):
        from tools.lint_claims import deep_locate
        with tempfile.TemporaryDirectory() as td:
            d = Path(td)
            wt = d / "worktrees" / "review-x"; wt.mkdir(parents=True)
            (wt / "third_party.md").write_text("mentions zombieWorktreeProbe here\n", encoding="utf-8")
            self.assertIsNone(deep_locate("zombieWorktreeProbe", [d]))
            # control: same term in an ordinary tree IS found
            (d / "src").mkdir(); (d / "src" / "a.py").write_text("zombieWorktreeProbe = 1\n", encoding="utf-8")
            self.assertIsNotNone(deep_locate("zombieWorktreeProbe", [d]))


if __name__ == "__main__":
    unittest.main()
