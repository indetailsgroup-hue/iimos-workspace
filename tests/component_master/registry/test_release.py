"""Contracts for the coverage ledger and the deterministic registry release.

Task 8 publishes what the registry currently holds. It does not populate the
registry, sign anything, or grant manufacturing, freeze, export or production
authority. No test in this file establishes physical qualification.
"""

from __future__ import annotations

from collections.abc import Mapping
import contextlib
from dataclasses import FrozenInstanceError
from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
PACKAGE_SOURCE = REPOSITORY_ROOT / "packages" / "component-master" / "src"
sys.path.insert(0, str(PACKAGE_SOURCE))

from monolith_component_master.coverage import (  # noqa: E402
    CLASSIFICATION_STATES,
    BlockedSource,
    CoverageItem,
    CoverageSnapshot,
    EvidenceGateFinding,
    MeasuredCount,
    SourceDenominatorEntry,
    UnclassifiedItem,
    build_snapshot,
    canonical_value,
    discover_registry_root,
    evaluate_evidence_gate,
)
from monolith_component_master.evidence import (  # noqa: E402
    EvidenceVault,
    FieldAssertion,
    SourceSnapshot,
)
from monolith_component_master.registry_models import (  # noqa: E402
    VerificationDimension,
    VerificationState,
)
from monolith_component_master.releases import (  # noqa: E402
    RegistryRelease,
    build_release,
    build_release_from_snapshot,
    canonical_json_bytes,
    snapshot_payload,
    write_new_files,
)
from tools.connector_registry import build_release as build_release_cli  # noqa: E402
from tools.connector_registry import check_coverage as check_coverage_cli  # noqa: E402


LIVE_REGISTRY_ROOT = REPOSITORY_ROOT / "data" / "component-master" / "registry" / "v1"
COMMITTED_SNAPSHOT = LIVE_REGISTRY_ROOT / "coverage-snapshot.json"
SOURCE_CACHE_DIRNAME = "_source-cache"
ITEM_ID = "sku:demo:item-1"
SOURCE_ID = "source:demo:catalog"
ASSERTION_ID = "assertion:demo:identity-1"
SOURCE_CONTENT = b"demo catalogue page bytes"
SOURCE_SHA256 = hashlib.sha256(SOURCE_CONTENT).hexdigest()
CREATED_AT = "2026-07-30T13:02:17.200025+00:00"
OTHER_CREATED_AT = "2027-01-01T00:00:00+00:00"
ALL_DIMENSIONS = tuple(dimension.value for dimension in VerificationDimension)


def dimension_states(**overrides: str) -> dict[str, str]:
    """Every dimension stated explicitly; silence is never a state."""

    states = {name: VerificationState.PENDING.value for name in ALL_DIMENSIONS}
    for name, value in overrides.items():
        if name not in states:
            raise AssertionError(f"unknown test dimension {name}")
        states[name] = value
    return states


def field_assertion(
    *,
    assertion_id: str = ASSERTION_ID,
    entity_id: str = ITEM_ID,
    field_path: str = "identity.exact_sku",
    value: object = "ITEM-1",
    source_id: str = SOURCE_ID,
    locator: str = "page 24",
    reviewer: str = "reviewer:demo",
    review_state: str = "VERIFIED",
) -> FieldAssertion:
    return FieldAssertion(
        assertion_id=assertion_id,
        entity_id=entity_id,
        field_path=field_path,
        value=value,
        source_id=source_id,
        locator=locator,
        reviewer=reviewer,
        review_state=review_state,
    )


def source_snapshot(
    *,
    source_id: str = SOURCE_ID,
    sha256: str = SOURCE_SHA256,
) -> SourceSnapshot:
    return SourceSnapshot(
        source_id=source_id,
        publisher="Demo Publisher",
        url="https://example.invalid/catalogue",
        edition="2026",
        region="GLOBAL",
        accessed_at="2026-07-30",
        sha256=sha256,
        rights_state="FACTUAL_INDEXING_ALLOWED",
    )


def coverage_item(
    *,
    item_id: str = ITEM_ID,
    classification: str = "VERIFIED",
    states: Mapping[str, str] | None = None,
    assertions: tuple[FieldAssertion, ...] | None = None,
) -> CoverageItem:
    return CoverageItem(
        item_id=item_id,
        classification=classification,
        dimension_states=(
            dimension_states(identity=VerificationState.VERIFIED.value)
            if states is None
            else states
        ),
        assertions=(
            (field_assertion(entity_id=item_id),)
            if assertions is None
            else assertions
        ),
    )


def loaded_vault() -> tuple[EvidenceVault, dict[str, bytes]]:
    vault = EvidenceVault()
    vault.register(source_snapshot(), SOURCE_CONTENT)
    vault.register(field_assertion())
    return vault, {SOURCE_ID: SOURCE_CONTENT}


def item_line(
    *,
    item_id: str = ITEM_ID,
    classification: str | None = "VERIFIED",
    states: Mapping[str, str] | None = None,
    assertions: list[dict[str, object]] | None = None,
) -> dict[str, object]:
    record: dict[str, object] = {
        "item_id": item_id,
        "dimension_states": (
            dimension_states(identity=VerificationState.VERIFIED.value)
            if states is None
            else dict(states)
        ),
        "assertions": (
            [
                {
                    "assertion_id": ASSERTION_ID,
                    "entity_id": item_id,
                    "field_path": "identity.exact_sku",
                    "value": "ITEM-1",
                    "source_id": SOURCE_ID,
                    "locator": "page 24",
                    "reviewer": "reviewer:demo",
                    "review_state": "VERIFIED",
                }
            ]
            if assertions is None
            else assertions
        ),
    }
    if classification is not None:
        record["classification"] = classification
    return record


def source_line(
    *,
    source_id: str = SOURCE_ID,
    sha256: str = SOURCE_SHA256,
    content_path: str | None = f"{SOURCE_CACHE_DIRNAME}/demo.bin",
    blocked_reason: str | None = None,
) -> dict[str, object]:
    record: dict[str, object] = {
        "source_id": source_id,
        "publisher": "Demo Publisher",
        "url": "https://example.invalid/catalogue",
        "edition": "2026",
        "region": "GLOBAL",
        "accessed_at": "2026-07-30",
        "sha256": sha256,
        "rights_state": "FACTUAL_INDEXING_ALLOWED",
    }
    if content_path is not None:
        record["content_path"] = content_path
    if blocked_reason is not None:
        record["blocked_reason"] = blocked_reason
    return record


def write_jsonl(path: Path, records: list[dict[str, object]]) -> None:
    path.write_bytes(
        b"".join(
            json.dumps(record, sort_keys=True, separators=(",", ":")).encode("utf-8")
            + b"\n"
            for record in records
        )
    )


class RootBuilder:
    """Materialize a registry root with the seed file names Task 8 reads."""

    ITEM_FILENAMES = (
        "bom-edges.jsonl",
        "compatibility-edges.jsonl",
        "materials.jsonl",
        "qualification-envelopes.jsonl",
    )
    SOURCE_FILENAME = "evidence-manifest.jsonl"

    def __init__(self, root: Path) -> None:
        self.root = root
        root.mkdir(parents=True, exist_ok=True)
        for name in self.ITEM_FILENAMES:
            (root / name).write_bytes(b"\n")
        (root / self.SOURCE_FILENAME).write_bytes(b"\n")

    def with_items(
        self,
        records: list[dict[str, object]],
        filename: str = "materials.jsonl",
    ) -> "RootBuilder":
        write_jsonl(self.root / filename, records)
        return self

    def with_sources(self, records: list[dict[str, object]]) -> "RootBuilder":
        write_jsonl(self.root / self.SOURCE_FILENAME, records)
        return self

    def with_cached_source(
        self,
        content: bytes = SOURCE_CONTENT,
        name: str = "demo.bin",
    ) -> "RootBuilder":
        cache = self.root / SOURCE_CACHE_DIRNAME
        cache.mkdir(parents=True, exist_ok=True)
        (cache / name).write_bytes(content)
        return self


class TemporaryRootTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self._directory = tempfile.TemporaryDirectory()
        self.addCleanup(self._directory.cleanup)
        self.workspace = Path(self._directory.name)
        self.root = self.workspace / "v1"

    def seed_root(self) -> RootBuilder:
        return RootBuilder(self.root)

    def populated_root(self) -> RootBuilder:
        return (
            self.seed_root()
            .with_items([item_line()])
            .with_sources([source_line()])
            .with_cached_source()
        )


