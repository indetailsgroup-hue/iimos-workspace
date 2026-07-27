"""Contracts for reviewed exact-SKU ingestion and fail-closed quarantine."""

from __future__ import annotations

from dataclasses import FrozenInstanceError, fields
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
PACKAGE_SOURCE = REPOSITORY_ROOT / "packages" / "component-master" / "src"
sys.path.insert(0, str(PACKAGE_SOURCE))

from monolith_component_master.adapters.reviewed_assertions import (  # noqa: E402
    DocumentKind,
    ReviewedAssertionAdapter,
    RightsState,
    SourceAuthority,
    SourceContext,
)
from monolith_component_master.evidence import FieldAssertion  # noqa: E402
from monolith_component_master.ingestion import (  # noqa: E402
    CandidateRecord,
    IngestionResult,
    QuarantineRecord,
)
from tools.connector_registry import ingest_reviewed as ingestion_cli  # noqa: E402


CANDIDATE_ID = "candidate:demo:connector-1"
BRAND_ID = "brand:demo"
OWNER_BY_REASON = {
    "REVIEW_REQUIRED": "OEM Evidence Curator",
    "ASSERTION_NOT_VERIFIED": "Identity and SKU Reviewer",
    "SOURCE_CONTEXT_MISSING": "OEM Evidence Curator",
    "RIGHTS_UNCERTAIN": "Rights and Licensing Reviewer",
    "UNITS_AMBIGUOUS": "Geometry and Units Reviewer",
    "UNIT_CONFLICT": "Geometry and Units Reviewer",
    "OEM_DISTRIBUTOR_IDENTITY_CONFLICT": "Identity and SKU Reviewer",
    "PDF_CAD_GEOMETRY_CONFLICT": "Geometry and Units Reviewer",
    "REQUIRED_MATING_PART_MISSING": "BOM and Compatibility Reviewer",
}


def make_assertion(
    assertion_id: str = "assertion:demo:identity:sku",
    *,
    entity_id: str = CANDIDATE_ID,
    field_path: str = "identity.exact_sku",
    value: object = "DEMO-001",
    source_id: str = "source:demo:oem:web",
    review_state: str = "VERIFIED",
) -> FieldAssertion:
    return FieldAssertion(
        assertion_id=assertion_id,
        entity_id=entity_id,
        field_path=field_path,
        value=value,
        source_id=source_id,
        locator="page 1, row DEMO-001" if review_state == "VERIFIED" else "",
        reviewer="reviewer:registry" if review_state == "VERIFIED" else "",
        review_state=review_state,
    )


def make_candidate(
    assertions: object | None = None,
    **overrides: object,
) -> CandidateRecord:
    arguments: dict[str, object] = {
        "candidate_id": CANDIDATE_ID,
        "brand_id": BRAND_ID,
        "entity_kind": "CONNECTOR_ASSEMBLY",
        "assertions": (
            make_assertion(),
        )
        if assertions is None
        else assertions,
        "extraction_method": "HUMAN_REVIEWED",
    }
    arguments.update(overrides)
    return CandidateRecord(**arguments)


def make_context(
    source_id: str = "source:demo:oem:web",
    *,
    authority: str = SourceAuthority.OEM.value,
    document_kind: str = DocumentKind.WEB.value,
    rights_state: str = RightsState.FACTUAL_INDEXING_ALLOWED.value,
) -> SourceContext:
    return SourceContext(
        source_id=source_id,
        authority=authority,
        document_kind=document_kind,
        rights_state=rights_state,
    )


def reason_codes(result: IngestionResult) -> tuple[str, ...]:
    return tuple(record.reason_code for record in result.quarantined)


