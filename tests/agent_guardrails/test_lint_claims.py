"""Tests for tools/lint_claims.py — the negative-claim linter (plan Item 1).

`claim_detect` decides what a *claim* is; this linter decides what counts as
*evidence* for one. The three questions the plan leaves open are each pinned by a
test here, because each one is a place where a wrong answer either publishes an
unevidenced claim or teaches people to switch the linter off:

    * multi-artifact sentences  -> every named term must be evidenced
    * proximity                 -> anywhere in the same document
    * fenced evidence comments  -> illustration, never evidence
"""

import io
import sys
import unittest
from contextlib import redirect_stdout
from pathlib import Path

from tools.lint_claims import iter_markdown_files, lint_file, lint_text, main

FIXTURES = Path(__file__).resolve().parent / "fixtures"
REPO_ROOT = Path(__file__).resolve().parents[2]


class TestEvidenceRequirement(unittest.TestCase):
    """The three cases named in the plan's Task 2 Step 1."""

    def test_unevidenced_absence_claim_fails(self):
        self.assertNotEqual(lint_file(FIXTURES / "unevidenced_absence.md"), [])

    def test_evidenced_absence_claim_passes(self):
        self.assertEqual(lint_file(FIXTURES / "evidenced_absence.md"), [])

    def test_evidence_must_match_the_claimed_term(self):
        # A real verify_absence block recording a *different* term is not
        # evidence for this claim. The template calls this a mismatched block and
        # requires it be rejected exactly like a missing one.
        self.assertNotEqual(lint_file(FIXTURES / "mismatched_evidence.md"), [])

    def test_unevidenced_fixture_names_both_claims(self):
        # One finding per sentence, EN and TH alike — the Thai claim is not a
        # second-class citizen of the corpus.
        findings = lint_file(FIXTURES / "unevidenced_absence.md")
        self.assertEqual([f.term for f in findings], ["computePanelCutSize", "ADR-065"])

    def test_message_is_the_format_the_plan_specifies(self):
        findings = lint_file(FIXTURES / "unevidenced_absence.md")
        self.assertEqual(
            str(findings[0]),
            "tests/agent_guardrails/fixtures/unevidenced_absence.md:3: "
            "unevidenced absence claim about 'computePanelCutSize'",
        )


class TestMultipleArtifactsInOneSentence(unittest.TestCase):
    """Design decision: partial evidence is not evidence.

    A `Hit` carries `term` (the first artifact) and `terms` (all of them). If one
    evidence block licensed a sentence naming three artifacts, the cheapest way
    to publish two unevidenced claims would be to write them beside an evidenced
    one — which is the exact failure the guardrail exists to stop. Requiring all
    of them fails closed, and the cost of a false fail is one more paste.
    """

    CLAIM = "`alpha_one` and `beta_two` are absent.\n"

    def test_evidence_for_only_one_of_two_terms_still_fails(self):
        text = self.CLAIM + "\n<!-- verify_absence: alpha_one @ 2026-07-21 -->\n"
        self.assertNotEqual(lint_text(text), [])

    def test_the_reported_term_is_the_one_still_lacking_evidence(self):
        text = self.CLAIM + "\n<!-- verify_absence: alpha_one @ 2026-07-21 -->\n"
        findings = lint_text(text)
        self.assertEqual([f.term for f in findings], ["beta_two"])

    def test_one_finding_per_sentence_even_when_several_terms_lack_evidence(self):
        # Counting per sentence is what keeps the Task 6 allowlist counts stable
        # when a sentence is reworded; claim_detect makes the same choice.
        self.assertEqual(len(lint_text(self.CLAIM)), 1)

    def test_evidence_for_every_term_passes(self):
        text = (
            self.CLAIM
            + "\n<!-- verify_absence: alpha_one @ 2026-07-21 -->\n"
            + "\n<!-- verify_absence: beta_two @ 2026-07-21 -->\n"
        )
        self.assertEqual(lint_text(text), [])