# ---------------------------------------------------------------------------
# 9. Exact-type, snapshot and unordered-collection refusals
# ---------------------------------------------------------------------------


class CanonicalValueTests(unittest.TestCase):
    def test_admits_json_representable_scalars(self) -> None:
        for value in (None, True, False, 0, -1, 12, 1.5, "text", ""):
            with self.subTest(value=value):
                self.assertEqual(value, canonical_value(value, "field"))

    def test_rebuilds_mapping_into_immutable_equivalent(self) -> None:
        source = {"b": 1, "a": {"c": [1, 2]}}
        snapshot = canonical_value(source, "field")
        self.assertIsInstance(snapshot, Mapping)
        self.assertNotIsInstance(snapshot, dict)
        self.assertEqual((1, 2), snapshot["a"]["c"])
        source["b"] = 99
        self.assertEqual(1, snapshot["b"])

    def test_rebuilds_sequence_into_tuple(self) -> None:
        source = [1, [2, 3]]
        snapshot = canonical_value(source, "field")
        self.assertEqual((1, (2, 3)), snapshot)
        source.append(4)
        self.assertEqual((1, (2, 3)), snapshot)

    def test_refuses_unordered_collections(self) -> None:
        for value in ({1, 2}, frozenset({1, 2})):
            with self.subTest(value=value):
                with self.assertRaises(TypeError) as caught:
                    canonical_value(value, "field")
                self.assertIn("unordered", str(caught.exception))

    def test_refuses_decimal_bytearray_and_bytes(self) -> None:
        for value in (Decimal("1.5"), bytearray(b"x"), b"x", memoryview(b"x")):
            with self.subTest(value=type(value).__name__):
                with self.assertRaises(TypeError):
                    canonical_value(value, "field")

    def test_refuses_non_finite_floats(self) -> None:
        for value in (float("nan"), float("inf"), float("-inf")):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    canonical_value(value, "field")

    def test_refuses_scalar_subclasses(self) -> None:
        class Sneaky(str):
            def __eq__(self, other: object) -> bool:  # pragma: no cover - guard
                return True

            def __hash__(self) -> int:  # pragma: no cover - guard
                return 0

        class SneakyInt(int):
            pass

        for value in (Sneaky("x"), SneakyInt(3)):
            with self.subTest(value=type(value).__name__):
                with self.assertRaises(TypeError):
                    canonical_value(value, "field")

    def test_refuses_non_string_mapping_keys(self) -> None:
        with self.assertRaises(TypeError):
            canonical_value({1: "a"}, "field")

    def test_refuses_arbitrary_objects(self) -> None:
        with self.assertRaises(TypeError):
            canonical_value(object(), "field")
        with self.assertRaises(TypeError):
            canonical_value(datetime.now(timezone.utc), "field")


class MeasuredCountTests(unittest.TestCase):
    def test_carries_its_denominator_and_derivation(self) -> None:
        count = MeasuredCount(
            label="classified_items",
            count=0,
            denominator=0,
            denominator_label="discovered_items",
            measured_by="coverage.discover_registry_root",
        )
        self.assertEqual(0, count.count)
        self.assertEqual(0, count.denominator)
        self.assertEqual("discovered_items", count.denominator_label)
        self.assertTrue(count.measured_by)

    def test_refuses_count_greater_than_denominator(self) -> None:
        with self.assertRaises(ValueError):
            MeasuredCount(
                label="classified_items",
                count=2,
                denominator=1,
                denominator_label="discovered_items",
                measured_by="test",
            )

    def test_refuses_negative_and_boolean_counts(self) -> None:
        with self.assertRaises(ValueError):
            MeasuredCount(
                label="x",
                count=-1,
                denominator=1,
                denominator_label="d",
                measured_by="test",
            )
        with self.assertRaises(TypeError):
            MeasuredCount(
                label="x",
                count=True,
                denominator=1,
                denominator_label="d",
                measured_by="test",
            )

    def test_refuses_blank_label_denominator_label_or_derivation(self) -> None:
        for field_name in ("label", "denominator_label", "measured_by"):
            with self.subTest(field_name=field_name):
                kwargs: dict[str, object] = {
                    "label": "x",
                    "count": 0,
                    "denominator": 0,
                    "denominator_label": "d",
                    "measured_by": "test",
                }
                kwargs[field_name] = "  "
                with self.assertRaises(ValueError):
                    MeasuredCount(**kwargs)  # type: ignore[arg-type]

    def test_is_frozen(self) -> None:
        count = MeasuredCount(
            label="x",
            count=0,
            denominator=0,
            denominator_label="d",
            measured_by="test",
        )
        with self.assertRaises(FrozenInstanceError):
            count.count = 5  # type: ignore[misc]


class CoverageItemTests(unittest.TestCase):
    def test_requires_every_verification_dimension_exactly_once(self) -> None:
        states = dimension_states()
        del states["identity"]
        with self.assertRaises(ValueError):
            coverage_item(states=states)

    def test_refuses_unknown_dimension_or_state(self) -> None:
        states = dimension_states()
        states["not_a_dimension"] = VerificationState.PENDING.value
        with self.assertRaises(ValueError):
            coverage_item(states=states)
        bad_state = dimension_states()
        bad_state["identity"] = "PROBABLY"
        with self.assertRaises(ValueError):
            coverage_item(states=bad_state)

    def test_refuses_unknown_classification(self) -> None:
        with self.assertRaises(ValueError):
            coverage_item(classification="MOSTLY_FINE")

    def test_refuses_blank_or_malformed_item_id(self) -> None:
        for item_id in ("", "   ", "not-canonical", "sku:"):
            with self.subTest(item_id=item_id):
                with self.assertRaises(ValueError):
                    coverage_item(item_id=item_id)

    def test_refuses_unordered_assertion_collection(self) -> None:
        with self.assertRaises(TypeError) as caught:
            CoverageItem(
                item_id=ITEM_ID,
                classification="VERIFIED",
                dimension_states=dimension_states(),
                assertions=frozenset({field_assertion()}),
            )
        self.assertIn("unordered", str(caught.exception))

    def test_refuses_unordered_dimension_states(self) -> None:
        with self.assertRaises(TypeError):
            CoverageItem(
                item_id=ITEM_ID,
                classification="VERIFIED",
                dimension_states=frozenset(ALL_DIMENSIONS),  # type: ignore[arg-type]
                assertions=(field_assertion(),),
            )

    def test_refuses_mutable_assertion_value(self) -> None:
        with self.assertRaises(TypeError):
            coverage_item(
                assertions=(
                    field_assertion(
                        field_path="geometry.diameter",
                        value={"value": Decimal("8"), "unit": "mm"},
                    ),
                )
            )

    def test_stores_rebuilt_assertions_not_caller_instances(self) -> None:
        original = field_assertion()
        item = coverage_item(assertions=(original,))
        self.assertEqual(original.assertion_id, item.assertions[0].assertion_id)
        self.assertIsNot(original, item.assertions[0])

    def test_refuses_assertion_subclass(self) -> None:
        class SneakyAssertion(FieldAssertion):
            pass

        sneaky = SneakyAssertion(
            assertion_id=ASSERTION_ID,
            entity_id=ITEM_ID,
            field_path="identity.exact_sku",
            value="ITEM-1",
            source_id=SOURCE_ID,
            locator="page 24",
            reviewer="reviewer:demo",
            review_state="VERIFIED",
        )
        item = coverage_item(assertions=(sneaky,))
        self.assertIs(FieldAssertion, type(item.assertions[0]))

    def test_requires_assertion_entity_to_match_item(self) -> None:
        with self.assertRaises(ValueError):
            coverage_item(
                assertions=(field_assertion(entity_id="sku:demo:other"),)
            )

    def test_refuses_duplicate_assertion_ids(self) -> None:
        with self.assertRaises(ValueError):
            coverage_item(
                assertions=(field_assertion(), field_assertion())
            )

    def test_derives_sorted_unique_source_ids(self) -> None:
        item = coverage_item(
            assertions=(
                field_assertion(
                    assertion_id="assertion:demo:b",
                    source_id="source:demo:z",
                ),
                field_assertion(
                    assertion_id="assertion:demo:a",
                    source_id="source:demo:a",
                ),
                field_assertion(
                    assertion_id="assertion:demo:c",
                    source_id="source:demo:z",
                ),
            )
        )
        self.assertEqual(("source:demo:a", "source:demo:z"), item.source_ids)
        self.assertEqual(
            ("assertion:demo:a", "assertion:demo:b", "assertion:demo:c"),
            item.assertion_ids,
        )

    def test_is_frozen(self) -> None:
        item = coverage_item()
        with self.assertRaises(FrozenInstanceError):
            item.classification = "PENDING"  # type: ignore[misc]

    def test_classification_states_match_the_design_contract(self) -> None:
        self.assertEqual(
            (
                "DISCONTINUED",
                "OUT_OF_SCOPE_WITH_REASON",
                "PENDING",
                "REGION_ONLY",
                "SOURCE_BLOCKED",
                "SUPERSEDED",
                "VERIFIED",
            ),
            CLASSIFICATION_STATES,
        )