class RecordContractTests(unittest.TestCase):
    def test_plan_records_preserve_exact_frozen_field_shapes(self) -> None:
        candidate = make_candidate()
        quarantine = QuarantineRecord(
            candidate_id=CANDIDATE_ID,
            reason_code="REVIEW_REQUIRED",
            evidence_ids=("assertion:demo:identity:sku",),
            owner_role="OEM Evidence Curator",
        )
        result = IngestionResult(promoted=(candidate,), quarantined=())

        self.assertEqual(
            [
                "candidate_id",
                "brand_id",
                "entity_kind",
                "assertions",
                "extraction_method",
            ],
            [field.name for field in fields(CandidateRecord)],
        )
        self.assertEqual(
            ["candidate_id", "reason_code", "evidence_ids", "owner_role"],
            [field.name for field in fields(QuarantineRecord)],
        )
        self.assertEqual(
            ["promoted", "quarantined"],
            [field.name for field in fields(IngestionResult)],
        )
        for record, field_name in (
            (candidate, "entity_kind"),
            (quarantine, "owner_role"),
            (result, "promoted"),
        ):
            with self.subTest(record=type(record).__name__):
                with self.assertRaises(FrozenInstanceError):
                    setattr(record, field_name, "changed")

    def test_source_context_is_the_smallest_frozen_explicit_contract(self) -> None:
        context = make_context()

        self.assertEqual(
            ["source_id", "authority", "document_kind", "rights_state"],
            [field.name for field in fields(SourceContext)],
        )
        with self.assertRaises(FrozenInstanceError):
            context.authority = SourceAuthority.OTHER.value

    def test_source_context_enums_have_only_the_approved_values(self) -> None:
        self.assertEqual(
            {"OEM", "AUTHORIZED_DISTRIBUTOR", "OTHER"},
            {item.value for item in SourceAuthority},
        )
        self.assertEqual(
            {"PDF", "CAD", "WEB", "API", "FEED", "MANUAL"},
            {item.value for item in DocumentKind},
        )
        self.assertEqual(
            {
                "FACTUAL_INDEXING_ALLOWED",
                "UNKNOWN",
                "RESTRICTED",
                "CONFLICTING",
            },
            {item.value for item in RightsState},
        )

    def test_candidate_takes_defensive_immutable_assertion_snapshots(self) -> None:
        dimensional_value = {"value": 25.4, "unit": "mm"}
        assertions = [
            make_assertion(
                "assertion:demo:geometry:diameter",
                field_path="geometry.bore_diameter",
                value=dimensional_value,
            )
        ]

        candidate = make_candidate(assertions)
        assertions.clear()
        dimensional_value["value"] = 999

        self.assertIsInstance(candidate.assertions, tuple)
        self.assertEqual(1, len(candidate.assertions))
        self.assertEqual(
            25.4,
            candidate.assertions[0].value["value"],
        )
        with self.assertRaises(TypeError):
            candidate.assertions[0].value["value"] = 1

    def test_result_and_quarantine_take_deterministic_tuple_snapshots(self) -> None:
        evidence_ids = [
            "assertion:demo:z",
            "assertion:demo:a",
            "assertion:demo:z",
        ]
        quarantine = QuarantineRecord(
            candidate_id=CANDIDATE_ID,
            reason_code="REVIEW_REQUIRED",
            evidence_ids=evidence_ids,
            owner_role="OEM Evidence Curator",
        )
        promoted = [make_candidate()]
        result = IngestionResult(promoted=promoted, quarantined=[])
        evidence_ids.clear()
        promoted.clear()

        self.assertEqual(
            ("assertion:demo:a", "assertion:demo:z"),
            quarantine.evidence_ids,
        )
        self.assertEqual(1, len(result.promoted))
        self.assertEqual((), result.quarantined)

    def test_ingestion_result_rejects_promoted_and_quarantined_together(self) -> None:
        with self.assertRaises(ValueError):
            IngestionResult(
                promoted=(make_candidate(),),
                quarantined=(
                    QuarantineRecord(
                        candidate_id=CANDIDATE_ID,
                        reason_code="REVIEW_REQUIRED",
                        evidence_ids=("assertion:demo:identity:sku",),
                        owner_role="OEM Evidence Curator",
                    ),
                ),
            )

    def test_quarantine_reason_and_owner_mapping_is_closed_and_authoritative(
        self,
    ) -> None:
        for reason_code, owner_role in OWNER_BY_REASON.items():
            with self.subTest(reason_code=reason_code):
                record = QuarantineRecord(
                    candidate_id=CANDIDATE_ID,
                    reason_code=reason_code,
                    evidence_ids=("assertion:demo:identity:sku",),
                    owner_role=owner_role,
                )
                self.assertEqual(owner_role, record.owner_role)
                with self.assertRaises(ValueError):
                    QuarantineRecord(
                        candidate_id=CANDIDATE_ID,
                        reason_code=reason_code,
                        evidence_ids=("assertion:demo:identity:sku",),
                        owner_role="Wrong Reviewer",
                    )

        with self.assertRaises(ValueError):
            QuarantineRecord(
                candidate_id=CANDIDATE_ID,
                reason_code="UNKNOWN_REASON",
                evidence_ids=("assertion:demo:identity:sku",),
                owner_role="OEM Evidence Curator",
            )

    def test_ingestion_result_requires_one_single_candidate_disposition(
        self,
    ) -> None:
        with self.assertRaises(ValueError):
            IngestionResult(promoted=(), quarantined=())
        with self.assertRaises(ValueError):
            IngestionResult(
                promoted=(make_candidate(), make_candidate()),
                quarantined=(),
            )

        first = QuarantineRecord(
            candidate_id=CANDIDATE_ID,
            reason_code="REVIEW_REQUIRED",
            evidence_ids=("assertion:demo:identity:sku",),
            owner_role="OEM Evidence Curator",
        )
        second = QuarantineRecord(
            candidate_id="candidate:demo:connector-2",
            reason_code="RIGHTS_UNCERTAIN",
            evidence_ids=("assertion:demo:identity:sku-2",),
            owner_role="Rights and Licensing Reviewer",
        )
        with self.assertRaises(ValueError):
            IngestionResult(promoted=(), quarantined=(first, second))

    def test_ingestion_result_rejects_duplicate_quarantine_reasons(self) -> None:
        quarantine = QuarantineRecord(
            candidate_id=CANDIDATE_ID,
            reason_code="REVIEW_REQUIRED",
            evidence_ids=("assertion:demo:identity:sku",),
            owner_role="OEM Evidence Curator",
        )
        with self.assertRaises(ValueError):
            IngestionResult(
                promoted=(),
                quarantined=(quarantine, quarantine),
            )


