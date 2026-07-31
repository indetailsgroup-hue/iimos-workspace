"""Tests for the three-layer enforcement wiring (plan Task 7).

The *behaviour* the layers enforce is already tested in Tasks 2/3/5/6; this file
tests the wiring that fires it — the parts that are locally testable. GitHub's
runner is not one of them, so the CI job is checked only for the invariants that
would make it a false gate (a missing UNVERIFIED notice, an `--allowlist`
override, a deep sweep that runs on every push). Those checks are string- and
structure-level, and the report says plainly that they do not prove the workflow
runs — only that it is not obviously wrong.

The two locally-real layers get real coverage:

    * posttooluse_lint.py — path extraction, the repo/docs guard that keeps the
      global hook inert for other projects, and loud-on-failure / quiet-on-
      success against real fixture and temp files.
    * install-hooks.py    — sets core.hooksPath in a throwaway git repo, and is
      idempotent across a second run.
"""

import contextlib
import importlib.util
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
HOOKS_DIR = REPO_ROOT / "tools" / "hooks"
FIXTURES = Path(__file__).resolve().parent / "fixtures"
WORKFLOW = REPO_ROOT / ".github" / "workflows" / "claim-guardrails.yml"


def _load(name: str, path: Path):
    """Import a hook script by file path (install-hooks.py is not a legal module
    name, and tools/hooks/ is not a package)."""
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ptu = _load("posttooluse_lint", HOOKS_DIR / "posttooluse_lint.py")
install_hooks = _load("install_hooks", HOOKS_DIR / "install-hooks.py")


class TestPostToolUsePathExtraction(unittest.TestCase):
    def test_write_event_shape(self):
        payload = {"hook_event_name": "PostToolUse", "tool_name": "Write",
                   "tool_input": {"file_path": "docs/x.md", "content": "..."}}
        self.assertEqual(ptu.extract_path(payload), "docs/x.md")

    def test_edit_event_shape(self):
        payload = {"tool_name": "Edit",
                   "tool_input": {"file_path": "docs/y.md", "old_string": "a"}}
        self.assertEqual(ptu.extract_path(payload), "docs/y.md")

    def test_garbage_yields_none(self):
        self.assertIsNone(ptu.extract_path({"tool_input": {}}))
        self.assertIsNone(ptu.extract_path({}))
        self.assertIsNone(ptu.extract_path("not a dict"))
        self.assertIsNone(ptu.extract_path({"tool_input": {"file_path": "   "}}))


class TestPostToolUseGuard(unittest.TestCase):
    """docs_target is the boundary that keeps the global hook off other projects."""

    def test_docs_markdown_under_repo_is_a_target(self):
        raw = str(REPO_ROOT / "docs" / "reports" / "anything.md")
        self.assertEqual(ptu.docs_target(raw), (REPO_ROOT / "docs" / "reports" / "anything.md").resolve())

    def test_relative_docs_path_resolves_against_the_repo(self):
        self.assertEqual(ptu.docs_target("docs/a/b.md"),
                         (REPO_ROOT / "docs" / "a" / "b.md").resolve())

    def test_non_docs_path_is_skipped(self):
        self.assertIsNone(ptu.docs_target(str(REPO_ROOT / "tools" / "note.md")))

    def test_non_markdown_under_docs_is_skipped(self):
        self.assertIsNone(ptu.docs_target(str(REPO_ROOT / "docs" / "x.txt")))

    def test_path_in_another_project_is_skipped(self):
        # The load-bearing case: a Write in some other repo must be a no-op.
        other = Path(tempfile.gettempdir()) / "some-other-project" / "docs" / "z.md"
        self.assertIsNone(ptu.docs_target(str(other)))


class TestPostToolUseRunsLinters(unittest.TestCase):
    """The loud/quiet halves of the contract, against real fixture files."""

    def test_bad_file_is_loud(self):
        code, out = ptu.run_linters(FIXTURES / "unevidenced_absence.md")
        self.assertNotEqual(code, 0)
        self.assertIn("computePanelCutSize", out)

    def test_good_file_is_quiet(self):
        code, out = ptu.run_linters(FIXTURES / "evidenced_absence.md")
        self.assertEqual(code, 0)
        self.assertEqual(out, "")

    def test_bad_certification_is_loud(self):
        code, out = ptu.run_linters(FIXTURES / "bare_certification.md")
        self.assertNotEqual(code, 0)
        self.assertIn("uncorroborated certification", out)


class TestPostToolUseMain(unittest.TestCase):
    """End to end through main(): skip cleanly, or block exit 2 with output."""

    def _run_main(self, payload_obj):
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            code = ptu.main(json.dumps(payload_obj))
        return code, err.getvalue()

    def test_non_docs_write_is_a_silent_pass(self):
        code, err = self._run_main({"tool_input": {"file_path": str(REPO_ROOT / "tools" / "x.py")}})
        self.assertEqual(code, 0)
        self.assertEqual(err, "")

    def test_other_project_write_is_a_silent_pass(self):
        other = str(Path(tempfile.gettempdir()) / "elsewhere" / "docs" / "a.md")
        code, err = self._run_main({"tool_input": {"file_path": other}})
        self.assertEqual(code, 0)
        self.assertEqual(err, "")

    def test_malformed_stdin_is_a_silent_pass(self):
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            self.assertEqual(ptu.main("this is not json"), 0)
            self.assertEqual(ptu.main(""), 0)
        self.assertEqual(err.getvalue(), "")

    def test_bad_docs_write_blocks_with_exit_2(self):
        # The true end-to-end failure path needs a bad file that really is under
        # docs/. Create one with an obviously-temporary name, assert the block,
        # and remove it — the tree returns to its prior state either way.
        tmp = REPO_ROOT / "docs" / f"_ptu_enforcement_selftest_{os.getpid()}.md"
        tmp.write_text("`ptuNonexistentSymbol` is not implemented anywhere.\n",
                       encoding="utf-8")
        self.addCleanup(lambda: tmp.exists() and tmp.unlink())
        code, err = self._run_main({"tool_name": "Write",
                                    "tool_input": {"file_path": str(tmp)}})
        self.assertEqual(code, 2)
        self.assertIn("ptuNonexistentSymbol", err)


