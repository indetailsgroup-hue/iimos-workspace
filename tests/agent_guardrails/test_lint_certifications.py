"""Tests for tools/lint_certifications.py.

The linter's whole value is being hard to satisfy without doing the work. Most
of these tests are therefore about what is *rejected*: a code sample, a list of
commands with no output, a placeholder label, evidence sitting in a different
section of the document. A linter that accepts any fenced block is theatre, and
theatre is worse than nothing because it converts "nobody checked" into "the
check passed".
"""

import io
import os
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from tempfile import TemporaryDirectory

from tools.lint_certifications import (
    EXCLUDED_DIR_NAMES,
    WINDOW_LINES,
    collect_files,
    lint_file,
    lint_text,
    main,
)

FIXTURES = Path(__file__).resolve().parent / "fixtures"

BARE = FIXTURES / "bare_certification.md"
ADVERSARY = FIXTURES / "adversary_backed_certification.md"
COMMAND = FIXTURES / "command_backed_certification.md"


def write(root: Path, rel: str, text: str) -> Path:
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")
    return p


class TestPlanContract(unittest.TestCase):
    """The three assertions Task 3 Step 1 specifies, verbatim in intent."""

    def test_bare_certification_fails(self):
        self.assertNotEqual(lint_file(BARE), [])

    def test_certification_with_adversary_marker_passes(self):
        self.assertEqual(lint_file(ADVERSARY), [])

    def test_certification_with_command_output_passes(self):
        self.assertEqual(lint_file(COMMAND), [])


class TestFindingShape(unittest.TestCase):
    def test_reports_path_line_and_the_required_phrase(self):
        findings = lint_file(BARE)
        first = findings[0]
        self.assertTrue(
            str(first).startswith(f"{BARE}:{first.line}: uncorroborated certification"),
            str(first),
        )

    def test_reports_both_the_english_and_the_thai_certification(self):
        # The corpus is bilingual; a linter that only reads English would pass
        # half of it silently.
        self.assertEqual(sorted(f.line for f in lint_file(BARE))[:2], [3, 5])

    def test_carries_the_marker_that_made_it_a_certification(self):
        by_line = {f.line: f for f in lint_file(BARE)}
        self.assertEqual(by_line[3].marker, "is safe")
        self.assertEqual(by_line[5].marker, "ปลอดภัย")

    def test_document_with_no_certification_yields_nothing(self):
        self.assertEqual(lint_text("Ordinary prose about `exportDxf` and its callers."), [])


class TestAdversaryMarkerProximity(unittest.TestCase):
    """Evidence binds by line distance, and the boundary is tested from both sides."""

    def test_marker_directly_below_corroborates(self):
        text = "`exportDxf` is safe.\n\n<!-- adversary: fed it a zero-length panel list -->\n"
        self.assertEqual(lint_text(text), [])

    def test_marker_directly_above_corroborates(self):
        text = "<!-- adversary: fed it a zero-length panel list -->\n\n`exportDxf` is safe.\n"
        self.assertEqual(lint_text(text), [])

    def test_marker_at_the_window_boundary_corroborates(self):
        text = "`exportDxf` is safe.\n" + "\n" * (WINDOW_LINES - 1)
        text += "<!-- adversary: fed it a zero-length panel list -->\n"
        self.assertEqual(lint_text(text), [])

    def test_marker_one_line_past_the_window_does_not_corroborate(self):
        text = "`exportDxf` is safe.\n" + "\n" * WINDOW_LINES
        text += "<!-- adversary: fed it a zero-length panel list -->\n"
        self.assertNotEqual(lint_text(text), [])

    def test_thai_label_is_accepted(self):
        text = "`exportDxf` is safe.\n\n<!-- adversary: ลองยิงพาเนลว่างแล้วมันปฏิเสธ -->\n"
        self.assertEqual(lint_text(text), [])

    def test_placeholder_label_is_not_evidence(self):
        for label in ("TODO", "tbd", "n/a", "none", "done", "-"):
            with self.subTest(label=label):
                text = f"`exportDxf` is safe.\n\n<!-- adversary: {label} -->\n"
                self.assertNotEqual(lint_text(text), [])

    def test_empty_label_is_not_evidence(self):
        self.assertNotEqual(lint_text("`exportDxf` is safe.\n\n<!-- adversary: -->\n"), [])

    def test_too_short_a_label_is_not_evidence(self):
        self.assertNotEqual(lint_text("`exportDxf` is safe.\n\n<!-- adversary: ok fine -->\n"), [])