class ConstructionValidationTests(unittest.TestCase):
    def test_candidate_rejects_blank_malformed_and_wrong_identifier_types(self) -> None:
        for field_name, invalid_value, error_type in (
            ("candidate_id", "candidate id", ValueError),
            ("candidate_id", "candidate:", ValueError),
            ("candidate_id", None, TypeError),
            ("brand_id", "demo", ValueError),
            ("brand_id", "brand:   ", ValueError),
            ("brand_id", 1, TypeError),
        ):
            with self.subTest(field=field_name, value=invalid_value):
                with self.assertRaises(error_type):
                    make_candidate(**{field_name: invalid_value})

    def test_candidate_keeps_entity_kind_open_but_nonblank(self) -> None:
        self.assertEqual(
            "FUTURE_CONNECTOR_FAMILY",
            make_candidate(entity_kind="FUTURE_CONNECTOR_FAMILY").entity_kind,
        )
        for invalid_value, error_type in (
            ("", ValueError),
            ("   ", ValueError),
            (None, TypeError),
        ):
            with self.subTest(value=invalid_value):
                with self.assertRaises(error_type):
                    make_candidate(entity_kind=invalid_value)

    def test_candidate_rejects_empty_wrong_duplicate_or_mismatched_assertions(
        self,
    ) -> None:
        duplicate = make_assertion()
        cases = (
            ((), ValueError),
            (["not-an-assertion"], TypeError),
            ((duplicate, duplicate), ValueError),
            (
                (
                    make_assertion(
                        entity_id="candidate:demo:different-connector"
                    ),
                ),
                ValueError,
            ),
            (
                (
                    make_assertion(
                        assertion_id="assertion:contains whitespace"
                    ),
                ),
                ValueError,
            ),
        )
        for assertions, error_type in cases:
            with self.subTest(assertions=assertions):
                with self.assertRaises(error_type):
                    make_candidate(assertions)

    def test_candidate_rejects_blank_or_wrong_extraction_method(self) -> None:
        for invalid_value, error_type in (
            ("", ValueError),
            ("   ", ValueError),
            (None, TypeError),
        ):
            with self.subTest(value=invalid_value):
                with self.assertRaises(error_type):
                    make_candidate(extraction_method=invalid_value)

    def test_dimensional_fields_reject_wrong_values_and_boolean_numbers(self) -> None:
        for value, error_type in (
            (True, TypeError),
            ({"value": True, "unit": "mm"}, TypeError),
            ({"value": "25.4", "unit": "mm"}, TypeError),
            ({"value": float("inf"), "unit": "mm"}, ValueError),
            ({"value": 25.4, "unit": 1}, TypeError),
        ):
            with self.subTest(value=value):
                with self.assertRaises(error_type):
                    make_candidate(
                        (
                            make_assertion(
                                field_path="geometry.bore_diameter",
                                value=value,
                            ),
                        )
                    )

    def test_source_context_rejects_malformed_ids_and_unsupported_values(
        self,
    ) -> None:
        cases = (
            ({"source_id": "source name"}, ValueError),
            ({"source_id": "source:"}, ValueError),
            ({"source_id": None}, TypeError),
            ({"authority": "DISTRIBUTOR"}, ValueError),
            ({"authority": None}, TypeError),
            ({"document_kind": "XLSX"}, ValueError),
            ({"document_kind": None}, TypeError),
            ({"rights_state": "ALLOWED"}, ValueError),
            ({"rights_state": None}, TypeError),
        )
        for overrides, error_type in cases:
            with self.subTest(overrides=overrides):
                with self.assertRaises(error_type):
                    make_context(**overrides)

    def test_adapter_rejects_wrong_and_duplicate_source_contexts(self) -> None:
        context = make_context()
        with self.assertRaises(TypeError):
            ReviewedAssertionAdapter(("not-a-context",))
        with self.assertRaises(ValueError):
            ReviewedAssertionAdapter((context, context))

    def test_quarantine_rejects_malformed_evidence_ids(self) -> None:
        with self.assertRaises(ValueError):
            QuarantineRecord(
                candidate_id=CANDIDATE_ID,
                reason_code="REVIEW_REQUIRED",
                evidence_ids=("assertion:bad id",),
                owner_role="OEM Evidence Curator",
            )


