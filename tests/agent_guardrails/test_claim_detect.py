"""Sentence-classification tests for tools/claim_detect.py.

The fixtures are drawn from the 2026-07-21 error record and from the documents
that were written to *refute* those errors. The second group matters more: the
refutation documents are the most careful prose in the corpus, and a detector
that fires on them punishes exactly the behaviour the guardrail wants.
"""

import unittest

from tools.claim_detect import (
    find_certifications,
    find_negative_claims,
    named_artifacts,
    split_sentences,
)


class TestNegativeClaims(unittest.TestCase):
    """A negation is a claim only when it names something a search could find."""

    def test_flags_negation_with_named_symbol(self):
        hits = find_negative_claims("`computePanelCutSize` is not implemented anywhere.")
        self.assertEqual(len(hits), 1)
        self.assertEqual(hits[0].term, "computePanelCutSize")

    def test_flags_thai_negation_with_named_symbol(self):
        hits = find_negative_claims("`ADR-065` ไม่มีอยู่ในทั้งสองราก")
        self.assertEqual(len(hits), 1)
        self.assertEqual(hits[0].term, "ADR-065")

    def test_ignores_ordinary_thai_prose(self):
        self.assertEqual(find_negative_claims("ตรวจแล้วไม่มีปัญหาอะไรเพิ่มเติม"), [])

    def test_ignores_negation_without_named_artifact(self):
        self.assertEqual(find_negative_claims("There is no reason to rush this."), [])

    def test_flags_bare_snake_case_symbol(self):
        # tenant_id was one of the seven recorded failures and carries no backticks
        # in the document that got it wrong.
        hits = find_negative_claims("The migration does not exist for tenant_id.")
        self.assertEqual([h.term for h in hits], ["tenant_id"])

    def test_flags_path_artifact(self):
        hits = find_negative_claims("not found in docs/adr/architecture-decisions.md")
        self.assertEqual(len(hits), 1)
        self.assertIn("docs/adr", hits[0].term)

    def test_one_hit_per_sentence_carrying_every_term(self):
        # One finding per sentence keeps the Task 6 allowlist counts stable when a
        # sentence is reworded; `terms` keeps every symbol so --deep can re-run
        # verify_absence on all of them.
        hits = find_negative_claims("`alpha_one` and `beta_two` are absent.")
        self.assertEqual(len(hits), 1)
        self.assertEqual(sorted(hits[0].terms), ["alpha_one", "beta_two"])
        self.assertEqual(hits[0].term, "alpha_one")

    def test_hit_reports_the_line_it_came_from(self):
        text = "intro line\n\n`computePanelCutSize` does not exist.\n"
        hits = find_negative_claims(text)
        self.assertEqual(len(hits), 1)
        self.assertEqual(hits[0].line, 3)


class TestAttributedClaimsAreNotFlagged(unittest.TestCase):
    """Quoting somebody else's claim is not making it.

    Owner decision, 2026-07-21: the documents that record and refute false claims
    tripped the naive detector hardest (71 hits in one such file).
    """

    def test_ignores_negation_after_claimed(self):
        self.assertEqual(
            find_negative_claims("Perplexity claimed `System32Policy` is not implemented."),
            [],
        )

    def test_ignores_negation_after_said(self):
        self.assertEqual(
            find_negative_claims("The agent said `computePanelCutSize` does not exist."),
            [],
        )

    def test_ignores_negation_after_reported(self):
        self.assertEqual(
            find_negative_claims("The audit reported that `tenant_id` is absent."),
            [],
        )

    def test_ignores_negation_inside_quotes(self):
        self.assertEqual(
            find_negative_claims('The transcript reads: "`ADR-065` does not exist".'),
            [],
        )

    def test_ignores_thai_attribution_ang_wa(self):
        self.assertEqual(
            find_negative_claims("Perplexity อ้างว่า `System32Policy` ไม่มีในโค้ด"),
            [],
        )

    def test_ignores_thai_attribution_rabu_wa(self):
        self.assertEqual(
            find_negative_claims("รายงานระบุว่า `computePanelCutSize` ไม่พบในสองราก"),
            [],
        )

    def test_still_flags_an_unattributed_claim_in_the_same_document(self):
        # The suppression must be sentence-scoped, not document-scoped, or a single
        # "claimed" near the top of a file would disarm the whole file.
        text = (
            "Perplexity claimed `System32Policy` is not implemented.\n"
            "`computePanelCutSize` does not exist.\n"
        )
        self.assertEqual([h.term for h in find_negative_claims(text)], ["computePanelCutSize"])


