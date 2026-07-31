"""Regression tests for the cross-vendor (GPT-5.6 Sol) review of Task 5.

Sol's sandbox blocked execution, so it adjudicated the Task 5 diff by reading
the regexes and replaying them mentally — and was right on all three counts
when the orchestrator ran its reproductions. Two were fixed; the third was
accepted and recorded. Each test here pins one of those outcomes.
"""

from __future__ import annotations

import unittest

from tools.claim_detect import find_negative_claims, named_artifacts


class DoubleBacktickSpans(unittest.TestCase):
    """CommonMark writes a literal backtick as `` ` ``. The single-backtick
    pairing mis-paired every later span, merging sentences — which both masked
    real claims and let an unrelated citation drift into a negation's
    refutation window. The corpus carries 373 such spans in 22 files."""

    def test_literal_backtick_span_does_not_mask_a_real_claim(self):
        hits = find_negative_claims(
            "Markdown renders one backtick as `` ` ``. "
            "`missingApi` does not exist. Then use `otherApi`."
        )
        self.assertEqual([h.term for h in hits], ["missingApi"])

    def test_literal_backtick_span_does_not_leak_a_citation_into_the_window(self):
        hits = find_negative_claims(
            "`missingApi` does not exist. "
            "Markdown renders one backtick as `` ` ``. See `unrelated.ts:1`."
        )
        self.assertEqual([h.term for h in hits], ["missingApi"])

    def test_double_backtick_code_span_is_still_masked(self):
        # ``ไม่มี`` displayed inside a double-backtick span is shown, not asserted.
        self.assertEqual(
            find_negative_claims("The marker is written ``ไม่มี`` and `exportDxf` uses it."), []
        )

    def test_plain_single_backtick_artifacts_still_work(self):
        self.assertEqual(named_artifacts("`computePanelCutSize` is here"), ["computePanelCutSize"])


class LongGapThaiAttribution(unittest.TestCase):
    """ระบุ … ว่า with modifiers in between is ordinary Thai report prose.
    The 10-char lookahead flagged it as the author's own claim; 25 covers the
    natural modifier run without surrendering the ordinary-verb recovery."""

    def test_attribution_with_nineteen_char_gap_is_exempt(self):
        self.assertEqual(
            find_negative_claims(
                "รายงานการตรวจสอบระบุอย่างชัดเจนในบทสรุปว่า `tenant_id` ไม่มีใน migration ปัจจุบัน"
            ),
            [],
        )

    def test_ordinary_verb_rabu_with_no_wa_is_still_a_claim(self):
        # M3's recovery must survive the widened window: no ว่า/colon/quote at
        # any distance, so this stays the author's own absence claim.
        hits = find_negative_claims("`git add` ทุกจุดระบุ path รายตัว และไม่มี `git add -A` ในไฟล์ใด")
        self.assertEqual(len(hits), 1)


class AcceptedMarkerImprecision(unittest.TestCase):
    """Sol also showed the four new markers fire on constructed conditional or
    contrastive prose ("If `RetryPolicy` is not located beside the client…").
    Accepted, not fixed: zero corpus incidence today, and guarding them costs
    recall on the recorded failures. This test documents the acceptance — if a
    future change makes these NOT fire, that is fine, and this test asserts
    only that the recorded-failure shapes stay caught."""

    def test_recorded_shapes_stay_caught_regardless(self):
        self.assertTrue(find_negative_claims("No page mentions an `API` at all"))
        self.assertTrue(find_negative_claims("5 skills are behind upstream; `PROVENANCE.md` is not current"))


if __name__ == "__main__":
    unittest.main()
