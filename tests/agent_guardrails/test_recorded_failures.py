"""Regression corpus — the 2026-07-21 recorded errors, made permanently non-repeatable.

Task 5 owns detector *tuning*. The contract: every recorded error is either
caught by the shape detectors or listed here as explicitly out of scope with a
one-line reason. **Nothing is deleted from the corpus to make the suite green.**

Provenance of the wording
-------------------------
Each `fixtures/recorded/<name>.md` holds the exact recorded/published sentence.
The shape probes are the strings the orchestrator measured (progress.md finding
O-2); the wording traces to
`docs/reports/2026-07-21-monolith-repository-production-readiness-baseline.en.md` §1,
`docs/research/2026-07-21-monolith-vendor-standards-evidence-ledger.en.md` §6, and
`docs/research/competitors/pplx-corpus-errata.md`.

The twelve recorded errors are the ten shape probes plus the two the plan flags
as likely out of scope — the "one hour" estimate and the wrong-shadowing warning.
The 431 test-file *count* error is included additionally, per the Task 5
instruction to decide whether a count-claim is in scope for a shape detector.

Starting state (orchestrator O-2, reproduced before tuning): of the ten shape
probes, `no_api`, `tapio`, `skills_behind` and `only_touched` MISS; the other six
HIT. Tuning closes those four.
"""

import unittest
from pathlib import Path

from tools.claim_detect import (
    find_certifications,
    find_negative_claims,
    named_artifacts,
)
from tools import lint_claims

RECORDED_DIR = Path(__file__).resolve().parent / "fixtures" / "recorded"
REPO_ROOT = Path(__file__).resolve().parents[2]
TEMPLATE = REPO_ROOT / "docs" / "_templates" / "evidence-block.md"


def _fixture(name: str) -> str:
    return (RECORDED_DIR / f"{name}.md").read_text(encoding="utf-8")


def _detect(text: str, kind: str):
    if kind == "negative":
        return find_negative_claims(text)
    if kind == "certification":
        return find_certifications(text)
    # count / estimate / warning: no dedicated detector — try both, to prove the
    # shape detectors genuinely do not model these classes.
    return find_negative_claims(text) + find_certifications(text)


# (name, kind, in_scope, reason). `reason` documents the out-of-scope call.
RECORDED = [
    # --- ten shape probes: negation + certification ---
    ("adr_065",       "negative",      True,  "baseline §1 / working notes"),
    ("cut_size",      "negative",      True,  "pplx-corpus-errata §3 (StructuralCheck absence pattern)"),
    ("no_api",        "negative",      True,  "evidence-ledger §6 row 3 'HOMAG publishes no API'"),
    ("dxf_th",        "negative",      True,  "evidence-ledger §2.3 / baseline §4 DXF posture"),
    ("skills_behind", "negative",      True,  "session working notes: skills/PROVENANCE staleness"),
    ("tapio",         "negative",      True,  "evidence-ledger §6 row 2 'No production-zone ... mentions tapio'"),
    ("rm_guard",      "certification", True,  "baseline §1 / lint_certifications rationale"),
    ("only_touched",  "certification", True,  "change_budget territory: 'only my files were touched'"),
    ("gate_shadow",   "certification", True,  "session working notes: settings.json gate"),
    ("tests_pass",    "certification", True,  "session working notes: cix.ts post-processor"),
    # --- count claim, additionally included per Task 5 instruction ---
    ("test_count",    "count",         False,
     "OUT OF SCOPE: a positive count-claim ('431 ... exist') is neither an "
     "absence-of-a-named-artifact nor a safety/pass certification. Catching it "
     "needs a third detector class (count-claims), which would fire on every "
     "number in the corpus; the two shape classes deliberately do not model it."),
    # --- the two non-shape errors the plan names as likely out of scope ---
    ("one_hour",      "estimate",      False,
     "OUT OF SCOPE: an unevidenced effort/time estimate ('a one-hour job'). "
     "Neither a negation nor a certification; no shape a linter can key on. "
     "homag-official-product-reference.md:235."),
    ("wrong_shadow",  "warning",       False,
     "OUT OF SCOPE: a 'shadowing' defect-warning asserts X overrides Y — a third "
     "shape, neither absence nor certification. Shape-faithful reconstruction of a "
     "chat/working-note warning (no single committed source line)."),
]