class TestCommandBlockEvidence(unittest.TestCase):
    """A fenced block counts only when it shows a command *and* what it printed."""

    def test_command_with_output_is_evidence(self):
        text = (
            "`exportDxf` is safe.\n\n"
            "```console\n"
            "$ python tools/verify_absence.py exportDxf\n"
            "RESULT: FOUND — an absence claim about this term is REFUTED.\n"
            "```\n"
        )
        self.assertEqual(lint_text(text), [])

    def test_bare_runner_invocation_without_a_prompt_is_a_command(self):
        text = (
            "`exportDxf` is safe.\n\n"
            "```\n"
            "python -m unittest discover -s tests -t .\n"
            "Ran 87 tests in 1.2s\n"
            "OK\n"
            "```\n"
        )
        self.assertEqual(lint_text(text), [])

    def test_code_sample_block_is_not_evidence(self):
        # The permissive failure: pasting any code block satisfies the linter.
        text = (
            "`exportDxf` is safe.\n\n"
            "```python\n"
            "def exportDxf(panels):\n"
            "    return render(panels)\n"
            "```\n"
        )
        self.assertNotEqual(lint_text(text), [])

    def test_quoted_document_block_is_not_evidence(self):
        text = (
            "`exportDxf` is safe.\n\n"
            "```text\n"
            "The exporter was reviewed on 2026-07-20 and looked fine to everyone.\n"
            "No further action was recorded.\n"
            "```\n"
        )
        self.assertNotEqual(lint_text(text), [])

    def test_commands_with_no_output_are_not_evidence(self):
        # An install/how-to block is all invocation and no result.
        text = (
            "`exportDxf` is safe.\n\n"
            "```bash\n"
            "python -m venv .venv\n"
            "python -m unittest discover -s tests -t .\n"
            "```\n"
        )
        self.assertNotEqual(lint_text(text), [])

    def test_a_continued_command_line_is_not_its_own_output(self):
        text = (
            "`exportDxf` is safe.\n\n"
            "```bash\n"
            "python tools/change_budget.py check --root . \\\n"
            "    --expect \"docs/plans/*.md\"\n"
            "```\n"
        )
        self.assertNotEqual(lint_text(text), [])

    def test_prose_beginning_with_a_runner_word_is_not_a_command(self):
        # Found by probing this linter before trusting it: `go`, `find`, `set`
        # and `make` are ordinary English sentence openers as well as programs,
        # so "first token is a known runner" alone let a quoted document through.
        text = (
            "`exportDxf` is safe.\n\n"
            "```text\n"
            "Go through the exporter and it looks fine to everyone.\n"
            "Nobody recorded an attack on it.\n"
            "```\n"
        )
        self.assertNotEqual(lint_text(text), [])

    def test_imperative_prose_beginning_with_a_runner_word_is_not_a_command(self):
        text = (
            "`exportDxf` is safe.\n\n"
            "```text\n"
            "Find the exporter module first.\n"
            "Then read the review notes.\n"
            "```\n"
        )
        self.assertNotEqual(lint_text(text), [])

    def test_a_shell_how_to_block_is_not_evidence(self):
        # The real one: docs/reports/2026-07-21-monolith-repository-production-
        # readiness-baseline.en.md:214 is a pure command list with no output, and
        # the first version of this linter accepted it — `cd determined-williams`
        # is not in the runner allowlist, so it read as output for the `git` line
        # above it. Running the linter over the corpus found this; reasoning
        # about it did not.
        text = (
            "`exportDxf` is safe.\n\n"
            "```bash\n"
            "# Parent shell\n"
            "git rev-parse --abbrev-ref HEAD; git status --porcelain | wc -l\n"
            "\n"
            "# Nested product\n"
            "cd determined-williams\n"
            "git ls-files | wc -l\n"
            "```\n"
        )
        self.assertNotEqual(lint_text(text), [])

    def test_prompted_block_with_no_output_is_not_evidence(self):
        text = (
            "`exportDxf` is safe.\n\n"
            "```console\n"
            "$ npm install\n"
            "$ npm test\n"
            "```\n"
        )
        self.assertNotEqual(lint_text(text), [])

    def test_block_one_line_past_the_window_does_not_corroborate(self):
        text = "`exportDxf` is safe.\n" + "\n" * WINDOW_LINES
        text += "```console\n$ python tools/verify_absence.py exportDxf\nRESULT: FOUND\n```\n"
        self.assertNotEqual(lint_text(text), [])

    def test_unterminated_fence_is_not_evidence(self):
        text = "`exportDxf` is safe.\n\n```console\n$ python tools/verify_absence.py exportDxf\n"
        self.assertNotEqual(lint_text(text), [])