class ReviewedIngestionTests(unittest.TestCase):
    def test_human_reviewed_verified_rights_cleared_candidate_promotes(self) -> None:
        candidate = make_candidate()

        result = ReviewedAssertionAdapter((make_context(),)).ingest(candidate)

        self.assertEqual((candidate,), result.promoted)
        self.assertEqual((), result.quarantined)

    def test_unreviewed_ai_candidate_requires_review(self) -> None:
        candidate = make_candidate(extraction_method="AI_EXTRACTED")

        result = ReviewedAssertionAdapter((make_context(),)).ingest(candidate)

        self.assertEqual((), result.promoted)
        self.assertEqual(("REVIEW_REQUIRED",), reason_codes(result))
        self.assertEqual(
            ("assertion:demo:identity:sku",),
            result.quarantined[0].evidence_ids,
        )
        self.assertEqual("OEM Evidence Curator", result.quarantined[0].owner_role)

    def test_only_pending_assertions_own_not_verified_evidence(self) -> None:
        candidate = make_candidate(
            (
                make_assertion(),
                make_assertion(
                    "assertion:demo:identity:finish",
                    field_path="identity.finish_code",
                    value="NI",
                    review_state="PENDING",
                ),
            )
        )

        result = ReviewedAssertionAdapter((make_context(),)).ingest(candidate)

        self.assertEqual(("ASSERTION_NOT_VERIFIED",), reason_codes(result))
        self.assertEqual(
            ("assertion:demo:identity:finish",),
            result.quarantined[0].evidence_ids,
        )
        self.assertEqual(
            "Identity and SKU Reviewer",
            result.quarantined[0].owner_role,
        )

    def test_missing_source_context_fails_closed(self) -> None:
        candidate = make_candidate()

        result = ReviewedAssertionAdapter(()).ingest(candidate)

        self.assertEqual((), result.promoted)
        self.assertEqual(("SOURCE_CONTEXT_MISSING",), reason_codes(result))
        self.assertEqual(
            ("assertion:demo:identity:sku",),
            result.quarantined[0].evidence_ids,
        )
        self.assertEqual("OEM Evidence Curator", result.quarantined[0].owner_role)

    def test_rights_must_be_explicitly_cleared_for_factual_indexing(self) -> None:
        for rights_state in (
            RightsState.UNKNOWN.value,
            RightsState.RESTRICTED.value,
            RightsState.CONFLICTING.value,
        ):
            with self.subTest(rights_state=rights_state):
                result = ReviewedAssertionAdapter(
                    (make_context(rights_state=rights_state),)
                ).ingest(make_candidate())

                self.assertEqual((), result.promoted)
                self.assertEqual(("RIGHTS_UNCERTAIN",), reason_codes(result))
                self.assertEqual(
                    "Rights and Licensing Reviewer",
                    result.quarantined[0].owner_role,
                )
                self.assertEqual(
                    ("assertion:demo:identity:sku",),
                    result.quarantined[0].evidence_ids,
                )

    def test_adapter_snapshots_constructor_contexts(self) -> None:
        contexts = [make_context()]
        adapter = ReviewedAssertionAdapter(contexts)
        contexts.clear()

        result = adapter.ingest(make_candidate())

        self.assertEqual(1, len(result.promoted))

    def test_ingest_does_not_mutate_candidate_assertion_or_review_state(
        self,
    ) -> None:
        raw_value = {"value": 25.4, "unit": "mm"}
        original_assertion = make_assertion(
            "assertion:demo:geometry:diameter",
            field_path="geometry.bore_diameter",
            value=raw_value,
        )
        candidate = make_candidate((original_assertion,))
        before_candidate = repr(candidate)
        before_assertion = repr(original_assertion)

        ReviewedAssertionAdapter((make_context(),)).ingest(candidate)

        self.assertEqual(before_candidate, repr(candidate))
        self.assertEqual(before_assertion, repr(original_assertion))
        self.assertEqual("VERIFIED", original_assertion.review_state)
        self.assertEqual({"value": 25.4, "unit": "mm"}, raw_value)

    def test_adapter_exposes_no_registry_release_or_manufacturing_authority(
        self,
    ) -> None:
        adapter = ReviewedAssertionAdapter((make_context(),))

        for prohibited_name in (
            "publish",
            "release",
            "write_registry",
            "manufacturing_allowed",
            "promote_pending",
        ):
            with self.subTest(name=prohibited_name):
                self.assertFalse(hasattr(adapter, prohibited_name))