class TestProximity(unittest.TestCase):
    """Design decision: document scope, not adjacency.

    The template asks an author to put the block directly after the claiming
    paragraph, but that is guidance to a human writer. Enforcing distance in the
    linter would make every reorganisation of a document a lint failure, which is
    how a linter earns its way into a disable comment. Term match is the
    discriminator; distance is not.
    """

    def test_blank_line_between_comment_and_fence_is_tolerated(self):
        # The template mandates exactly this shape: comment, blank line, fence.
        text = (
            "`computePanelCutSize` is not implemented anywhere.\n"
            "\n"
            "<!-- verify_absence: computePanelCutSize @ 2026-07-21 -->\n"
            "\n"
            "```\n"
            "RESULT: NOT LOCATED by any method above.\n"
            "```\n"
        )
        self.assertEqual(lint_text(text), [])

    def test_evidence_earlier_in_the_document_satisfies_a_later_claim(self):
        text = (
            "<!-- verify_absence: computePanelCutSize @ 2026-07-21 -->\n"
            "\n"
            "# Findings\n"
            "\n"
            + "filler paragraph.\n" * 40
            + "\n`computePanelCutSize` is not implemented anywhere.\n"
        )
        self.assertEqual(lint_text(text), [])

    def test_evidence_in_a_different_document_does_not_satisfy_the_claim(self):
        # Document scope is a decision, not an absence of one. Evidence must
        # travel with the claim it licenses.
        self.assertNotEqual(lint_file(FIXTURES / "unevidenced_absence.md"), [])


class TestFencedEvidenceIsIllustration(unittest.TestCase):
    """Design decision: a comment inside a fence never counts as evidence.

    `claim_detect` masks fenced regions because their contents are displayed, not
    asserted. Reading a fenced comment as evidence would invert that rule inside
    the same feature: a fenced negation would not be a claim, but a fenced
    comment would be proof. It would also hand out free evidence for the literal
    term `TERM` to every document that quotes the format.
    """

    CLAIM = "`computePanelCutSize` is not implemented anywhere.\n\n"
    COMMENT = "<!-- verify_absence: computePanelCutSize @ 2026-07-21 -->\n"

    def test_backtick_fenced_comment_is_not_evidence(self):
        self.assertNotEqual(lint_text(self.CLAIM + "```\n" + self.COMMENT + "```\n"), [])

    def test_tilde_fenced_comment_is_not_evidence(self):
        self.assertNotEqual(lint_text(self.CLAIM + "~~~\n" + self.COMMENT + "~~~\n"), [])

    def test_the_same_comment_outside_a_fence_is_evidence(self):
        # Pins that the test above fails for the fence, not for the wording.
        self.assertEqual(lint_text(self.CLAIM + self.COMMENT), [])

    def test_the_shipped_template_passes(self):
        # docs/_templates/evidence-block.md quotes the comment grammar inside
        # fences and carries one live comment outside them. It must lint clean.
        self.assertEqual(lint_file(REPO_ROOT / "docs" / "_templates" / "evidence-block.md"), [])


class TestCommentGrammar(unittest.TestCase):
    """The grammar is the template's, verbatim. Malformed blocks fail closed."""

    CLAIM = "`computePanelCutSize` is not implemented anywhere.\n\n"

    def test_missing_date_is_not_evidence(self):
        self.assertNotEqual(
            lint_text(self.CLAIM + "<!-- verify_absence: computePanelCutSize -->\n"), []
        )

    def test_non_iso_date_is_not_evidence(self):
        # "Any other ordering does not match and the block counts as missing."
        self.assertNotEqual(
            lint_text(self.CLAIM + "<!-- verify_absence: computePanelCutSize @ 21-07-2026 -->\n"),
            [],
        )

    def test_two_terms_in_one_comment_match_neither_claim(self):
        # The template: writing `TERM_A, TERM_B` captures that literal string,
        # so the block fails closed rather than silently covering both.
        text = (
            "`alpha_one` and `beta_two` are absent.\n\n"
            "<!-- verify_absence: alpha_one, beta_two @ 2026-07-21 -->\n"
        )
        self.assertNotEqual(lint_text(text), [])

    def test_term_may_begin_with_an_at_sign(self):
        # Whitespace around the `@` is required precisely so package names work.
        text = (
            "`@scope/pkg` is not implemented anywhere.\n\n"
            "<!-- verify_absence: @scope/pkg @ 2026-07-21 -->\n"
        )
        self.assertEqual(lint_text(text), [])