class TestFileCollection(unittest.TestCase):
    def test_never_walks_determined_williams(self):
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            write(root, "docs/kept.md", "x\n")
            write(root, "determined-williams/docs/nested.md", "x\n")
            self.assertEqual(
                [p.name for p in collect_files([root])],
                ["kept.md"],
            )

    def test_never_walks_worktrees(self):
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            write(root, "docs/kept.md", "x\n")
            write(root, "worktrees/review-pr31/docs/nested.md", "x\n")
            self.assertEqual([p.name for p in collect_files([root])], ["kept.md"])

    def test_explicit_path_inside_an_excluded_directory_is_skipped(self):
        # "never walk" has to mean never, or naming the path is the bypass.
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            nested = write(root, "worktrees/review-pr31/docs/nested.md", "x\n")
            self.assertEqual(collect_files([nested]), [])

    def test_collects_only_markdown(self):
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            write(root, "docs/kept.md", "x\n")
            write(root, "docs/rendered.html", "x\n")
            self.assertEqual([p.name for p in collect_files([root])], ["kept.md"])

    def test_excluded_names_include_both_required_directories(self):
        self.assertIn("determined-williams", EXCLUDED_DIR_NAMES)
        self.assertIn("worktrees", EXCLUDED_DIR_NAMES)


class TestCli(unittest.TestCase):
    def run_main(self, argv):
        buf = io.StringIO()
        with redirect_stdout(buf), redirect_stderr(io.StringIO()):
            code = main(argv)
        return code, buf.getvalue()

    def test_exit_1_and_prints_the_finding_for_the_bare_fixture(self):
        code, out = self.run_main([str(BARE)])
        self.assertEqual(code, 1)
        self.assertIn("uncorroborated certification", out)

    def test_exit_0_for_the_adversary_backed_fixture(self):
        code, out = self.run_main([str(ADVERSARY)])
        self.assertEqual(code, 0)
        self.assertNotIn("uncorroborated certification", out)

    def test_exit_0_for_the_command_backed_fixture(self):
        code, _ = self.run_main([str(COMMAND)])
        self.assertEqual(code, 0)

    def test_exit_2_for_a_path_that_does_not_exist(self):
        code, _ = self.run_main([str(FIXTURES / "no_such_file.md")])
        self.assertEqual(code, 2)

    def test_defaults_to_docs(self):
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            write(root, "docs/clean.md", "Ordinary prose about `exportDxf`.\n")
            write(root, "elsewhere/dirty.md", "`exportDxf` is safe.\n")
            cwd = os.getcwd()
            os.chdir(root)
            try:
                code, out = self.run_main([])
            finally:
                os.chdir(cwd)
        self.assertEqual(code, 0)
        self.assertNotIn("dirty.md", out)


if __name__ == "__main__":
    unittest.main()