class UnitConflictTests(unittest.TestCase):
    def test_exact_metric_and_imperial_equality_is_not_a_conflict(self) -> None:
        candidate = make_candidate(
            (
                make_assertion(
                    "assertion:demo:dimension:mm",
                    field_path="dimensions.panel_thickness",
                    value={"value": 25.4, "unit": "mm"},
                    source_id="source:demo:oem:web",
                ),
                make_assertion(
                    "assertion:demo:dimension:in",
                    field_path="dimensions.panel_thickness",
                    value={"value": 1, "unit": "in"},
                    source_id="source:demo:other:api",
                ),
            )
        )
        adapter = ReviewedAssertionAdapter(
            (
                make_context(),
                make_context(
                    "source:demo:other:api",
                    authority=SourceAuthority.OTHER.value,
                    document_kind=DocumentKind.API.value,
                ),
            )
        )

        result = adapter.ingest(candidate)

        self.assertEqual((candidate,), result.promoted)

    def test_metric_and_imperial_disagreement_quarantines(self) -> None:
        candidate = make_candidate(
            (
                make_assertion(
                    "assertion:demo:dimension:mm",
                    field_path="dimensions.panel_thickness",
                    value={"value": 25.4, "unit": "mm"},
                ),
                make_assertion(
                    "assertion:demo:dimension:in",
                    field_path="dimensions.panel_thickness",
                    value={"value": 1.01, "unit": "in"},
                    source_id="source:demo:other:api",
                ),
            )
        )
        adapter = ReviewedAssertionAdapter(
            (
                make_context(),
                make_context(
                    "source:demo:other:api",
                    authority=SourceAuthority.OTHER.value,
                    document_kind=DocumentKind.API.value,
                ),
            )
        )

        result = adapter.ingest(candidate)

        self.assertEqual((), result.promoted)
        self.assertEqual(("UNIT_CONFLICT",), reason_codes(result))
        self.assertEqual(
            (
                "assertion:demo:dimension:in",
                "assertion:demo:dimension:mm",
            ),
            result.quarantined[0].evidence_ids,
        )
        self.assertEqual(
            "Geometry and Units Reviewer",
            result.quarantined[0].owner_role,
        )

    def test_absent_or_unsupported_unit_is_ambiguous(self) -> None:
        for value in (
            {"value": 25.4},
            {"value": 2.54, "unit": "cm"},
        ):
            with self.subTest(value=value):
                assertion = make_assertion(
                    "assertion:demo:dimension:ambiguous",
                    field_path="dimensions.panel_thickness",
                    value=value,
                )
                result = ReviewedAssertionAdapter(
                    (make_context(),)
                ).ingest(make_candidate((assertion,)))

                self.assertEqual(("UNITS_AMBIGUOUS",), reason_codes(result))
                self.assertEqual(
                    ("assertion:demo:dimension:ambiguous",),
                    result.quarantined[0].evidence_ids,
                )

    def test_decimal_conversion_uses_exact_boundary_arithmetic(self) -> None:
        candidate = make_candidate(
            (
                make_assertion(
                    "assertion:demo:dimension:mm",
                    field_path="dimensions.offset",
                    value={"value": 2.54, "unit": "mm"},
                ),
                make_assertion(
                    "assertion:demo:dimension:in",
                    field_path="dimensions.offset",
                    value={"value": 0.1, "unit": "in"},
                    source_id="source:demo:other:feed",
                ),
            )
        )
        result = ReviewedAssertionAdapter(
            (
                make_context(),
                make_context(
                    "source:demo:other:feed",
                    authority=SourceAuthority.OTHER.value,
                    document_kind=DocumentKind.FEED.value,
                ),
            )
        ).ingest(candidate)

        self.assertEqual((candidate,), result.promoted)
        self.assertNotIn("UNIT_CONFLICT", reason_codes(result))