class SupportingRecordTests(unittest.TestCase):
    def test_blocked_source_requires_canonical_id_and_reason(self) -> None:
        blocked = BlockedSource(source_id=SOURCE_ID, reason="READ_FAILED")
        self.assertEqual(SOURCE_ID, blocked.source_id)
        with self.assertRaises(ValueError):
            BlockedSource(source_id="nope", reason="READ_FAILED")
        with self.assertRaises(ValueError):
            BlockedSource(source_id=SOURCE_ID, reason=" ")

    def test_unclassified_item_records_origin_and_reason(self) -> None:
        record = UnclassifiedItem(
            item_id=ITEM_ID,
            origin="materials.jsonl:1",
            reason="CLASSIFICATION_ABSENT",
        )
        self.assertEqual("materials.jsonl:1", record.origin)
        with self.assertRaises(ValueError):
            UnclassifiedItem(item_id=ITEM_ID, origin=" ", reason="x")

    def test_source_denominator_entry_requires_registered_digest(self) -> None:
        entry = SourceDenominatorEntry(
            source_id=SOURCE_ID,
            sha256=SOURCE_SHA256,
            state="REGISTERED",
        )
        self.assertEqual(SOURCE_SHA256, entry.sha256)
        with self.assertRaises(ValueError):
            SourceDenominatorEntry(
                source_id=SOURCE_ID,
                sha256="not-a-digest",
                state="REGISTERED",
            )
        with self.assertRaises(ValueError):
            SourceDenominatorEntry(
                source_id=SOURCE_ID,
                sha256=SOURCE_SHA256,
                state="PROBABLY_FINE",
            )

    def test_evidence_gate_finding_requires_known_reason(self) -> None:
        finding = EvidenceGateFinding(
            item_id=ITEM_ID,
            assertion_id=ASSERTION_ID,
            reason="SOURCE_NOT_REGISTERED",
        )
        self.assertEqual("SOURCE_NOT_REGISTERED", finding.reason)
        with self.assertRaises(ValueError):
            EvidenceGateFinding(
                item_id=ITEM_ID,
                assertion_id=ASSERTION_ID,
                reason="LOOKS_OKAY",
            )


# ---------------------------------------------------------------------------
# 8. The inherited evidence gate (Task 7 carry-forward)
# ---------------------------------------------------------------------------


class EvidenceGateTests(unittest.TestCase):
    def test_backed_verified_record_produces_no_finding(self) -> None:
        vault, stored = loaded_vault()
        self.assertEqual(
            (),
            evaluate_evidence_gate((coverage_item(),), vault, stored),
        )

    def test_unregistered_assertion_cannot_be_counted_verified(self) -> None:
        vault = EvidenceVault()
        vault.register(source_snapshot(), SOURCE_CONTENT)
        findings = evaluate_evidence_gate(
            (coverage_item(),),
            vault,
            {SOURCE_ID: SOURCE_CONTENT},
        )
        self.assertEqual(
            (
                EvidenceGateFinding(
                    item_id=ITEM_ID,
                    assertion_id=ASSERTION_ID,
                    reason="ASSERTION_NOT_REGISTERED",
                ),
            ),
            findings,
        )

    def test_assertion_naming_an_unregistered_source_is_refused(self) -> None:
        """The exact Task 7 hole: VERIFIED pointing at a nonexistent source."""

        vault = EvidenceVault()
        ghost = field_assertion(source_id="source:demo:ghost")
        # EvidenceVault refuses to register it; the release must refuse too.
        with self.assertRaises(ValueError):
            vault.register(ghost)
        findings = evaluate_evidence_gate(
            (coverage_item(assertions=(ghost,)),),
            vault,
            {},
        )
        self.assertEqual(1, len(findings))
        self.assertEqual("ASSERTION_NOT_REGISTERED", findings[0].reason)

    def test_source_registered_but_bytes_unavailable_is_refused(self) -> None:
        vault, _ = loaded_vault()
        findings = evaluate_evidence_gate((coverage_item(),), vault, {})
        self.assertEqual(
            ("SOURCE_BYTES_UNAVAILABLE",),
            tuple(finding.reason for finding in findings),
        )

    def test_source_hash_mismatch_is_refused(self) -> None:
        vault, _ = loaded_vault()
        findings = evaluate_evidence_gate(
            (coverage_item(),),
            vault,
            {SOURCE_ID: b"tampered bytes"},
        )
        self.assertEqual(
            ("SOURCE_HASH_MISMATCH",),
            tuple(finding.reason for finding in findings),
        )

    def test_pending_assertion_cannot_back_a_verified_record(self) -> None:
        vault = EvidenceVault()
        vault.register(source_snapshot(), SOURCE_CONTENT)
        pending = field_assertion(review_state="PENDING")
        vault.register(pending)
        findings = evaluate_evidence_gate(
            (coverage_item(assertions=(pending,)),),
            vault,
            {SOURCE_ID: SOURCE_CONTENT},
        )
        self.assertEqual(
            ("ASSERTION_NOT_VERIFIED",),
            tuple(finding.reason for finding in findings),
        )

    def test_registered_assertion_must_equal_the_stored_claim(self) -> None:
        vault, stored = loaded_vault()
        divergent = field_assertion(locator="page 99")
        findings = evaluate_evidence_gate(
            (coverage_item(assertions=(divergent,)),),
            vault,
            stored,
        )
        self.assertEqual(
            ("ASSERTION_DOES_NOT_MATCH_VAULT",),
            tuple(finding.reason for finding in findings),
        )

    def test_non_canonicalizable_vault_value_cannot_back_a_claim(self) -> None:
        """`evidence.FieldAssertion` admits values `CandidateRecord` refuses.

        `evidence.py` accepts `Decimal`, `bytearray`, `frozenset` and `nan`
        assertion values. Task 8 does not reconcile that inside `evidence.py`;
        it states its own behaviour instead. The vault is the authority the
        gate resolves against, so a claim whose registered value cannot be
        canonicalized is refused and cannot be counted as verified.
        """

        for value in (
            Decimal("1.5"),
            bytearray(b"x"),
            frozenset({1}),
            float("nan"),
        ):
            with self.subTest(value=type(value).__name__):
                vault = EvidenceVault()
                vault.register(source_snapshot(), SOURCE_CONTENT)
                vault.register(
                    field_assertion(field_path="commercial.note", value=value)
                )
                findings = evaluate_evidence_gate(
                    (
                        coverage_item(
                            assertions=(
                                field_assertion(field_path="commercial.note"),
                            )
                        ),
                    ),
                    vault,
                    {SOURCE_ID: SOURCE_CONTENT},
                )
                self.assertEqual(
                    ("ASSERTION_VALUE_NOT_CANONICALIZABLE",),
                    tuple(finding.reason for finding in findings),
                )

    def test_such_a_value_is_also_refused_at_item_construction(self) -> None:
        """Layer one: the record itself never stores an exotic value."""

        for value in (
            Decimal("1.5"),
            bytearray(b"x"),
            frozenset({1}),
            float("nan"),
        ):
            with self.subTest(value=type(value).__name__):
                with self.assertRaises((TypeError, ValueError)):
                    coverage_item(
                        assertions=(
                            field_assertion(
                                field_path="commercial.note", value=value
                            ),
                        )
                    )

    def test_verified_record_without_any_assertion_is_refused(self) -> None:
        vault, stored = loaded_vault()
        findings = evaluate_evidence_gate(
            (
                CoverageItem(
                    item_id=ITEM_ID,
                    classification="VERIFIED",
                    dimension_states=dimension_states(),
                    assertions=(),
                ),
            ),
            vault,
            stored,
        )
        self.assertEqual(
            ("MISSING_ASSERTION",),
            tuple(finding.reason for finding in findings),
        )

    def test_dimension_level_verified_claim_is_also_gated(self) -> None:
        vault = EvidenceVault()
        vault.register(source_snapshot(), SOURCE_CONTENT)
        findings = evaluate_evidence_gate(
            (
                coverage_item(
                    classification="PENDING",
                    states=dimension_states(
                        geometry=VerificationState.VERIFIED.value
                    ),
                ),
            ),
            vault,
            {SOURCE_ID: SOURCE_CONTENT},
        )
        self.assertEqual(
            ("ASSERTION_NOT_REGISTERED",),
            tuple(finding.reason for finding in findings),
        )

    def test_record_claiming_nothing_verified_is_not_gated(self) -> None:
        self.assertEqual(
            (),
            evaluate_evidence_gate(
                (
                    coverage_item(
                        classification="PENDING",
                        states=dimension_states(),
                        assertions=(),
                    ),
                ),
                EvidenceVault(),
                {},
            ),
        )

    def test_findings_are_deterministically_ordered(self) -> None:
        vault = EvidenceVault()
        vault.register(source_snapshot(), SOURCE_CONTENT)
        items = (
            coverage_item(
                item_id="sku:demo:b",
                assertions=(
                    field_assertion(
                        assertion_id="assertion:demo:b",
                        entity_id="sku:demo:b",
                    ),
                ),
            ),
            coverage_item(
                item_id="sku:demo:a",
                assertions=(
                    field_assertion(
                        assertion_id="assertion:demo:a",
                        entity_id="sku:demo:a",
                    ),
                ),
            ),
        )
        forward = evaluate_evidence_gate(
            items, vault, {SOURCE_ID: SOURCE_CONTENT}
        )
        reverse = evaluate_evidence_gate(
            tuple(reversed(items)), vault, {SOURCE_ID: SOURCE_CONTENT}
        )
        self.assertEqual(forward, reverse)
        self.assertEqual(
            ("sku:demo:a", "sku:demo:b"),
            tuple(finding.item_id for finding in forward),
        )

    def test_gate_refuses_unordered_item_collection(self) -> None:
        with self.assertRaises(TypeError):
            evaluate_evidence_gate(
                frozenset({coverage_item()}),  # type: ignore[arg-type]
                EvidenceVault(),
                {},
            )