class TestRefutedClaimsAreNotFlagged(unittest.TestCase):
    """A negation answered by evidence is a refutation, not an unevidenced claim."""

    def test_ignores_negation_refuted_by_file_line_in_same_sentence(self):
        self.assertEqual(
            find_negative_claims("`System32Policy` is not implemented — refuted at policy.ts:150"),
            [],
        )

    def test_ignores_negation_refuted_in_the_next_sentence(self):
        text = "`ADR-065` does not exist. It is at architecture-decisions.md:694."
        self.assertEqual(find_negative_claims(text), [])

    def test_ignores_negation_refuted_by_commit_sha(self):
        self.assertEqual(
            find_negative_claims("`tenant_id` is absent. Added in 4f9c2a1e."),
            [],
        )

    def test_ignores_negation_with_refuted_marker(self):
        self.assertEqual(
            find_negative_claims("`computePanelCutSize` is not implemented — REFUTED"),
            [],
        )

    def test_ignores_negation_with_contradicted_marker(self):
        self.assertEqual(
            find_negative_claims("CONTRADICTED: `ADR-065` ไม่มีอยู่จริง"),
            [],
        )

    def test_evidence_two_sentences_later_does_not_count(self):
        # "same or next sentence" is the decided window; a file:line at the far end
        # of a long document is not an answer to this claim.
        text = "`ADR-065` does not exist. Some unrelated remark. It is at register.md:694."
        self.assertEqual([h.term for h in find_negative_claims(text)], ["ADR-065"])


class TestCertifications(unittest.TestCase):
    def test_flags_certification(self):
        hits = find_certifications("The `rm -rf` guard is safe.")
        self.assertEqual(len(hits), 1)

    def test_flags_thai_certification(self):
        hits = find_certifications("`exportDxf` ทำงานเรียบร้อย")
        self.assertEqual(len(hits), 1)
        self.assertEqual(hits[0].term, "exportDxf")

    def test_ignores_certification_without_named_artifact(self):
        self.assertEqual(find_certifications("Everything is safe now."), [])

    def test_ignores_attributed_certification(self):
        self.assertEqual(
            find_certifications("The vendor claimed `exportDxf` is safe."),
            [],
        )

    def test_flags_certification_backed_only_by_a_file_reference(self):
        # A file:line is evidence that something *exists*; it is not an adversarial
        # check. Task 3 requires an adversary marker, so a citation must not silence
        # a certification the way it silences a negation.
        hits = find_certifications("`exportDxf` passes. See exporter.ts:88.")
        self.assertEqual(len(hits), 1)