class TestRecordedCorpus(unittest.TestCase):
    """The corpus contract, driven off the fixture files."""

    def test_every_in_scope_recorded_failure_is_caught(self):
        missed = [
            name for name, kind, in_scope, _ in RECORDED
            if in_scope and not _detect(_fixture(name), kind)
        ]
        self.assertEqual(missed, [], f"regression corpus not caught: {missed}")

    def test_the_four_originally_missed_probes_are_the_ones_tuning_closes(self):
        # Documents the delta: these four MISSed before Task 5 (O-2) and are the
        # reason the detector was tuned. Catching them is the whole task.
        for name in ("no_api", "tapio", "skills_behind", "only_touched"):
            kind = next(k for n, k, *_ in RECORDED if n == name)
            with self.subTest(name=name):
                self.assertTrue(_detect(_fixture(name), kind),
                                f"{name} must be caught after tuning")

    def test_out_of_scope_errors_are_documented_and_remain_uncaught(self):
        # The boundary. Each carries a substantive reason and must stay uncaught,
        # or the reason has gone stale.
        for name, kind, in_scope, reason in RECORDED:
            if in_scope:
                continue
            with self.subTest(name=name):
                self.assertTrue(len(reason) > 30, "reason must be substantive")
                self.assertEqual(_detect(_fixture(name), kind), [],
                                 f"{name} is documented out of scope but was caught")

    def test_every_recorded_error_has_a_fixture_file(self):
        for name, *_ in RECORDED:
            with self.subTest(name=name):
                self.assertTrue((RECORDED_DIR / f"{name}.md").is_file())


# M1 — O-4: the sanctioned "not located" wording must be inspected, and the
# shipped template must pass its own linter HONESTLY, not vacuously.
class TestM1NotLocatedMarker(unittest.TestCase):
    def test_not_located_is_a_negation_marker(self):
        hits = find_negative_claims("`computePanelCutSize` was not located in 2 root(s).")
        self.assertEqual([h.term for h in hits], ["computePanelCutSize"])

    def test_template_produces_a_claim_and_still_passes_lint_claims(self):
        text = TEMPLATE.read_text(encoding="utf-8")
        # HONEST, not vacuous: its worked-example claim is detected...
        self.assertGreaterEqual(
            len(find_negative_claims(text)), 1,
            "the sanctioned 'not located' wording must be detected in the template")
        # ...and satisfied by the template's own evidence block.
        self.assertEqual(
            lint_claims.lint_text(text), [],
            "the template's own evidence block must satisfy its own claim")


# M2 — a false positive captured from the wild: a UI message quoted inside an
# inline-code span. The negation is displayed, not asserted.
GROOVE = (
    "Before export and again inside the NFP export dialog, the runner recorded exactly one "
    "visible code `GROOVE_MACHINING_RECIPE_REQUIRED` with the full message "
    "`Qualified groove-machining recipe required / ยังไม่มีสูตรกัดร่องที่ผ่าน qualification: "
    "Nominal geometry does not define cutter, passes, feed/speed, compensation, datum transfer, "
    "inspection method or machine post. No groove operation is emitted.`"
)


class TestM2InlineCodeMarkers(unittest.TestCase):
    def test_the_fixture_holds_the_exact_sentence(self):
        self.assertIn(GROOVE, _fixture("m2_inline_code_ui_message"))

    def test_negation_marker_inside_an_inline_code_span_does_not_fire(self):
        self.assertEqual(find_negative_claims(GROOVE), [])
        self.assertEqual(find_certifications(GROOVE), [])

    def test_named_artifact_in_backticks_still_counts(self):
        # The distinction M2 draws: MARKERS inside inline code are muted, but a
        # named ARTIFACT written in backticks is exactly how artifacts are written.
        self.assertIn("GROOVE_MACHINING_RECIPE_REQUIRED", named_artifacts(GROOVE))


# M3 — the Task 1 review survivor. Thai ระบุ / อ้าง are ordinary verbs; the
# attribution exemption must bind them only when they actually report a claim.
class TestM3BoundedAttribution(unittest.TestCase):
    def test_colon_form_attribution_stays_exempt(self):
        # ima-audit-independent-claim-verification.th.md:71 — pinned real attribution.
        self.assertEqual(
            find_negative_claims("**รายงานระบุ:** `apps/` ไม่มี runtime implementation"), [])

    def test_rabu_chad_wa_attribution_stays_exempt(self):
        # homag-reference-corrections.md:113 — ระบุชัดว่า (ระบุ + ชัด + ว่า).
        self.assertEqual(
            find_negative_claims("HOMAG ระบุชัดว่า `apps/` ไม่มี runtime implementation"), [])

    def test_ang_wa_attribution_stays_exempt(self):
        self.assertEqual(
            find_negative_claims("Perplexity อ้างว่า `System32Policy` ไม่มีในโค้ด"), [])

    def test_rabu_as_ordinary_verb_no_longer_suppresses(self):
        # ระบุ = "specify", not "report": no ว่า / colon / quote follows it, so it
        # must not exempt the genuine absence claim that follows.
        hits = find_negative_claims(
            "สคีมา `tenant_id` ระบุคอลัมน์ครบ แต่ migration ไม่มีในราก")
        self.assertEqual([h.term for h in hits], ["tenant_id"])


if __name__ == "__main__":
    unittest.main()