# ---------------------------------------------------------------------------
# 1, 6, 7. Snapshot semantics: explicit zero, blocked sources, separate counts
# ---------------------------------------------------------------------------


class CoverageSnapshotTests(unittest.TestCase):
    def empty_snapshot(self) -> CoverageSnapshot:
        return CoverageSnapshot(
            discovered_item_count=0,
            items=(),
            unclassified=(),
            blocked_sources=(),
            source_denominator=(),
            evidence_gate_findings=(),
        )

    def test_denominator_must_equal_classified_plus_unclassified(self) -> None:
        with self.assertRaises(ValueError):
            CoverageSnapshot(
                discovered_item_count=5,
                items=(coverage_item(),),
                unclassified=(),
                blocked_sources=(),
                source_denominator=(),
                evidence_gate_findings=(),
            )

    def test_empty_registry_states_zero_coverage_explicitly(self) -> None:
        snapshot = self.empty_snapshot()
        for state in CLASSIFICATION_STATES:
            with self.subTest(state=state):
                measured = snapshot.classification_counts[state]
                self.assertEqual(0, measured.count)
                self.assertEqual(0, measured.denominator)
        for dimension in ALL_DIMENSIONS:
            with self.subTest(dimension=dimension):
                self.assertEqual(
                    0, snapshot.dimension_verified_counts[dimension].count
                )
        self.assertEqual(0, snapshot.verified_item_count.count)
        self.assertEqual(0, snapshot.verified_item_count.denominator)

    def test_every_classification_key_is_present_even_at_zero(self) -> None:
        snapshot = self.empty_snapshot()
        self.assertEqual(
            set(CLASSIFICATION_STATES), set(snapshot.classification_counts)
        )
        self.assertEqual(
            set(ALL_DIMENSIONS), set(snapshot.dimension_verified_counts)
        )

    def test_every_count_carries_a_denominator_and_derivation(self) -> None:
        snapshot = self.empty_snapshot()
        self.assertTrue(snapshot.counts)
        for measured in snapshot.counts:
            with self.subTest(label=measured.label):
                self.assertIsInstance(measured, MeasuredCount)
                self.assertTrue(measured.denominator_label.strip())
                self.assertTrue(measured.measured_by.strip())

    def test_coverage_statement_names_zero_and_its_denominator(self) -> None:
        statement = self.empty_snapshot().coverage_statement
        self.assertIn("0 of 0", statement)
        self.assertIn("covers nothing", statement)

    def test_no_blended_coverage_score_exists(self) -> None:
        snapshot = self.empty_snapshot()
        payload = snapshot_payload(snapshot)
        flattened = json.dumps(canonical_json_bytes(payload).decode("utf-8"))
        for forbidden in (
            "coverage_percent",
            "coverage_score",
            "overall_coverage",
            "completeness_percent",
        ):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, flattened)
        self.assertFalse(hasattr(snapshot, "coverage_percent"))

    def test_dimension_counts_are_separate_not_merged(self) -> None:
        item = coverage_item(
            states=dimension_states(
                identity=VerificationState.VERIFIED.value,
                geometry=VerificationState.PENDING.value,
            )
        )
        snapshot = CoverageSnapshot(
            discovered_item_count=1,
            items=(item,),
            unclassified=(),
            blocked_sources=(),
            source_denominator=(),
            evidence_gate_findings=(),
        )
        self.assertEqual(1, snapshot.dimension_verified_counts["identity"].count)
        self.assertEqual(0, snapshot.dimension_verified_counts["geometry"].count)
        self.assertEqual(
            1, snapshot.dimension_verified_counts["identity"].denominator
        )

    def test_blocked_sources_are_reported_not_dropped(self) -> None:
        snapshot = CoverageSnapshot(
            discovered_item_count=0,
            items=(),
            unclassified=(),
            blocked_sources=(
                BlockedSource(source_id=SOURCE_ID, reason="READ_FAILED"),
            ),
            source_denominator=(
                SourceDenominatorEntry(
                    source_id=SOURCE_ID,
                    sha256=SOURCE_SHA256,
                    state="BLOCKED",
                ),
            ),
            evidence_gate_findings=(),
        )
        self.assertEqual(1, snapshot.blocked_source_count.count)
        self.assertEqual(1, snapshot.blocked_source_count.denominator)
        payload = snapshot_payload(snapshot)
        self.assertEqual(
            [{"reason": "READ_FAILED", "source_id": SOURCE_ID}],
            list(payload["blocked_sources"]),
        )

    def test_unclassified_items_are_named(self) -> None:
        snapshot = CoverageSnapshot(
            discovered_item_count=1,
            items=(),
            unclassified=(
                UnclassifiedItem(
                    item_id=ITEM_ID,
                    origin="materials.jsonl:1",
                    reason="CLASSIFICATION_ABSENT",
                ),
            ),
            blocked_sources=(),
            source_denominator=(),
            evidence_gate_findings=(),
        )
        self.assertEqual(1, snapshot.unclassified_item_count.count)
        self.assertEqual(1, snapshot.unclassified_item_count.denominator)
        self.assertEqual(0, snapshot.classified_item_count.count)
        self.assertIn(ITEM_ID, snapshot.coverage_statement)

    def test_gate_findings_exclude_the_record_from_verified_counts(self) -> None:
        item = coverage_item()
        snapshot = CoverageSnapshot(
            discovered_item_count=1,
            items=(item,),
            unclassified=(),
            blocked_sources=(),
            source_denominator=(),
            evidence_gate_findings=(
                EvidenceGateFinding(
                    item_id=ITEM_ID,
                    assertion_id=ASSERTION_ID,
                    reason="SOURCE_NOT_REGISTERED",
                ),
            ),
        )
        self.assertEqual(1, snapshot.classification_counts["VERIFIED"].count)
        self.assertEqual(0, snapshot.verified_item_count.count)
        self.assertEqual(1, snapshot.unbacked_verified_item_count.count)
        self.assertEqual(
            0, snapshot.dimension_verified_counts["identity"].count
        )

    def test_refuses_finding_for_an_unknown_item(self) -> None:
        with self.assertRaises(ValueError):
            CoverageSnapshot(
                discovered_item_count=0,
                items=(),
                unclassified=(),
                blocked_sources=(),
                source_denominator=(),
                evidence_gate_findings=(
                    EvidenceGateFinding(
                        item_id=ITEM_ID,
                        assertion_id=ASSERTION_ID,
                        reason="MISSING_ASSERTION",
                    ),
                ),
            )

    def test_refuses_duplicate_item_ids(self) -> None:
        with self.assertRaises(ValueError):
            CoverageSnapshot(
                discovered_item_count=2,
                items=(coverage_item(), coverage_item()),
                unclassified=(),
                blocked_sources=(),
                source_denominator=(),
                evidence_gate_findings=(),
            )

    def test_refuses_unordered_collections(self) -> None:
        for field_name in (
            "items",
            "unclassified",
            "blocked_sources",
            "source_denominator",
            "evidence_gate_findings",
        ):
            with self.subTest(field_name=field_name):
                kwargs: dict[str, object] = {
                    "discovered_item_count": 0,
                    "items": (),
                    "unclassified": (),
                    "blocked_sources": (),
                    "source_denominator": (),
                    "evidence_gate_findings": (),
                }
                kwargs[field_name] = frozenset()
                with self.assertRaises(TypeError):
                    CoverageSnapshot(**kwargs)  # type: ignore[arg-type]

    def test_refuses_item_subclass(self) -> None:
        class SneakyItem(CoverageItem):
            pass

        sneaky = SneakyItem(
            item_id=ITEM_ID,
            classification="VERIFIED",
            dimension_states=dimension_states(),
            assertions=(field_assertion(),),
        )
        with self.assertRaises(TypeError):
            CoverageSnapshot(
                discovered_item_count=1,
                items=(sneaky,),
                unclassified=(),
                blocked_sources=(),
                source_denominator=(),
                evidence_gate_findings=(),
            )

    def test_items_are_stored_in_a_stable_sorted_order(self) -> None:
        first = coverage_item(
            item_id="sku:demo:a",
            assertions=(
                field_assertion(
                    assertion_id="assertion:demo:a", entity_id="sku:demo:a"
                ),
            ),
        )
        second = coverage_item(
            item_id="sku:demo:b",
            assertions=(
                field_assertion(
                    assertion_id="assertion:demo:b", entity_id="sku:demo:b"
                ),
            ),
        )
        forward = CoverageSnapshot(
            discovered_item_count=2,
            items=(first, second),
            unclassified=(),
            blocked_sources=(),
            source_denominator=(),
            evidence_gate_findings=(),
        )
        reverse = CoverageSnapshot(
            discovered_item_count=2,
            items=(second, first),
            unclassified=(),
            blocked_sources=(),
            source_denominator=(),
            evidence_gate_findings=(),
        )
        self.assertEqual(
            ("sku:demo:a", "sku:demo:b"),
            tuple(item.item_id for item in forward.items),
        )
        self.assertEqual(forward.items, reverse.items)


