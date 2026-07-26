"""Contract tests for the kitchen-kernel verification evidence."""

from __future__ import annotations

from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest import mock

from tools import verify_kitchen_kernel as verifier


def command_result(
    command: list[str],
    *,
    exit_code: int = 0,
    output: str = "",
) -> dict[str, object]:
    return {
        "command": command,
        "exit_code": exit_code,
        "output": output,
        "output_bytes": len(output.encode("utf-8")),
        "output_sha256": "test-double",
    }


def unittest_result(
    command: list[str],
    count: int,
    *,
    exit_code: int = 0,
    ok: bool = True,
) -> dict[str, object]:
    summary = "OK" if ok else "FAILED (failures=1)"
    return command_result(
        command,
        exit_code=exit_code,
        output=f"Ran {count} tests in 0.001s\n\n{summary}\n",
    )


def check_by_name(evidence: verifier.Evidence, name: str) -> dict[str, object]:
    matches = [check for check in evidence.checks if check["name"] == name]
    if not matches:
        return {"name": name, "passed": False, "details": {"missing": True}}
    return matches[0]


class UnittestEvidenceContractTests(unittest.TestCase):
    def run_command_checks(
        self,
        *,
        ambient_count: int = 35,
        ambient_exit: int = 0,
        ambient_ok: bool = True,
        component_count: int = 20,
        component_exit: int = 0,
        component_ok: bool = True,
        identity_count: int = 7,
        identity_exit: int = 0,
        identity_ok: bool = True,
    ) -> verifier.Evidence:
        def fake_run(command: list[str]) -> dict[str, object]:
            if "compileall" in command:
                return command_result(command)
            if "tests.component_master.test_boring_standard" in command:
                return unittest_result(
                    command,
                    component_count,
                    exit_code=component_exit,
                    ok=component_ok,
                )
            if "tests.identity_tenancy.test_contracts" in command:
                return unittest_result(
                    command,
                    identity_count,
                    exit_code=identity_exit,
                    ok=identity_ok,
                )
            return unittest_result(
                command,
                ambient_count,
                exit_code=ambient_exit,
                ok=ambient_ok,
            )

        evidence = verifier.Evidence()
        with mock.patch.object(verifier, "run", side_effect=fake_run):
            verifier.check_commands(evidence)
        return evidence

    def test_additional_ambient_tests_pass_without_losing_exact_core_counts(self) -> None:
        evidence = self.run_command_checks(ambient_count=35)

        full_suite = check_by_name(evidence, "unittest_full_suite")
        governed = check_by_name(evidence, "governed_kernel_unittest_suites")

        self.assertTrue(full_suite["passed"], full_suite)
        self.assertEqual(35, full_suite["details"]["test_count"])
        self.assertTrue(governed["passed"], governed)
        self.assertEqual(
            20,
            governed["details"]["suites"]["component_master"]["test_count"],
        )
        self.assertEqual(
            7,
            governed["details"]["suites"]["identity_tenancy"]["test_count"],
        )

    def test_governed_suites_pin_adopted_modules_and_exact_counts(self) -> None:
        evidence = self.run_command_checks()
        governed = check_by_name(evidence, "governed_kernel_unittest_suites")

        component_master = governed["details"]["suites"]["component_master"]
        self.assertEqual(
            [
                verifier.sys.executable,
                "-m",
                "unittest",
                "tests.component_master.test_boring_standard",
                "tests.component_master.test_catalog_baseline",
                "tests.component_master.test_finish_taxonomy",
                "tests.component_master.test_seed_integrity",
                "-v",
            ],
            component_master["command"],
        )
        self.assertEqual(20, component_master["expected_test_count"])
        self.assertEqual(20, component_master["test_count"])

        identity_tenancy = governed["details"]["suites"]["identity_tenancy"]
        self.assertEqual(
            [
                verifier.sys.executable,
                "-m",
                "unittest",
                "tests.identity_tenancy.test_contracts",
                "-v",
            ],
            identity_tenancy["command"],
        )
        self.assertEqual(7, identity_tenancy["expected_test_count"])
        self.assertEqual(7, identity_tenancy["test_count"])

    def test_core_count_drift_missing_ok_and_nonzero_exit_are_rejected(self) -> None:
        cases = {
            "component count drift": {"component_count": 19},
            "component missing OK": {"component_ok": False},
            "component nonzero exit": {"component_exit": 1},
            "identity count drift": {"identity_count": 8},
            "identity missing OK": {"identity_ok": False},
            "identity nonzero exit": {"identity_exit": 1},
        }
        for label, overrides in cases.items():
            with self.subTest(label=label):
                evidence = self.run_command_checks(**overrides)
                governed = check_by_name(
                    evidence,
                    "governed_kernel_unittest_suites",
                )
                self.assertFalse(governed["passed"], governed)

    def test_full_suite_requires_floor_ok_and_zero_exit(self) -> None:
        cases = {
            "below governed floor": {"ambient_count": 26},
            "missing OK": {"ambient_ok": False},
            "nonzero exit": {"ambient_exit": 1},
        }
        for label, overrides in cases.items():
            with self.subTest(label=label):
                evidence = self.run_command_checks(**overrides)
                full_suite = check_by_name(evidence, "unittest_full_suite")
                self.assertFalse(full_suite["passed"], full_suite)

    def test_schema_documents_consumer_visible_check_change(self) -> None:
        self.assertEqual(
            "1.1.0",
            getattr(verifier, "OUTPUT_SCHEMA_VERSION", None),
        )