class AuthorityAndDocumentConflictTests(unittest.TestCase):
    def test_equal_oem_and_distributor_identity_is_not_a_conflict(self) -> None:
        candidate = make_candidate(
            (
                make_assertion(
                    "assertion:demo:identity:oem",
                    source_id="source:demo:oem:web",
                ),
                make_assertion(
                    "assertion:demo:identity:distributor",
                    source_id="source:demo:distributor:api",
                ),
            )
        )
        result = ReviewedAssertionAdapter(
            (
                make_context(),
                make_context(
                    "source:demo:distributor:api",
                    authority=SourceAuthority.AUTHORIZED_DISTRIBUTOR.value,
                    document_kind=DocumentKind.API.value,
                ),
            )
        ).ingest(candidate)

        self.assertEqual((candidate,), result.promoted)

    def test_different_oem_and_distributor_identity_quarantines(self) -> None:
        candidate = make_candidate(
            (
                make_assertion(
                    "assertion:demo:identity:oem",
                    value="DEMO-001",
                ),
                make_assertion(
                    "assertion:demo:identity:distributor",
                    value="DEMO-001-B",
                    source_id="source:demo:distributor:api",
                ),
            )
        )
        result = ReviewedAssertionAdapter(
            (
                make_context(),
                make_context(
                    "source:demo:distributor:api",
                    authority=SourceAuthority.AUTHORIZED_DISTRIBUTOR.value,
                    document_kind=DocumentKind.API.value,
                ),
            )
        ).ingest(candidate)

        self.assertEqual(
            ("OEM_DISTRIBUTOR_IDENTITY_CONFLICT",),
            reason_codes(result),
        )
        self.assertEqual(
            "Identity and SKU Reviewer",
            result.quarantined[0].owner_role,
        )

    def test_equal_pdf_and_cad_geometry_is_not_a_conflict(self) -> None:
        candidate = make_candidate(
            (
                make_assertion(
                    "assertion:demo:geometry:pdf",
                    field_path="geometry.bore_diameter",
                    value={"value": 10, "unit": "mm"},
                    source_id="source:demo:oem:pdf",
                ),
                make_assertion(
                    "assertion:demo:geometry:cad",
                    field_path="geometry.bore_diameter",
                    value={"value": 10, "unit": "mm"},
                    source_id="source:demo:oem:cad",
                ),
            )
        )
        result = ReviewedAssertionAdapter(
            (
                make_context(
                    "source:demo:oem:pdf",
                    document_kind=DocumentKind.PDF.value,
                ),
                make_context(
                    "source:demo:oem:cad",
                    document_kind=DocumentKind.CAD.value,
                ),
            )
        ).ingest(candidate)

        self.assertEqual((candidate,), result.promoted)

    def test_different_pdf_and_cad_geometry_quarantines(self) -> None:
        candidate = make_candidate(
            (
                make_assertion(
                    "assertion:demo:geometry:pdf",
                    field_path="geometry.bore_diameter",
                    value={"value": 10, "unit": "mm"},
                    source_id="source:demo:oem:pdf",
                ),
                make_assertion(
                    "assertion:demo:geometry:cad",
                    field_path="geometry.bore_diameter",
                    value={"value": 10.1, "unit": "mm"},
                    source_id="source:demo:oem:cad",
                ),
            )
        )
        result = ReviewedAssertionAdapter(
            (
                make_context(
                    "source:demo:oem:pdf",
                    document_kind=DocumentKind.PDF.value,
                ),
                make_context(
                    "source:demo:oem:cad",
                    document_kind=DocumentKind.CAD.value,
                ),
            )
        ).ingest(candidate)

        self.assertEqual(
            ("PDF_CAD_GEOMETRY_CONFLICT",),
            reason_codes(result),
        )
        self.assertEqual(
            (
                "assertion:demo:geometry:cad",
                "assertion:demo:geometry:pdf",
            ),
            result.quarantined[0].evidence_ids,
        )


class MatingPartAndMultiReasonTests(unittest.TestCase):
    def test_connector_assembly_with_required_exact_mating_part_promotes(
        self,
    ) -> None:
        candidate = make_candidate(
            (
                make_assertion(
                    "assertion:demo:compatibility:required",
                    field_path="compatibility.requires_mating_part",
                    value=True,
                ),
                make_assertion(
                    "assertion:demo:compatibility:exact-part",
                    field_path="compatibility.exact_mating_part_id",
                    value="sku:demo:mating-part:EU",
                ),
            )
        )

        result = ReviewedAssertionAdapter((make_context(),)).ingest(candidate)

        self.assertEqual((candidate,), result.promoted)

    def test_connector_assembly_missing_required_exact_mating_part_quarantines(
        self,
    ) -> None:
        marker = make_assertion(
            "assertion:demo:compatibility:required",
            field_path="compatibility.requires_mating_part",
            value=True,
        )

        result = ReviewedAssertionAdapter((make_context(),)).ingest(
            make_candidate((marker,))
        )

        self.assertEqual(
            ("REQUIRED_MATING_PART_MISSING",),
            reason_codes(result),
        )
        self.assertEqual(
            ("assertion:demo:compatibility:required",),
            result.quarantined[0].evidence_ids,
        )
        self.assertEqual(
            "BOM and Compatibility Reviewer",
            result.quarantined[0].owner_role,
        )

    def test_mating_part_is_not_required_for_unrelated_entity_kinds(self) -> None:
        candidate = make_candidate(
            entity_kind="CABINET_MATERIAL",
            assertions=(
                make_assertion(),
            ),
        )

        result = ReviewedAssertionAdapter((make_context(),)).ingest(candidate)

        self.assertEqual((candidate,), result.promoted)

    def test_all_simultaneous_reasons_are_deduplicated_and_ordered(
        self,
    ) -> None:
        candidate = make_candidate(
            (
                make_assertion(
                    "assertion:demo:identity:pending",
                    value="DEMO-001",
                    review_state="PENDING",
                ),
                make_assertion(
                    "assertion:demo:dimension:ambiguous",
                    field_path="dimensions.panel_thickness",
                    value={"value": 2.54, "unit": "cm"},
                    source_id="source:demo:missing:web",
                ),
                make_assertion(
                    "assertion:demo:compatibility:required",
                    field_path="compatibility.requires_mating_part",
                    value=True,
                ),
            ),
            extraction_method="AI_EXTRACTED",
        )
        adapter = ReviewedAssertionAdapter(
            (
                make_context(rights_state=RightsState.UNKNOWN.value),
            )
        )

        result = adapter.ingest(candidate)

        self.assertEqual((), result.promoted)
        self.assertEqual(
            (
                "REVIEW_REQUIRED",
                "ASSERTION_NOT_VERIFIED",
                "SOURCE_CONTEXT_MISSING",
                "RIGHTS_UNCERTAIN",
                "UNITS_AMBIGUOUS",
                "REQUIRED_MATING_PART_MISSING",
            ),
            reason_codes(result),
        )
        self.assertEqual(
            (
                "OEM Evidence Curator",
                "Identity and SKU Reviewer",
                "OEM Evidence Curator",
                "Rights and Licensing Reviewer",
                "Geometry and Units Reviewer",
                "BOM and Compatibility Reviewer",
            ),
            tuple(record.owner_role for record in result.quarantined),
        )
        self.assertEqual(
            ("assertion:demo:identity:pending",),
            result.quarantined[1].evidence_ids,
        )
        self.assertEqual(
            ("assertion:demo:dimension:ambiguous",),
            result.quarantined[2].evidence_ids,
        )