# ---------------------------------------------------------------------------
# 2, 3, 4. Determinism: byte replay, order independence, no wall clock
# ---------------------------------------------------------------------------


class CanonicalSerializationTests(unittest.TestCase):
    def test_uses_sorted_keys_lf_endings_and_utf8(self) -> None:
        payload = {"b": 1, "a": "หนึ่ง"}
        rendered = canonical_json_bytes(payload)
        self.assertEqual(
            '{"a":"หนึ่ง","b":1}\n'.encode("utf-8"),
            rendered,
        )
        self.assertNotIn(b"\r", rendered)
        self.assertTrue(rendered.endswith(b"\n"))

    def test_refuses_values_it_cannot_canonicalize(self) -> None:
        for value in (Decimal("1"), {1, 2}, float("nan"), b"bytes"):
            with self.subTest(value=type(value).__name__):
                with self.assertRaises((TypeError, ValueError)):
                    canonical_json_bytes({"field": value})

    def test_refuses_lone_surrogate_strings(self) -> None:
        with self.assertRaises(ValueError):
            canonical_json_bytes({"field": "\ud800"})


class ReleaseRecordTests(unittest.TestCase):
    def snapshot(self) -> CoverageSnapshot:
        return CoverageSnapshot(
            discovered_item_count=0,
            items=(),
            unclassified=(),
            blocked_sources=(),
            source_denominator=(),
            evidence_gate_findings=(),
        )

    def test_release_carries_identity_digests_and_creation_metadata(self) -> None:
        release = build_release_from_snapshot(
            self.snapshot(),
            version="0.1.0",
            created_at_utc=CREATED_AT,
        )
        self.assertIsInstance(release, RegistryRelease)
        self.assertEqual("release:connector-registry:0.1.0", release.release_id)
        self.assertEqual("0.1.0", release.version)
        self.assertEqual(64, len(release.payload_sha256))
        self.assertEqual(64, len(release.source_denominator_sha256))
        self.assertEqual(CREATED_AT, release.created_at_utc)
        self.assertEqual(
            hashlib.sha256(release.payload_bytes).hexdigest(),
            release.payload_sha256,
        )

    def test_creation_metadata_lives_outside_the_hashed_payload(self) -> None:
        early = build_release_from_snapshot(
            self.snapshot(), version="0.1.0", created_at_utc=CREATED_AT
        )
        later = build_release_from_snapshot(
            self.snapshot(), version="0.1.0", created_at_utc=OTHER_CREATED_AT
        )
        self.assertEqual(early.payload_bytes, later.payload_bytes)
        self.assertEqual(early.payload_sha256, later.payload_sha256)
        self.assertNotEqual(early.created_at_utc, later.created_at_utc)
        self.assertNotIn(b"created_at", early.payload_bytes)
        self.assertNotIn(
            CREATED_AT.encode("utf-8"), early.payload_bytes
        )
        self.assertIn("created_at_utc", early.manifest())
        self.assertNotIn("created_at_utc", json.loads(early.payload_bytes))

    def test_manifest_contains_release_identity_and_both_digests(self) -> None:
        release = build_release_from_snapshot(
            self.snapshot(), version="0.1.0", created_at_utc=CREATED_AT
        )
        manifest = release.manifest()
        self.assertEqual(
            {
                "authority_state",
                "created_at_utc",
                "payload_sha256",
                "release_id",
                "source_denominator_sha256",
                "version",
            },
            set(manifest),
        )
        self.assertEqual("NOT-FOR-PRODUCTION", manifest["authority_state"])

    def test_rejects_malformed_versions(self) -> None:
        for version in ("", "1", "1.2", "v1.2.3", "1.2.3-rc1", "01.2.3", " 1.2.3"):
            with self.subTest(version=version):
                with self.assertRaises(ValueError):
                    build_release_from_snapshot(
                        self.snapshot(),
                        version=version,
                        created_at_utc=CREATED_AT,
                    )

    def test_rejects_malformed_creation_metadata(self) -> None:
        for created_at in ("", "yesterday", "2026-07-30T13:02:17"):
            with self.subTest(created_at=created_at):
                with self.assertRaises(ValueError):
                    build_release_from_snapshot(
                        self.snapshot(),
                        version="0.1.0",
                        created_at_utc=created_at,
                    )

    def test_rejects_snapshot_subclass(self) -> None:
        class SneakySnapshot(CoverageSnapshot):
            pass

        sneaky = SneakySnapshot(
            discovered_item_count=0,
            items=(),
            unclassified=(),
            blocked_sources=(),
            source_denominator=(),
            evidence_gate_findings=(),
        )
        with self.assertRaises(TypeError):
            build_release_from_snapshot(
                sneaky, version="0.1.0", created_at_utc=CREATED_AT
            )

    def test_source_denominator_digest_covers_registered_sources(self) -> None:
        with_source = CoverageSnapshot(
            discovered_item_count=0,
            items=(),
            unclassified=(),
            blocked_sources=(),
            source_denominator=(
                SourceDenominatorEntry(
                    source_id=SOURCE_ID,
                    sha256=SOURCE_SHA256,
                    state="REGISTERED",
                ),
            ),
            evidence_gate_findings=(),
        )
        empty = build_release_from_snapshot(
            self.snapshot(), version="0.1.0", created_at_utc=CREATED_AT
        )
        populated = build_release_from_snapshot(
            with_source, version="0.1.0", created_at_utc=CREATED_AT
        )
        self.assertNotEqual(
            empty.source_denominator_sha256,
            populated.source_denominator_sha256,
        )

    def test_payload_states_the_authority_boundary(self) -> None:
        release = build_release_from_snapshot(
            self.snapshot(), version="0.1.0", created_at_utc=CREATED_AT
        )
        payload = json.loads(release.payload_bytes)
        self.assertEqual("NOT-FOR-PRODUCTION", payload["authority_state"])
        self.assertIn("covers nothing", payload["coverage_statement"])