class TestInstallHooks(unittest.TestCase):
    def _init_repo(self) -> Path:
        root = Path(tempfile.mkdtemp())
        self.addCleanup(__import__("shutil").rmtree, root, True)
        subprocess.run(["git", "-C", str(root), "init", "-q"], check=True)
        (root / "tools" / "hooks").mkdir(parents=True)
        (root / "tools" / "hooks" / "pre-commit").write_text("#!/bin/sh\nexit 0\n",
                                                              encoding="utf-8")
        return root

    def _hookspath(self, root: Path) -> str:
        r = subprocess.run(["git", "-C", str(root), "config", "--local", "--get",
                            "core.hooksPath"], capture_output=True, text=True)
        return r.stdout.strip()

    def test_sets_hookspath(self):
        root = self._init_repo()
        msg, changed = install_hooks.install(root)
        self.assertTrue(changed)
        self.assertEqual(self._hookspath(root), "tools/hooks")
        self.assertIn("tools/hooks", msg)

    def test_is_idempotent(self):
        root = self._init_repo()
        install_hooks.install(root)
        msg, changed = install_hooks.install(root)  # second run
        self.assertFalse(changed)
        self.assertIn("idempotent", msg)
        self.assertEqual(self._hookspath(root), "tools/hooks")


class TestPreCommitScript(unittest.TestCase):
    """String-level invariants on the shell hook — the parts a regression would
    quietly break: it must never go deep, must scope to staged docs, and must
    call both linters."""

    def setUp(self):
        self.text = (HOOKS_DIR / "pre-commit").read_text(encoding="utf-8")

    def test_posix_shebang(self):
        self.assertTrue(self.text.startswith("#!/bin/sh"))

    def test_never_runs_deep(self):
        # --deep may be named in a comment ("NEVER --deep"); it must never appear
        # on an executable line.
        code_lines = [ln for ln in self.text.splitlines() if not ln.lstrip().startswith("#")]
        self.assertFalse([ln for ln in code_lines if "--deep" in ln])

    def test_scopes_to_staged_docs(self):
        self.assertIn("git diff --cached", self.text)
        self.assertIn("docs/*.md", self.text)

    def test_calls_both_linters(self):
        self.assertIn("lint_claims.py", self.text)
        self.assertIn("lint_certifications.py", self.text)


class TestCiWorkflowInvariants(unittest.TestCase):
    """The CI file is UNVERIFIED (it has never run). These checks only guard
    against a workflow that would be a false gate — they do not prove it runs."""

    def setUp(self):
        try:
            import yaml  # noqa: F401
        except ModuleNotFoundError:
            self.skipTest("PyYAML not available to parse the workflow locally")
        import yaml
        self.text = WORKFLOW.read_text(encoding="utf-8")
        self.doc = yaml.safe_load(self.text)
        # PyYAML reads the bare key `on:` as the boolean True.
        self.on = self.doc.get("on", self.doc.get(True))
        self.jobs = self.doc["jobs"]

    def _run_commands(self) -> list[str]:
        cmds = []
        for job in self.jobs.values():
            for step in job.get("steps", []):
                if "run" in step:
                    cmds.append(step["run"])
        return cmds

    def test_header_states_unverified(self):
        self.assertIn("UNVERIFIED", self.text)

    def test_triggers_present(self):
        self.assertEqual(set(self.on), {"push", "pull_request", "schedule", "workflow_dispatch"})

    def test_lint_job_runs_both_linters_locally(self):
        cmds = "\n".join(self.jobs["lint"]["steps"][i].get("run", "")
                         for i in range(len(self.jobs["lint"]["steps"])))
        self.assertIn("tools/lint_claims.py", cmds)
        self.assertIn("tools/lint_certifications.py", cmds)
        self.assertNotIn("--deep", cmds)  # local mode on push/PR

    def test_deep_job_is_gated_and_deep(self):
        cond = self.jobs["deep"].get("if", "")
        self.assertIn("schedule", cond)
        self.assertIn("workflow_dispatch", cond)
        deep_cmds = "\n".join(s.get("run", "") for s in self.jobs["deep"]["steps"])
        self.assertIn("--deep", deep_cmds)

    def test_no_allowlist_override_in_any_run_step(self):
        # The committed ledger is the authority; an --allowlist flag on a run
        # step would be a doctored-ledger bypass. (It appears only in the header
        # comment explaining its own absence, which is not a run step.)
        for cmd in self._run_commands():
            self.assertNotIn("--allowlist", cmd)


if __name__ == "__main__":
    unittest.main()