class TestFileDiscovery(unittest.TestCase):
    """Both excluded trees hold uncommitted third-party work.

    The plan states the rule; enforcing it in the caller would mean it holds only
    until somebody forgets, so it is enforced here and pinned here.
    """

    def _tree(self) -> Path:
        import tempfile

        root = Path(tempfile.mkdtemp())
        for rel in (
            "keep.md",
            "nested/keep.md",
            "determined-williams/skip.md",
            "nested/worktrees/skip.md",
            "node_modules/skip.md",
            "keep.html",
        ):
            p = root / rel
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text("x", encoding="utf-8")
        self.addCleanup(__import__("shutil").rmtree, root, True)
        return root

    def test_excludes_determined_williams(self):
        found = {p.name for p in iter_markdown_files([self._tree()])}
        self.assertNotIn("skip.md", found)

    def test_excludes_worktrees_at_any_depth(self):
        root = self._tree()
        found = {p.relative_to(root).as_posix() for p in iter_markdown_files([root])}
        self.assertNotIn("nested/worktrees/skip.md", found)

    def test_keeps_markdown_outside_the_excluded_trees(self):
        root = self._tree()
        found = {p.relative_to(root).as_posix() for p in iter_markdown_files([root])}
        self.assertEqual(found, {"keep.md", "nested/keep.md"})

    def test_an_explicitly_named_file_inside_an_excluded_tree_is_refused(self):
        # DECISION REVERSED by the post-implementation review. The original rule
        # ("naming a file is an unambiguous instruction, so lint it") let an
        # explicit argument read third-party content the binding constraint says
        # this tool must never touch — and the same reasoning applied to a named
        # *directory* walked 54,577 files under worktrees/. Exclusion now
        # governs the argument as well as the walk. The CLI refuses loudly with
        # exit 2 (covered in test_review_fixes); the library form returns
        # nothing rather than a third-party path.
        root = self._tree()
        target = root / "determined-williams" / "skip.md"
        self.assertEqual(iter_markdown_files([target]), [])


class TestCli(unittest.TestCase):
    def _run(self, argv: list[str]) -> tuple[int, str]:
        buf = io.StringIO()
        with redirect_stdout(buf):
            code = main(argv)
        return code, buf.getvalue()

    def test_exits_1_and_prints_the_finding_when_a_claim_is_unevidenced(self):
        code, out = self._run([str(FIXTURES / "unevidenced_absence.md")])
        self.assertEqual(code, 1)
        self.assertIn("unevidenced absence claim about 'computePanelCutSize'", out)

    def test_exits_0_when_every_claim_is_evidenced(self):
        code, _ = self._run([str(FIXTURES / "evidenced_absence.md")])
        self.assertEqual(code, 0)

    def test_defaults_to_the_docs_tree(self):
        # Resolved against the repository root, so the default does not depend on
        # the working directory the hook or CI job happens to use.
        from tools.lint_claims import default_paths

        self.assertEqual(default_paths(), [REPO_ROOT / "docs"])

    def test_reports_a_missing_path_rather_than_passing_silently(self):
        code, _ = self._run([str(REPO_ROOT / "no-such-directory")])
        self.assertEqual(code, 2)


class TestInvokedAsAScript(unittest.TestCase):
    """The plan's interface is `python tools/lint_claims.py`, not `-m`.

    Importing the module puts the repository root on `sys.path`; running the file
    puts `tools/` there instead, so `from tools.claim_detect import ...` fails.
    Every test above imports, so none of them can see that — and the hook, the
    pre-commit hook, and the CI job all invoke it the other way.
    """

    def _run(self, args: list[str]):
        import subprocess

        return subprocess.run(
            [sys.executable, str(REPO_ROOT / "tools" / "lint_claims.py"), *args],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            cwd=REPO_ROOT,
        )

    def test_script_invocation_reports_the_finding_and_exits_1(self):
        r = self._run([str(FIXTURES / "unevidenced_absence.md")])
        self.assertNotIn("ModuleNotFoundError", r.stderr)
        self.assertEqual(r.returncode, 1)
        self.assertIn("unevidenced absence claim about 'computePanelCutSize'", r.stdout)

    def test_script_invocation_exits_0_on_an_evidenced_document(self):
        r = self._run([str(FIXTURES / "evidenced_absence.md")])
        self.assertEqual(r.returncode, 0, r.stderr)


if __name__ == "__main__":
    unittest.main()
