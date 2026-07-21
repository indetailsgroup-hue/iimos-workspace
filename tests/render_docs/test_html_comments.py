"""Regression tests for the HTML-comment branch in tools/render_docs.py.

The branch exists so that machine-readable evidence markers
(`<!-- verify_absence: TERM @ DATE -->`) survive rendering instead of being
escaped into visible prose. Its first implementation scanned forward for `-->`
with no bound, which meant a single dropped `-->` — an ordinary typo in
hand-authored markup — silently deleted every heading, table and paragraph
after it. Exit code stayed 0 and an .html file was still produced, so nothing
announced the loss.

Both failure modes below were found by review rather than by a test. That is
the reason this file exists: the corpus is about to gain hand-written comments
in every document that carries an evidence block, so this input class goes from
rare to routine.
"""

from __future__ import annotations

import unittest

from tools.render_docs import render


class UnterminatedComment(unittest.TestCase):
    """An unterminated comment must cost one ugly line, not the document."""

    def test_does_not_swallow_the_rest_of_the_document(self):
        out = render(
            "# Doc\n\n"
            "<!-- verify_absence: FOO @ 2026-07-21\n\n"   # note: no -->
            "## Section Two\n\n"
            "Body paragraph here.\n\n"
            "| a | b |\n|---|---|\n| 1 | 2 |\n"
        )
        self.assertIn("<h1>Doc</h1>", out)
        self.assertIn("<h2>Section Two</h2>", out)
        self.assertIn("<p>Body paragraph here.</p>", out)
        self.assertIn("<table>", out)

    def test_does_not_bury_the_next_block_inside_a_real_comment(self):
        """The nastier variant: the scan finds the *next* block's `-->`.

        `re.fullmatch` then succeeds across the whole span and the swallowed
        region is emitted as a genuine HTML comment — invisible rather than
        merely ugly — while the second marker is mangled by the `--` stripper,
        destroying the very thing the linter downstream has to parse.
        """
        out = render(
            "<!-- verify_absence: FIRST @ 2026-07-21\n\n"  # note: no -->
            "## Hidden Heading\n\n"
            "<!-- verify_absence: SECOND @ 2026-07-21 -->\n"
        )
        self.assertIn("<h2>Hidden Heading</h2>", out)
        self.assertIn("<!-- verify_absence: SECOND @ 2026-07-21 -->", out)


class WellFormedComment(unittest.TestCase):
    """The fix must not cost the behaviour the branch was added for."""

    def test_single_line_marker_becomes_a_real_comment(self):
        out = render("<!-- verify_absence: computeEdgebandAllowance @ 2026-07-21 -->\n")
        self.assertIn("<!-- verify_absence: computeEdgebandAllowance @ 2026-07-21 -->", out)
        self.assertNotIn("&lt;!--", out)

    def test_multi_line_comment_is_still_supported(self):
        out = render("<!--\nverify_absence: FOO @ 2026-07-21\n-->\n\n# After\n")
        self.assertIn("<!--", out)
        self.assertIn("<h1>After</h1>", out)

    def test_comment_inside_a_fence_stays_escaped(self):
        """The fence branch runs first, so illustrations of the format render
        as illustrations rather than disappearing into a comment."""
        out = render("```\n<!-- verify_absence: foo @ 2026-07-21 -->\n```\n")
        self.assertIn("<pre><code>&lt;!--", out)

    def test_trailing_visible_text_is_not_hidden(self):
        out = render("<!-- a --> LEAKED\n")
        self.assertIn("<p>&lt;!-- a --&gt; LEAKED</p>", out)


class Injection(unittest.TestCase):
    def test_body_cannot_carry_markup_out_of_the_comment(self):
        out = render("<!-- <script>alert(1)</script> -->\n")
        self.assertNotIn("<script>", out)


if __name__ == "__main__":
    unittest.main()