class GitEvidenceContractTests(unittest.TestCase):
    def git(
        self,
        repository: Path,
        *arguments: str,
        check: bool = True,
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["git", *arguments],
            cwd=repository,
            text=True,
            encoding="utf-8",
            errors="replace",
            capture_output=True,
            check=check,
        )

    def init_repository(self, repository: Path, *, commit: bool = True) -> str:
        self.git(repository, "init", "-q")
        self.git(repository, "config", "user.name", "Verifier Contract Test")
        self.git(repository, "config", "user.email", "verifier@example.invalid")
        branch = self.git(
            repository,
            "branch",
            "--show-current",
        ).stdout.strip()
        if commit:
            (repository / "tracked.txt").write_text("base\n", encoding="utf-8")
            self.git(repository, "add", "tracked.txt")
            self.git(repository, "commit", "-q", "-m", "test fixture")
        return branch

    def git_evidence(self, repository: Path) -> dict[str, object]:
        evidence = verifier.Evidence()
        with mock.patch.object(verifier, "ROOT", repository):
            verifier.check_git(evidence)
        return check_by_name(evidence, "git_established_repository_state")

    def test_clean_committed_repository_passes_with_and_without_remote(self) -> None:
        for with_remote in (False, True):
            with self.subTest(with_remote=with_remote):
                with tempfile.TemporaryDirectory() as temporary:
                    repository = Path(temporary)
                    branch = self.init_repository(repository)
                    if with_remote:
                        self.git(
                            repository,
                            "remote",
                            "add",
                            "origin",
                            str(repository / "unused-remote.git"),
                        )

                    check = self.git_evidence(repository)

                    self.assertTrue(check["passed"], check)
                    self.assertEqual(branch, check["details"]["branch_name"])
                    self.assertFalse(check["details"]["detached_head"])
                    self.assertEqual(
                        1 if with_remote else 0,
                        check["details"]["remote_count"],
                    )

    def test_remote_query_failure_fails_without_parsing_stderr_as_names(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            repository = Path(temporary)
            self.init_repository(repository)
            actual_run = verifier.run

            def fail_only_remote(command: list[str]) -> dict[str, object]:
                if command == ["git", "remote"]:
                    return command_result(
                        command,
                        exit_code=2,
                        output="fatal: injected remote query failure\n",
                    )
                return actual_run(command)

            evidence = verifier.Evidence()
            with (
                mock.patch.object(verifier, "ROOT", repository),
                mock.patch.object(
                    verifier,
                    "run",
                    side_effect=fail_only_remote,
                ),
            ):
                verifier.check_git(evidence)
            check = check_by_name(
                evidence,
                "git_established_repository_state",
            )

            self.assertFalse(check["passed"], check)
            self.assertEqual(2, check["details"]["remote_exit_code"])
            self.assertEqual([], check["details"]["remote_names"])
            self.assertEqual(0, check["details"]["remote_count"])

    def test_clean_detached_head_is_recorded_accurately(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            repository = Path(temporary)
            self.init_repository(repository)
            self.git(repository, "checkout", "-q", "--detach", "HEAD")

            check = self.git_evidence(repository)

            self.assertTrue(check["passed"], check)
            self.assertIsNone(check["details"]["branch_name"])
            self.assertTrue(check["details"]["detached_head"])

    def test_unborn_repository_fails(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            repository = Path(temporary)
            self.init_repository(repository, commit=False)

            check = self.git_evidence(repository)

            self.assertFalse(check["passed"], check)
            self.assertFalse(check["details"].get("head_exists", True))

    def test_staged_unstaged_and_untracked_changes_fail(self) -> None:
        cases = ("staged", "unstaged", "untracked")
        for dirty_state in cases:
            with self.subTest(dirty_state=dirty_state):
                with tempfile.TemporaryDirectory() as temporary:
                    repository = Path(temporary)
                    self.init_repository(repository)
                    if dirty_state == "staged":
                        (repository / "tracked.txt").write_text(
                            "staged\n",
                            encoding="utf-8",
                        )
                        self.git(repository, "add", "tracked.txt")
                    elif dirty_state == "unstaged":
                        (repository / "tracked.txt").write_text(
                            "unstaged\n",
                            encoding="utf-8",
                        )
                    else:
                        (repository / "untracked.txt").write_text(
                            "untracked\n",
                            encoding="utf-8",
                        )

                    check = self.git_evidence(repository)

                    self.assertFalse(check["passed"], check)

    def test_unmerged_entries_fail(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            repository = Path(temporary)
            original_branch = self.init_repository(repository)
            self.git(repository, "branch", "conflict-other")
            (repository / "tracked.txt").write_text("main\n", encoding="utf-8")
            self.git(repository, "add", "tracked.txt")
            self.git(repository, "commit", "-q", "-m", "main change")
            self.git(repository, "checkout", "-q", "conflict-other")
            (repository / "tracked.txt").write_text("other\n", encoding="utf-8")
            self.git(repository, "add", "tracked.txt")
            self.git(repository, "commit", "-q", "-m", "other change")
            self.git(repository, "checkout", "-q", original_branch)
            merge = self.git(
                repository,
                "merge",
                "conflict-other",
                check=False,
            )
            self.assertNotEqual(0, merge.returncode, merge.stdout + merge.stderr)

            check = self.git_evidence(repository)

            self.assertFalse(check["passed"], check)
            self.assertGreater(
                check["details"].get("unmerged_entry_count", 0),
                0,
            )


class GeneratedSummaryIgnoreContractTests(unittest.TestCase):
    def test_generated_summary_path_is_ignored_exactly(self) -> None:
        ignore_file = verifier.ROOT / ".gitignore"
        rules = ignore_file.read_text(encoding="utf-8").splitlines()
        exact_rule = (
            "/artifacts/verification/kitchen-kernel-bootstrap-summary.json"
        )

        self.assertIn(exact_rule, rules)
        ignored = subprocess.run(
            [
                "git",
                "check-ignore",
                "--quiet",
                "--",
                "artifacts/verification/kitchen-kernel-bootstrap-summary.json",
            ],
            cwd=verifier.ROOT,
            check=False,
        )
        sibling = subprocess.run(
            [
                "git",
                "check-ignore",
                "--quiet",
                "--",
                "artifacts/verification/another-summary.json",
            ],
            cwd=verifier.ROOT,
            check=False,
        )
        nested = subprocess.run(
            [
                "git",
                "check-ignore",
                "--quiet",
                "--",
                "nested/artifacts/verification/kitchen-kernel-bootstrap-summary.json",
            ],
            cwd=verifier.ROOT,
            check=False,
        )
        self.assertEqual(0, ignored.returncode)
        self.assertEqual(1, sibling.returncode)
        self.assertEqual(1, nested.returncode)


if __name__ == "__main__":
    unittest.main()