class OrderIndependenceTests(TemporaryRootTestCase):
    def build(self, records: list[dict[str, object]]) -> bytes:
        root = self.workspace / f"root-{len(records)}-{id(records)}"
        (
            RootBuilder(root)
            .with_items(records)
            .with_sources([source_line()])
            .with_cached_source()
        )
        return build_release(
            root=root, version="0.1.0", created_at_utc=CREATED_AT
        ).payload_bytes

    def test_input_order_does_not_change_output_bytes(self) -> None:
        first = item_line(item_id="sku:demo:a")
        first["assertions"] = [
            {
                "assertion_id": "assertion:demo:a",
                "entity_id": "sku:demo:a",
                "field_path": "identity.exact_sku",
                "value": "A",
                "source_id": SOURCE_ID,
                "locator": "page 1",
                "reviewer": "reviewer:demo",
                "review_state": "VERIFIED",
            }
        ]
        second = item_line(item_id="sku:demo:b")
        second["assertions"] = [
            {
                "assertion_id": "assertion:demo:b",
                "entity_id": "sku:demo:b",
                "field_path": "identity.exact_sku",
                "value": "B",
                "source_id": SOURCE_ID,
                "locator": "page 2",
                "reviewer": "reviewer:demo",
                "review_state": "VERIFIED",
            }
        ]
        forward = self.build([first, second])
        reverse = self.build([second, first])
        self.assertEqual(forward, reverse)
        self.assertEqual(
            hashlib.sha256(forward).hexdigest(),
            hashlib.sha256(reverse).hexdigest(),
        )


class SeparateProcessReplayTests(TemporaryRootTestCase):
    def run_build(self, out_dir: Path) -> subprocess.CompletedProcess[str]:
        script = REPOSITORY_ROOT / "tools" / "connector_registry" / "build_release.py"
        environment = dict(os.environ)
        environment["PYTHONHASHSEED"] = "random"
        environment["PYTHONDONTWRITEBYTECODE"] = "1"
        return subprocess.run(
            [
                sys.executable,
                "-B",
                str(script),
                "--root",
                str(self.root),
                "--version",
                "0.1.0",
                "--out-dir",
                str(out_dir),
            ],
            cwd=REPOSITORY_ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            check=False,
            env=environment,
        )

    def test_two_separate_processes_produce_identical_bytes(self) -> None:
        self.populated_root()
        first_dir = self.workspace / "out-1"
        second_dir = self.workspace / "out-2"
        first_dir.mkdir()
        second_dir.mkdir()

        first = self.run_build(first_dir)
        second = self.run_build(second_dir)
        self.assertEqual(0, first.returncode, first.stderr)
        self.assertEqual(0, second.returncode, second.stderr)

        first_bytes = (first_dir / "registry.json").read_bytes()
        second_bytes = (second_dir / "registry.json").read_bytes()
        self.assertEqual(first_bytes, second_bytes)
        self.assertNotIn(b"\r\n", first_bytes)

        digest = hashlib.sha256(first_bytes).hexdigest()
        first_manifest = json.loads(first.stdout)
        second_manifest = json.loads(second.stdout)
        self.assertEqual(digest, first_manifest["payload_sha256"])
        self.assertEqual(digest, second_manifest["payload_sha256"])
        self.assertEqual(
            first_manifest["source_denominator_sha256"],
            second_manifest["source_denominator_sha256"],
        )

    def test_separate_processes_agree_on_the_empty_registry_digest(self) -> None:
        self.seed_root()
        first_dir = self.workspace / "empty-1"
        second_dir = self.workspace / "empty-2"
        first_dir.mkdir()
        second_dir.mkdir()
        first = self.run_build(first_dir)
        second = self.run_build(second_dir)
        self.assertEqual(0, first.returncode, first.stderr)
        self.assertEqual(0, second.returncode, second.stderr)
        self.assertEqual(
            (first_dir / "registry.json").read_bytes(),
            (second_dir / "registry.json").read_bytes(),
        )
        self.assertEqual(
            json.loads(first.stdout)["payload_sha256"],
            json.loads(second.stdout)["payload_sha256"],
        )


# ---------------------------------------------------------------------------
# Registry-root discovery
# ---------------------------------------------------------------------------


class DiscoveryTests(TemporaryRootTestCase):
    def test_zero_record_seeds_discover_nothing(self) -> None:
        self.seed_root()
        result = discover_registry_root(self.root)
        self.assertEqual((), result.items)
        self.assertEqual((), result.unclassified)
        self.assertEqual((), result.blocked_sources)
        self.assertEqual((), result.source_denominator)

    def test_crlf_input_is_read_identically_to_lf_input(self) -> None:
        """A fresh checkout under `core.autocrlf` delivers CRLF seed files."""

        self.populated_root()
        lf_release = build_release(
            root=self.root, version="0.1.0", created_at_utc=CREATED_AT
        )
        for path in sorted(self.root.glob("*.jsonl")):
            path.write_bytes(path.read_bytes().replace(b"\n", b"\r\n"))
        crlf_release = build_release(
            root=self.root, version="0.1.0", created_at_utc=CREATED_AT
        )
        self.assertEqual(lf_release.payload_bytes, crlf_release.payload_bytes)
        self.assertNotIn(b"\r", crlf_release.payload_bytes)

    def test_crlf_zero_record_seeds_still_discover_nothing(self) -> None:
        self.seed_root()
        for path in sorted(self.root.glob("*.jsonl")):
            path.write_bytes(b"\r\n")
        result = discover_registry_root(self.root)
        self.assertEqual((), result.items)
        self.assertEqual((), result.unclassified)
        self.assertEqual((), result.source_denominator)

    def test_item_without_a_classification_is_reported_unclassified(self) -> None:
        self.seed_root().with_items([item_line(classification=None)])
        result = discover_registry_root(self.root)
        self.assertEqual((), result.items)
        self.assertEqual(1, len(result.unclassified))
        self.assertEqual(ITEM_ID, result.unclassified[0].item_id)
        self.assertIn("materials.jsonl:1", result.unclassified[0].origin)

    def test_item_with_an_unknown_classification_is_unclassified(self) -> None:
        self.seed_root().with_items([item_line(classification="PROBABLY")])
        result = discover_registry_root(self.root)
        self.assertEqual(1, len(result.unclassified))
        self.assertEqual(
            "CLASSIFICATION_UNRECOGNIZED", result.unclassified[0].reason
        )

    def test_blocked_source_is_reported(self) -> None:
        self.seed_root().with_sources(
            [source_line(content_path=None, blocked_reason="PAYWALLED")]
        )
        result = discover_registry_root(self.root)
        self.assertEqual(
            (BlockedSource(source_id=SOURCE_ID, reason="PAYWALLED"),),
            result.blocked_sources,
        )
        self.assertEqual("BLOCKED", result.source_denominator[0].state)

    def test_unreadable_source_content_is_a_blocked_source(self) -> None:
        self.seed_root().with_sources([source_line()])
        result = discover_registry_root(self.root)
        self.assertEqual(
            ("SOURCE_CONTENT_UNREADABLE",),
            tuple(blocked.reason for blocked in result.blocked_sources),
        )

    def test_source_bytes_that_do_not_match_the_digest_are_blocked(self) -> None:
        (
            self.seed_root()
            .with_sources([source_line()])
            .with_cached_source(content=b"different bytes")
        )
        result = discover_registry_root(self.root)
        self.assertEqual(
            ("SOURCE_HASH_MISMATCH",),
            tuple(blocked.reason for blocked in result.blocked_sources),
        )

    def test_source_content_path_escaping_the_root_is_refused(self) -> None:
        self.seed_root().with_sources(
            [source_line(content_path="../outside.bin")]
        )
        with self.assertRaises(ValueError):
            discover_registry_root(self.root)

    def test_malformed_json_raises_with_a_located_reason(self) -> None:
        self.seed_root()
        (self.root / "materials.jsonl").write_bytes(b"{not json\n")
        with self.assertRaises(ValueError) as caught:
            discover_registry_root(self.root)
        self.assertIn("materials.jsonl", str(caught.exception))

    def test_duplicate_item_ids_across_files_are_refused(self) -> None:
        self.seed_root().with_items([item_line()], filename="materials.jsonl")
        write_jsonl(self.root / "bom-edges.jsonl", [item_line()])
        with self.assertRaises(ValueError):
            discover_registry_root(self.root)

    def test_missing_root_raises(self) -> None:
        with self.assertRaises(FileNotFoundError):
            discover_registry_root(self.workspace / "absent")

    def test_missing_source_manifest_raises(self) -> None:
        self.seed_root()
        (self.root / "evidence-manifest.jsonl").unlink()
        with self.assertRaises(FileNotFoundError):
            discover_registry_root(self.root)

    def test_snapshot_over_a_populated_root_passes_the_gate(self) -> None:
        self.populated_root()
        snapshot = build_snapshot(self.root)
        self.assertEqual(1, snapshot.discovered_item_count)
        self.assertEqual((), snapshot.evidence_gate_findings)
        self.assertEqual(1, snapshot.verified_item_count.count)
        self.assertEqual(1, snapshot.verified_item_count.denominator)

    def test_snapshot_over_a_root_with_a_ghost_source_fails_the_gate(self) -> None:
        self.seed_root().with_items([item_line()])
        snapshot = build_snapshot(self.root)
        self.assertEqual(1, snapshot.discovered_item_count)
        self.assertEqual(
            ("ASSERTION_NOT_REGISTERED",),
            tuple(
                finding.reason for finding in snapshot.evidence_gate_findings
            ),
        )
        self.assertEqual(0, snapshot.verified_item_count.count)
        self.assertEqual(1, snapshot.unbacked_verified_item_count.count)