class TestCorpusMeasuredFalsePositives(unittest.TestCase):
    """Every case here was found by hand-inspecting real hits on 2026-07-21.

    The first measurement scored 55% ordinary prose on negative claims and 92% on
    certifications, both far past the point where a linter gets switched off. Each
    test below pins one of the rules that brought those numbers down, with the
    document it came from named so a future loosening can be argued against the
    original text.
    """

    # --- Thai substring collisions: there are no word boundaries to protect us ---

    def test_thai_without_is_not_an_absence_claim(self):
        # "โดยไม่มี" = "without". monolith-vendor-standards-evidence-ledger.th.md:210
        # states a rule; it asserts nothing about whether an artifact exists.
        self.assertEqual(
            find_negative_claims("ห้ามแปลง `VENDOR CLAIM` เป็น `VERIFIED FACT` โดยไม่มีภาระงาน"),
            [],
        )

    def test_thai_relative_without_is_not_an_absence_claim(self):
        # "ที่ไม่มีสิทธิ์" = "that one has no rights to". ADR-002-component-master-schema.th.md:36
        self.assertEqual(find_negative_claims("`symbols` ไม่ฝัง artwork ที่ไม่มีสิทธิ์"), [])

    def test_khat_inside_decisive_is_not_a_shortfall(self):
        # ชี้ขาด = "decisive" and merely contains ขาด ("lacking").
        # homag-reference-corrections.md:64
        self.assertEqual(find_negative_claims("`SmartWOP` คือหลักฐานชี้ขาด"), [])

    def test_safety_noun_is_not_a_certification(self):
        # ความปลอดภัย = "safety" (the noun), not "is safe".
        # monolith-repository-production-readiness-baseline.th.md:244
        self.assertEqual(find_certifications("รายการรีวิวด้านความปลอดภัยของ `policy.ts`"), [])

    def test_thai_comparative_clean_is_not_a_certification(self):
        # "แบบสะอาดกว่า" = "a cleaner alternative". homag-interop-contract.md:549
        self.assertEqual(find_certifications("นี่คือทางเลือกแทน `.hol` แบบสะอาดกว่า"), [])

    # --- Code and labels are displayed, not asserted ---

    def test_marker_inside_backticks_is_not_a_claim(self):
        # interior-design-studio-system-b-core-implementation.md:320 shows expected
        # program output. The word is data, not an assertion by the author.
        self.assertEqual(find_negative_claims("Expected: `missing []` from `run_check`."), [])

    def test_marker_inside_a_fenced_code_block_is_not_a_claim(self):
        # A pasted verify_absence block literally contains "does not exist" in its
        # wording guidance. Flagging the evidence would be perverse.
        text = "Intro.\n\n```\nRESULT: `ADR-065` does not exist\n```\n"
        self.assertEqual(find_negative_claims(text), [])

    def test_verified_as_a_label_is_not_a_certification(self):
        # "VERIFIED FACT" is this corpus's evidence-grade taxonomy, used as a table
        # cell. kitchen-master-gap-analysis.en.md:88
        self.assertEqual(find_certifications("| E-18 | VERIFIED FACT | `NI` is Nickel |"), [])

    def test_verified_by_is_still_a_certification(self):
        # The tightening must not swallow the real form.
        # design-to-production-engineering-playbook.en.md:716
        hits = find_certifications("`exportDxf` verified by search over post/dialects/.")
        self.assertEqual(len(hits), 1)

    def test_passes_as_an_ordinary_verb_is_not_a_certification(self):
        # "0 when caller passes 0" — passing an argument.
        # design-to-production-engineering-playbook.en.md:135
        self.assertEqual(find_certifications("`Cabinet.ts` returns 0 when caller passes 0."), [])

    def test_passes_about_a_test_suite_is_still_a_certification(self):
        hits = find_certifications("`exportDxf` passes all tests.")
        self.assertEqual(len(hits), 1)

    def test_attributive_thai_safe_is_not_a_certification(self):
        # "ที่ปลอดภัย" = "that is safe" used as a modifier — describing a goal or a
        # requirement, not certifying a result. homag-interop-contract.md:480
        self.assertEqual(
            find_certifications("ค่าที่ใส่ต้องเป็น filename ที่ปลอดภัยต่อการ concat กับ `UNC path`"),
            [],
        )

    def test_a_question_is_not_a_certification(self):
        # "…ได้อย่างปลอดภัยหรือไม่" = "…safely, or not?" — a review question heading.
        # ima-schelling-monolith-repository-scope-correction.th.md:95
        self.assertEqual(
            find_certifications("`site_code` แทน tenant ได้อย่างปลอดภัยหรือไม่"),
            [],
        )

    def test_an_english_question_is_not_a_certification(self):
        self.assertEqual(find_certifications("So the `rm -rf` guard is safe?"), [])

    # --- Claims that are already answered ---

    def test_denied_certification_is_not_a_certification(self):
        # "does not prove the code is correct, safe, or production-ready" is the
        # opposite of certifying it. ima-audit-independent-claim-verification.th.md:237
        self.assertEqual(find_certifications("ไม่ได้พิสูจน์ว่า `src/cnc` ปลอดภัย"), [])

    def test_thai_attribution_without_wa_particle(self):
        # "รายงานระบุ:" = "the report states:" — attribution with a colon rather
        # than the ว่า particle. ima-audit-independent-claim-verification.th.md:71
        self.assertEqual(
            find_negative_claims("**รายงานระบุ:** `apps/` ไม่มี runtime implementation"),
            [],
        )

    def test_citation_earlier_in_the_row_still_refutes(self):
        # Markdown tables put the citation column before the finding column, so a
        # "followed by" reading of the refutation rule misses every review table in
        # the corpus. plans-review-worktree-review-pr31.th.md:80
        self.assertEqual(find_negative_claims("| **B** | `en.md:47-53` | Task 5 ไม่มี lane |"), [])


class TestSentenceSplitting(unittest.TestCase):
    """Thai writes no full stop and no inter-word space; the splitter must not
    assume English punctuation is present."""

    def test_splits_on_full_stop_followed_by_space(self):
        self.assertEqual(len(split_sentences("One thing. Another thing.")), 2)

    def test_does_not_split_inside_a_dotted_identifier(self):
        self.assertEqual(len(split_sentences("See policy.ts:150 for the guard.")), 1)

    def test_splits_thai_on_newline_and_middle_dot(self):
        parts = split_sentences("ตรวจแล้ว · เรียบร้อย\nบรรทัดถัดไป")
        self.assertEqual(len(parts), 3)

    def test_splits_on_em_dash(self):
        self.assertEqual(len(split_sentences("claim here — evidence there")), 2)


class TestNamedArtifacts(unittest.TestCase):
    def test_backticked_span(self):
        self.assertEqual(named_artifacts("a `foo bar` b"), ["foo bar"])

    def test_adr_id(self):
        self.assertEqual(named_artifacts("see ADR-065 please"), ["ADR-065"])

    def test_camel_case_token(self):
        self.assertEqual(named_artifacts("call computePanelCutSize now"), ["computePanelCutSize"])

    def test_screaming_case_token(self):
        self.assertEqual(named_artifacts("the CP_DATABASE constant"), ["CP_DATABASE"])

    def test_short_tokens_and_plain_words_are_not_artifacts(self):
        self.assertEqual(named_artifacts("the api is a big thing"), [])

    def test_ordinary_thai_has_no_artifact(self):
        self.assertEqual(named_artifacts("ตรวจแล้วไม่มีปัญหาอะไรเพิ่มเติม"), [])


if __name__ == "__main__":
    unittest.main()