class CliContractTests(unittest.TestCase):
    def run_cli(
        self,
        *arguments: object,
        cwd: Path | None = None,
    ) -> subprocess.CompletedProcess[str]:
        script = (
            REPOSITORY_ROOT
            / "tools"
            / "connector_registry"
            / "ingest_reviewed.py"
        )
        return subprocess.run(
            [sys.executable, "-B", str(script), *(str(item) for item in arguments)],
            cwd=cwd or REPOSITORY_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )

    @staticmethod
    def write_jsonl(path: Path, records: list[object]) -> None:
        path.write_text(
            "".join(
                json.dumps(record, sort_keys=True, separators=(",", ":")) + "\n"
                for record in records
            ),
            encoding="utf-8",
        )

    @staticmethod
    def candidate_payload(
        *,
        candidate_id: str,
        assertion_id: str,
        source_id: str,
        extraction_method: str = "HUMAN_REVIEWED",
        brand_id: str = BRAND_ID,
        field_path: str = "identity.exact_sku",
        value: object | None = None,
    ) -> dict[str, object]:
        return {
            "candidate_id": candidate_id,
            "brand_id": brand_id,
            "entity_kind": "CONNECTOR_ASSEMBLY",
            "extraction_method": extraction_method,
            "assertions": [
                {
                    "assertion_id": assertion_id,
                    "entity_id": candidate_id,
                    "field_path": field_path,
                    "value": (
                        candidate_id.rsplit(":", 1)[-1].upper()
                        if value is None
                        else value
                    ),
                    "source_id": source_id,
                    "locator": "page 1",
                    "reviewer": "reviewer:registry",
                    "review_state": "VERIFIED",
                }
            ],
        }

    def test_help_lists_every_required_local_io_flag(self) -> None:
        result = self.run_cli("--help")

        self.assertEqual(0, result.returncode, result.stderr)
        for flag in (
            "--brand",
            "--source-manifest",
            "--assertions",
            "--out",
            "--quarantine",
        ):
            with self.subTest(flag=flag):
                self.assertIn(flag, result.stdout)

    def test_cli_writes_separate_deterministic_promoted_and_quarantine_jsonl(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            manifest = root / "sources.json"
            assertions = root / "candidates.jsonl"
            promoted = root / "promoted.jsonl"
            quarantine = root / "quarantine.jsonl"
            manifest.write_text(
                json.dumps(
                    [
                        {
                            "source_id": "source:demo:oem:web",
                            "authority": "OEM",
                            "document_kind": "WEB",
                            "rights_state": "FACTUAL_INDEXING_ALLOWED",
                        },
                        {
                            "source_id": "source:demo:other:web",
                            "authority": "OTHER",
                            "document_kind": "WEB",
                            "rights_state": "UNKNOWN",
                        },
                    ]
                ),
                encoding="utf-8",
            )
            self.write_jsonl(
                assertions,
                [
                    self.candidate_payload(
                        candidate_id="candidate:demo:promoted",
                        assertion_id="assertion:demo:promoted:identity",
                        source_id="source:demo:oem:web",
                        field_path="dimensions.panel_thickness",
                        value={"value": 25.4, "unit": "mm"},
                    ),
                    self.candidate_payload(
                        candidate_id="candidate:demo:quarantined",
                        assertion_id="assertion:demo:quarantined:identity",
                        source_id="source:demo:other:web",
                        extraction_method="AI_EXTRACTED",
                    ),
                ],
            )

            result = self.run_cli(
                "--brand",
                BRAND_ID,
                "--source-manifest",
                manifest,
                "--assertions",
                assertions,
                "--out",
                promoted,
                "--quarantine",
                quarantine,
                cwd=root,
            )

            self.assertEqual(0, result.returncode, result.stderr)
            promoted_records = [
                json.loads(line)
                for line in promoted.read_text(encoding="utf-8").splitlines()
            ]
            quarantine_records = [
                json.loads(line)
                for line in quarantine.read_text(encoding="utf-8").splitlines()
            ]
            self.assertEqual(
                ["candidate:demo:promoted"],
                [record["candidate_id"] for record in promoted_records],
            )
            self.assertEqual(
                ["REVIEW_REQUIRED", "RIGHTS_UNCERTAIN"],
                [record["reason_code"] for record in quarantine_records],
            )
            self.assertEqual(
                {
                    "candidates.jsonl",
                    "promoted.jsonl",
                    "quarantine.jsonl",
                    "sources.json",
                },
                {path.name for path in root.iterdir()},
            )

    def test_brand_mismatch_or_malformed_input_creates_no_outputs(self) -> None:
        for case in ("brand", "malformed"):
            with self.subTest(case=case):
                with tempfile.TemporaryDirectory() as temporary_directory:
                    root = Path(temporary_directory)
                    manifest = root / "sources.json"
                    assertions = root / "candidates.jsonl"
                    promoted = root / "promoted.jsonl"
                    quarantine = root / "quarantine.jsonl"
                    manifest.write_text(
                        json.dumps(
                            [
                                {
                                    "source_id": "source:demo:oem:web",
                                    "authority": "OEM",
                                    "document_kind": "WEB",
                                    "rights_state": "FACTUAL_INDEXING_ALLOWED",
                                }
                            ]
                        ),
                        encoding="utf-8",
                    )
                    if case == "brand":
                        self.write_jsonl(
                            assertions,
                            [
                                self.candidate_payload(
                                    candidate_id="candidate:other:item",
                                    assertion_id="assertion:other:item:identity",
                                    source_id="source:demo:oem:web",
                                    brand_id="brand:other",
                                )
                            ],
                        )
                    else:
                        assertions.write_text("{not-json}\n", encoding="utf-8")

                    result = self.run_cli(
                        "--brand",
                        BRAND_ID,
                        "--source-manifest",
                        manifest,
                        "--assertions",
                        assertions,
                        "--out",
                        promoted,
                        "--quarantine",
                        quarantine,
                    )

                    self.assertNotEqual(0, result.returncode)
                    self.assertFalse(promoted.exists())
                    self.assertFalse(quarantine.exists())

    def test_output_collision_fails_without_partial_promoted_release(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            manifest = root / "sources.json"
            assertions = root / "candidates.jsonl"
            promoted = root / "promoted.jsonl"
            quarantine = root / "quarantine.jsonl"
            manifest.write_text("[]", encoding="utf-8")
            assertions.write_text("", encoding="utf-8")
            promoted.write_text("existing\n", encoding="utf-8")

            result = self.run_cli(
                "--brand",
                BRAND_ID,
                "--source-manifest",
                manifest,
                "--assertions",
                assertions,
                "--out",
                promoted,
                "--quarantine",
                quarantine,
            )

            self.assertNotEqual(0, result.returncode)
            self.assertEqual("existing\n", promoted.read_text(encoding="utf-8"))
            self.assertFalse(quarantine.exists())

    def test_second_publication_failure_rolls_back_first_output(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            promoted = root / "promoted.jsonl"
            quarantine = root / "quarantine.jsonl"
            real_link = ingestion_cli.os.link
            calls = 0

            def fail_second_link(source: object, destination: object) -> None:
                nonlocal calls
                calls += 1
                if calls == 2:
                    raise OSError("injected second publication failure")
                real_link(source, destination)

            with mock.patch.object(
                ingestion_cli.os,
                "link",
                side_effect=fail_second_link,
            ):
                with self.assertRaisesRegex(
                    OSError,
                    "injected second publication failure",
                ):
                    ingestion_cli._write_new_outputs(
                        promoted,
                        b'{"candidate_id":"candidate:demo:one"}\n',
                        quarantine,
                        b'{"reason_code":"REVIEW_REQUIRED"}\n',
                    )

            self.assertFalse(promoted.exists())
            self.assertFalse(quarantine.exists())
            self.assertEqual((), tuple(root.glob("*.tmp")))

    def test_destination_race_never_overwrites_racer_or_leaves_first_output(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            promoted = root / "promoted.jsonl"
            quarantine = root / "quarantine.jsonl"
            real_link = ingestion_cli.os.link
            calls = 0

            def race_second_destination(
                source: object,
                destination: object,
            ) -> None:
                nonlocal calls
                calls += 1
                if calls == 2:
                    Path(destination).write_text("racer\n", encoding="utf-8")
                real_link(source, destination)

            with mock.patch.object(
                ingestion_cli.os,
                "link",
                side_effect=race_second_destination,
            ):
                with self.assertRaises(FileExistsError):
                    ingestion_cli._write_new_outputs(
                        promoted,
                        b'{"candidate_id":"candidate:demo:one"}\n',
                        quarantine,
                        b'{"reason_code":"REVIEW_REQUIRED"}\n',
                    )

            self.assertEqual(
                "racer\n",
                promoted.read_text(encoding="utf-8"),
            )
            self.assertFalse(quarantine.exists())


if __name__ == "__main__":
    unittest.main()