# ---------------------------------------------------------------------------
# 1. Empty registry over the live repository root
# ---------------------------------------------------------------------------


class LiveEmptyRegistryTests(unittest.TestCase):
    def test_every_seed_is_a_zero_record_file(self) -> None:
        """The registry holds nothing; the seeds are a bare line terminator.

        The terminator is compared against both forms because this repository
        has no `.gitattributes` and `core.autocrlf` is enabled on at least one
        contributor machine, so a fresh checkout rewrites a one-byte `\\n` seed
        into a two-byte `\\r\\n` seed. That is git's checkout filter, not a
        generator defect; the substantive claim asserted here is that the file
        carries zero records either way.
        """

        seeds = sorted(LIVE_REGISTRY_ROOT.glob("*.jsonl"))
        self.assertTrue(seeds)
        for seed in seeds:
            with self.subTest(seed=seed.name):
                self.assertIn(seed.read_bytes(), (b"\n", b"\r\n"))
                self.assertEqual(
                    [],
                    [
                        line
                        for line in seed.read_text(encoding="utf-8").splitlines()
                        if line.strip()
                    ],
                )

    def test_release_over_the_empty_registry_succeeds(self) -> None:
        release = build_release(
            root=LIVE_REGISTRY_ROOT,
            version="0.1.0",
            created_at_utc=CREATED_AT,
        )
        payload = json.loads(release.payload_bytes)
        self.assertEqual(0, payload["discovered_item_count"])
        self.assertEqual("NOT-FOR-PRODUCTION", payload["authority_state"])

    def test_empty_release_states_zero_coverage_not_by_omission(self) -> None:
        release = build_release(
            root=LIVE_REGISTRY_ROOT,
            version="0.1.0",
            created_at_utc=CREATED_AT,
        )
        payload = json.loads(release.payload_bytes)
        for state in CLASSIFICATION_STATES:
            with self.subTest(state=state):
                entry = payload["classification_counts"][state]
                self.assertEqual(0, entry["count"])
                self.assertEqual(0, entry["denominator"])
                self.assertTrue(entry["measured_by"])
        for dimension in ALL_DIMENSIONS:
            with self.subTest(dimension=dimension):
                self.assertEqual(
                    0, payload["dimension_verified_counts"][dimension]["count"]
                )
        self.assertIn("covers nothing", payload["coverage_statement"])

    def test_committed_snapshot_matches_a_fresh_measurement(self) -> None:
        self.assertTrue(
            COMMITTED_SNAPSHOT.is_file(),
            "the committed coverage snapshot must exist",
        )
        committed = COMMITTED_SNAPSHOT.read_bytes()
        snapshot = build_snapshot(LIVE_REGISTRY_ROOT)
        generated = canonical_json_bytes(snapshot_payload(snapshot))
        # The generator never emits CR. This is asserted on the bytes it just
        # produced, which never passed through git.
        self.assertNotIn(b"\r", generated)
        # The committed copy is compared with checkout-time EOL conversion
        # normalized away: this repository has no `.gitattributes` and
        # `core.autocrlf` is enabled, so a fresh checkout rewrites the LF
        # terminators. See the seed test above for the same condition.
        self.assertEqual(generated, committed.replace(b"\r\n", b"\n"))


# ---------------------------------------------------------------------------
# 10. CLI fail-closed contracts
# ---------------------------------------------------------------------------


class CliTestCase(TemporaryRootTestCase):
    script_name = ""

    def run_script(self, *arguments: object) -> subprocess.CompletedProcess[str]:
        script = (
            REPOSITORY_ROOT / "tools" / "connector_registry" / self.script_name
        )
        environment = dict(os.environ)
        environment["PYTHONDONTWRITEBYTECODE"] = "1"
        return subprocess.run(
            [
                sys.executable,
                "-B",
                str(script),
                *(str(item) for item in arguments),
            ],
            cwd=REPOSITORY_ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            check=False,
            env=environment,
        )


class CheckCoverageCliTests(CliTestCase):
    script_name = "check_coverage.py"

    def test_help_exits_zero_and_lists_the_planned_flags(self) -> None:
        result = self.run_script("--help")
        self.assertEqual(0, result.returncode, result.stderr)
        for flag in ("--root", "--fail-on-unclassified", "--out"):
            with self.subTest(flag=flag):
                self.assertIn(flag, result.stdout)

    def test_planned_invocation_over_the_live_root_exits_zero(self) -> None:
        result = self.run_script(
            "--root",
            "data/component-master/registry/v1",
            "--fail-on-unclassified",
        )
        self.assertEqual(0, result.returncode, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(0, payload["discovered_item_count"])
        self.assertIn("covers nothing", payload["coverage_statement"])

    def test_unclassified_item_exits_non_zero_and_names_it(self) -> None:
        self.seed_root().with_items([item_line(classification=None)])
        result = self.run_script(
            "--root", self.root, "--fail-on-unclassified"
        )
        self.assertNotEqual(0, result.returncode)
        self.assertIn(ITEM_ID, result.stderr)

    def test_unclassified_item_is_reported_without_the_flag(self) -> None:
        self.seed_root().with_items([item_line(classification=None)])
        result = self.run_script("--root", self.root)
        self.assertEqual(0, result.returncode, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(
            [ITEM_ID],
            [entry["item_id"] for entry in payload["unclassified"]],
        )

    def test_malformed_input_exits_non_zero_without_a_traceback(self) -> None:
        self.seed_root()
        (self.root / "materials.jsonl").write_bytes(b"{oops\n")
        result = self.run_script("--root", self.root)
        self.assertNotEqual(0, result.returncode)
        self.assertNotIn("Traceback", result.stderr)
        self.assertIn("error:", result.stderr)

    def test_missing_root_exits_non_zero(self) -> None:
        result = self.run_script("--root", self.workspace / "absent")
        self.assertNotEqual(0, result.returncode)
        self.assertNotIn("Traceback", result.stderr)

    def test_pre_existing_output_is_never_overwritten(self) -> None:
        self.seed_root()
        destination = self.workspace / "snapshot.json"
        destination.write_bytes(b"original\n")
        result = self.run_script("--root", self.root, "--out", destination)
        self.assertNotEqual(0, result.returncode)
        self.assertEqual(b"original\n", destination.read_bytes())

    def test_writes_a_canonical_snapshot_when_asked(self) -> None:
        self.seed_root()
        destination = self.workspace / "snapshot.json"
        result = self.run_script("--root", self.root, "--out", destination)
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual(result.stdout.encode("utf-8"), destination.read_bytes())


class BuildReleaseCliTests(CliTestCase):
    script_name = "build_release.py"

    def test_help_exits_zero_and_lists_the_planned_flags(self) -> None:
        result = self.run_script("--help")
        self.assertEqual(0, result.returncode, result.stderr)
        for flag in ("--root", "--version", "--out-dir", "--created-at"):
            with self.subTest(flag=flag):
                self.assertIn(flag, result.stdout)

    def test_planned_invocation_over_the_live_root_exits_zero(self) -> None:
        result = self.run_script(
            "--root",
            "data/component-master/registry/v1",
            "--version",
            "0.1.0",
        )
        self.assertEqual(0, result.returncode, result.stderr)
        manifest = json.loads(result.stdout)
        self.assertEqual("release:connector-registry:0.1.0", manifest["release_id"])
        self.assertEqual("NOT-FOR-PRODUCTION", manifest["authority_state"])

    def test_default_invocation_writes_nothing(self) -> None:
        self.populated_root()
        before = sorted(path.name for path in self.root.iterdir())
        result = self.run_script("--root", self.root, "--version", "0.1.0")
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual(
            before, sorted(path.name for path in self.root.iterdir())
        )

    def test_bad_version_is_rejected_before_any_filesystem_work(self) -> None:
        """Task 7 shipped a guard that never ran when the input was empty."""

        absent_root = self.workspace / "absent"
        result = self.run_script(
            "--root", absent_root, "--version", "not-a-version"
        )
        self.assertNotEqual(0, result.returncode)
        self.assertIn("version", result.stderr)
        self.assertFalse(absent_root.exists())

    def test_bad_version_is_rejected_even_with_an_empty_registry(self) -> None:
        self.seed_root()
        out_dir = self.workspace / "out"
        out_dir.mkdir()
        result = self.run_script(
            "--root",
            self.root,
            "--version",
            "0.1",
            "--out-dir",
            out_dir,
        )
        self.assertNotEqual(0, result.returncode)
        self.assertEqual([], sorted(out_dir.iterdir()))

    def test_pre_existing_output_is_never_overwritten(self) -> None:
        self.populated_root()
        out_dir = self.workspace / "out"
        out_dir.mkdir()
        (out_dir / "registry.json").write_bytes(b"original\n")
        result = self.run_script(
            "--root", self.root, "--version", "0.1.0", "--out-dir", out_dir
        )
        self.assertNotEqual(0, result.returncode)
        self.assertEqual(b"original\n", (out_dir / "registry.json").read_bytes())
        self.assertFalse((out_dir / "release-manifest.json").exists())

    def test_malformed_input_exits_non_zero_without_a_traceback(self) -> None:
        self.seed_root()
        (self.root / "materials.jsonl").write_bytes(b'{"item_id": \n')
        result = self.run_script("--root", self.root, "--version", "0.1.0")
        self.assertNotEqual(0, result.returncode)
        self.assertNotIn("Traceback", result.stderr)
        self.assertIn("error:", result.stderr)

    def test_two_runs_write_identical_registry_bytes(self) -> None:
        self.populated_root()
        digests = []
        for name in ("first", "second"):
            out_dir = self.workspace / name
            out_dir.mkdir()
            result = self.run_script(
                "--root",
                self.root,
                "--version",
                "0.1.0",
                "--out-dir",
                out_dir,
                "--created-at",
                CREATED_AT,
            )
            self.assertEqual(0, result.returncode, result.stderr)
            digests.append(
                hashlib.sha256((out_dir / "registry.json").read_bytes()).hexdigest()
            )
        self.assertEqual(digests[0], digests[1])

    def test_failure_mid_publish_leaves_no_partial_output(self) -> None:
        self.populated_root()
        out_dir = self.workspace / "out"
        out_dir.mkdir()
        real_link = os.link
        calls = {"count": 0}

        def failing_link(source: object, destination: object) -> None:
            calls["count"] += 1
            if calls["count"] == 1:
                return real_link(source, destination)
            raise OSError("injected mid-publish failure")

        with mock.patch.object(os, "link", failing_link):
            with self.assertRaises(SystemExit) as caught:
                build_release_cli.main(
                    [
                        "--root",
                        str(self.root),
                        "--version",
                        "0.1.0",
                        "--out-dir",
                        str(out_dir),
                    ]
                )
        self.assertEqual(2, caught.exception.code)
        self.assertEqual([], sorted(out_dir.iterdir()))

    def test_in_process_main_returns_zero_for_the_live_root(self) -> None:
        captured = io.StringIO()
        with contextlib.redirect_stdout(captured):
            code = build_release_cli.main(
                [
                    "--root",
                    str(LIVE_REGISTRY_ROOT),
                    "--version",
                    "0.1.0",
                    "--created-at",
                    CREATED_AT,
                ]
            )
        self.assertEqual(0, code)
        self.assertEqual(
            "release:connector-registry:0.1.0",
            json.loads(captured.getvalue())["release_id"],
        )

    def test_check_coverage_main_returns_zero_for_the_live_root(self) -> None:
        captured = io.StringIO()
        with contextlib.redirect_stdout(captured):
            code = check_coverage_cli.main(
                [
                    "--root",
                    str(LIVE_REGISTRY_ROOT),
                    "--fail-on-unclassified",
                ]
            )
        self.assertEqual(0, code)
        self.assertIn(
            "covers nothing",
            json.loads(captured.getvalue())["coverage_statement"],
        )


class WriteNewFilesTests(TemporaryRootTestCase):
    def test_refuses_a_pre_existing_destination(self) -> None:
        destination = self.workspace / "a.json"
        destination.write_bytes(b"x")
        with self.assertRaises(FileExistsError):
            write_new_files({destination: b"y"})
        self.assertEqual(b"x", destination.read_bytes())

    def test_refuses_a_missing_parent_directory(self) -> None:
        with self.assertRaises(FileNotFoundError):
            write_new_files({self.workspace / "absent" / "a.json": b"y"})

    def test_publishes_all_or_nothing(self) -> None:
        first = self.workspace / "a.json"
        second = self.workspace / "b.json"
        real_link = os.link
        calls = {"count": 0}

        def failing_link(source: object, destination: object) -> None:
            calls["count"] += 1
            if calls["count"] == 1:
                return real_link(source, destination)
            raise OSError("injected")

        with mock.patch.object(os, "link", failing_link):
            with self.assertRaises(OSError):
                write_new_files({first: b"a", second: b"b"})
        self.assertFalse(first.exists())
        self.assertFalse(second.exists())
        self.assertEqual([], sorted(self.workspace.iterdir()))

    def test_leaves_no_temporary_files_on_success(self) -> None:
        destination = self.workspace / "a.json"
        write_new_files({destination: b"a"})
        self.assertEqual(
            ["a.json"], sorted(path.name for path in self.workspace.iterdir())
        )


# ---------------------------------------------------------------------------
# Authority boundary
# ---------------------------------------------------------------------------


class AuthorityBoundaryTests(unittest.TestCase):
    def test_task_8_modules_expose_no_manufacturing_or_signing_api(self) -> None:
        from monolith_component_master import coverage, releases

        for module in (coverage, releases):
            for name in dir(module):
                with self.subTest(module=module.__name__, name=name):
                    lowered = name.lower()
                    for forbidden in (
                        "sign",
                        "freeze",
                        "approve",
                        "manufactur",
                        "export_dxf",
                        "production",
                    ):
                        self.assertNotIn(forbidden, lowered)

    def test_no_network_module_is_imported(self) -> None:
        source = (
            PACKAGE_SOURCE / "monolith_component_master" / "releases.py"
        ).read_text(encoding="utf-8")
        source += (
            PACKAGE_SOURCE / "monolith_component_master" / "coverage.py"
        ).read_text(encoding="utf-8")
        for forbidden in ("urllib", "requests", "http.client", "socket"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, source)

    def test_release_does_not_claim_completeness(self) -> None:
        release = build_release(
            root=LIVE_REGISTRY_ROOT,
            version="0.1.0",
            created_at_utc=CREATED_AT,
        )
        text = release.payload_bytes.decode("utf-8")
        for forbidden in ("complete", "production-ready", "qualified"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, text.lower())


if __name__ == "__main__":  # pragma: no cover - manual invocation
    unittest.main()
