"""Contracts for the declared first-cohort brand and source denominator.

Task 9 declares **what we intend to cover**. It fetches nothing, reads no
publisher document, and ingests no assertion. Every URL named in
``source-denominator.jsonl`` is **unvisited by this task**: not verified, not
reachable, not current, and not rights-reviewed. Nothing here is a
manufacturing, freeze, export, production or physical-qualification claim, and
``NOT-FOR-PRODUCTION`` stays intact.

Twelve brands are a **first cohort selected for review**, not the connector
market and not a worldwide registry. No test in this file asserts completeness,
and several assert the opposite.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, fields
from functools import cached_property
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unicodedata
import unittest


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
PACKAGE_SOURCE = REPOSITORY_ROOT / "packages" / "component-master" / "src"
sys.path.insert(0, str(PACKAGE_SOURCE))

from monolith_component_master import coverage as coverage_module  # noqa: E402
from monolith_component_master.coverage import (  # noqa: E402
    EVIDENCE_GATE_REASONS,
    GATE_REASONS_DEMONSTRATED_THROUGH_DISCOVERY,
    SOURCE_DENOMINATOR_STATES,
    BlockedSource,
    BrandUniverseEntry,
    CoverageSnapshot,
    MeasuredCount,
    SourceDenominatorEntry,
    build_snapshot,
    discover_registry_root,
)
from monolith_component_master import releases as releases_module  # noqa: E402
from monolith_component_master.releases import (  # noqa: E402
    build_release,
    canonical_json_bytes,
    snapshot_payload,
)


LIVE_REGISTRY_ROOT = (
    REPOSITORY_ROOT / "data" / "component-master" / "registry" / "v1"
)
COMMITTED_SNAPSHOT = LIVE_REGISTRY_ROOT / "coverage-snapshot.json"
BRAND_UNIVERSE_FILENAME = "brand-universe.jsonl"
SOURCE_DENOMINATOR_FILENAME = "source-denominator.jsonl"
CREATED_AT = "2026-07-31T09:14:03.510477+00:00"

DECLARED_UNREAD = "DECLARED_UNREAD"
DECLARED_UNREAD_GATE_REASON = "SOURCE_DECLARED_UNREAD"

# The approved first cohort, named exactly as the implementation plan names it.
# Order here is the plan's table order, so a reviewer can diff the two directly.
# It is not rank and it is not output order: the reader sorts what it publishes.
EXPECTED_FIRST_COHORT: tuple[tuple[str, str], ...] = (
    ("brand:hafele", "Häfele"),
    ("brand:hettich", "Hettich"),
    ("brand:titus", "Titus"),
    ("brand:lamello", "Lamello"),
    ("brand:italiana-ferramenta", "Italiana Ferramenta"),
    ("brand:ovvo", "OVVO"),
    ("brand:lockdowel", "Lockdowel"),
    ("brand:valinge-threespine", "Välinge/Threespine"),
    ("brand:knapp", "KNAPP"),
    ("brand:festool-domino", "Festool DOMINO"),
    ("brand:hoffmann-machine-company", "Hoffmann Machine Company"),
    ("brand:blum", "Blum"),
)

# Official source roots, transcribed from the plan's Step 3 table, one row per
# URL the plan states literally. Unvisited by this task.
#
# Two plan cells name a further source in prose rather than as a URL — Lamello's
# "current OEM catalog linked there" and Hoffmann's "OEM product/machine
# documents linked from the site". Neither is transcribed, because no URL for
# them exists in the plan and inventing one would fabricate a source.
EXPECTED_DECLARED_SOURCES: tuple[tuple[str, str, str], ...] = (
    (
        "source:hafele:connectors-index",
        "brand:hafele",
        "https://www.hafele.com/us/en/products/furniture-fittings-living-"
        "solutions/connectors-shelf-supports/connectors/50/",
    ),
    (
        "source:hettich:connecting-fittings-index",
        "brand:hettich",
        "https://shop.hettich.com/us_EN/Further-products/Connecting-"
        "technology/Connecting-fittings-for-cabinet-bodies/c/"
        "group824491857740",
    ),
    (
        "source:titus:cabinet-connectors-index",
        "brand:titus",
        "https://cabinet.titusplus.com/us/en/cabinet-connectors",
    ),
    (
        "source:lamello:p-system-index",
        "brand:lamello",
        "https://lamello.com/products/p-system",
    ),
    (
        "source:italiana-ferramenta:connectings-index",
        "brand:italiana-ferramenta",
        "https://www.italianaferramenta.it/en/catalog/connectings",
    ),
    (
        "source:ovvo:connector-types-index",
        "brand:ovvo",
        "https://ovvotech.com/furniture-connector-types/",
    ),
    (
        "source:lockdowel:cabinets-index",
        "brand:lockdowel",
        "https://lockdowel.com/cabinets/",
    ),
    (
        "source:lockdowel:downloads-index",
        "brand:lockdowel",
        "https://lockdowel.com/downloads/",
    ),
    (
        "source:valinge-threespine:threespine-index",
        "brand:valinge-threespine",
        "https://valinge.com/threespine/this-is-threespine/",
    ),
    (
        "source:knapp:cabinets-closets-case-goods-index",
        "brand:knapp",
        "https://knappconnectors.com/industries/cabinets-closets-and-case-"
        "goods/",
    ),
    (
        "source:festool-domino:kv-sys-d8",
        "brand:festool-domino",
        "https://www.festoolusa.com/accessories/joining/accessories-for-"
        "joining/domino-connectors/576797---kv-sys-d8",
    ),
    (
        "source:festool-domino:sv-sys-d14",
        "brand:festool-domino",
        "https://www.festoolusa.com/accessories/joining/accessories-for-"
        "joining/domino-connectors/576795---sv-sys-d14",
    ),
    (
        "source:hoffmann-machine-company:faq-index",
        "brand:hoffmann-machine-company",
        "https://hoffmann-usa.com/faq/",
    ),
    (
        "source:blum:thin-fronts-assembly-index",
        "brand:blum",
        "https://www.blum.com/eu/en/products/various-products/thin-fronts/"
        "assembly/",
    ),
)

BRAND_COUNT = len(EXPECTED_FIRST_COHORT)
SOURCE_COUNT = len(EXPECTED_DECLARED_SOURCES)

DEMO_SOURCE_ID = "source:demo:catalog"
DEMO_ITEM_ID = "sku:demo:item-1"
DEMO_ASSERTION_ID = "assertion:demo:identity-1"
DEMO_CONTENT = b"demo catalogue page bytes"
DEMO_SHA256 = hashlib.sha256(DEMO_CONTENT).hexdigest()
DECLARED_ID = "source:demo:declared"
DECLARED_URL = "https://example.invalid/declared"
ALL_DIMENSIONS = (
    "bom",
    "commercial",
    "field",
    "geometry",
    "identity",
    "lifecycle",
    "material_thickness",
    "rights",
    "structural",
    "tooling",
)


def source_ids_for(brand_id: str) -> tuple[str, ...]:
    return tuple(
        source_id
        for source_id, owner, _url in EXPECTED_DECLARED_SOURCES
        if owner == brand_id
    )


def expected_brand_rows() -> list[dict[str, object]]:
    return [
        {
            "brand_id": brand_id,
            "brand_name": brand_name,
            "source_ids": list(source_ids_for(brand_id)),
        }
        for brand_id, brand_name in EXPECTED_FIRST_COHORT
    ]


def expected_source_rows() -> list[dict[str, object]]:
    return [
        {"source_id": source_id, "state": DECLARED_UNREAD, "url": url}
        for source_id, _brand_id, url in EXPECTED_DECLARED_SOURCES
    ]


def write_jsonl(path: Path, records: list[Mapping[str, object]]) -> None:
    path.write_bytes(
        b"".join(
            json.dumps(
                dict(record),
                ensure_ascii=False,
                sort_keys=True,
                separators=(",", ":"),
            ).encode("utf-8")
            + b"\n"
            for record in records
        )
    )


def read_jsonl(path: Path) -> tuple[Mapping[str, object], ...]:
    text = path.read_text(encoding="utf-8")
    return tuple(json.loads(line) for line in text.split("\n") if line.strip())


def brand_row(
    brand_id: str = "brand:demo",
    brand_name: str = "Demo Brand",
    source_ids: list[str] | None = None,
) -> dict[str, object]:
    return {
        "brand_id": brand_id,
        "brand_name": brand_name,
        "source_ids": [DECLARED_ID] if source_ids is None else source_ids,
    }


def declared_row(
    source_id: str = DECLARED_ID,
    url: str = DECLARED_URL,
) -> dict[str, object]:
    return {"source_id": source_id, "state": DECLARED_UNREAD, "url": url}


def blocked_row(
    source_id: str = "source:demo:blocked",
    sha256: str | None = None,
    blocked_reason: str = "PAYWALLED",
) -> dict[str, object]:
    return {
        "blocked_reason": blocked_reason,
        "sha256": (
            hashlib.sha256(b"blocked").hexdigest() if sha256 is None else sha256
        ),
        "source_id": source_id,
        "state": "BLOCKED",
    }


def dimension_states(**overrides: str) -> dict[str, str]:
    states = {name: "PENDING" for name in ALL_DIMENSIONS}
    states.update(overrides)
    return states


def item_row(
    *,
    item_id: str = DEMO_ITEM_ID,
    source_id: str = DEMO_SOURCE_ID,
) -> dict[str, object]:
    return {
        "item_id": item_id,
        "classification": "VERIFIED",
        "dimension_states": dimension_states(identity="VERIFIED"),
        "assertions": [
            {
                "assertion_id": DEMO_ASSERTION_ID,
                "entity_id": item_id,
                "field_path": "identity.exact_sku",
                "value": "ITEM-1",
                "source_id": source_id,
                "locator": "page 24",
                "reviewer": "reviewer:demo",
                "review_state": "VERIFIED",
            }
        ],
    }


def manifest_row(source_id: str = DEMO_SOURCE_ID) -> dict[str, object]:
    return {
        "source_id": source_id,
        "publisher": "Demo Publisher",
        "url": "https://example.invalid/catalogue",
        "edition": "2026",
        "region": "GLOBAL",
        "accessed_at": "2026-07-31",
        "sha256": DEMO_SHA256,
        "rights_state": "FACTUAL_INDEXING_ALLOWED",
        "content_path": "_source-cache/demo.bin",
    }


class RootCase(unittest.TestCase):
    """A scratch registry root carrying the five seed filenames the reader knows."""

    SEED_ITEM_FILENAMES = (
        "bom-edges.jsonl",
        "compatibility-edges.jsonl",
        "materials.jsonl",
        "qualification-envelopes.jsonl",
    )

    def setUp(self) -> None:
        self._directory = tempfile.TemporaryDirectory()
        self.addCleanup(self._directory.cleanup)
        self.workspace = Path(self._directory.name)
        self.root = self.new_root("v1")

    def new_root(self, name: str) -> Path:
        root = self.workspace / name
        root.mkdir(parents=True, exist_ok=True)
        for filename in self.SEED_ITEM_FILENAMES:
            (root / filename).write_bytes(b"\n")
        (root / "evidence-manifest.jsonl").write_bytes(b"\n")
        return root

    def with_brands(
        self, rows: list[Mapping[str, object]], root: Path | None = None
    ) -> Path:
        target = self.root if root is None else root
        write_jsonl(target / BRAND_UNIVERSE_FILENAME, rows)
        return target

    def with_declared(
        self, rows: list[Mapping[str, object]], root: Path | None = None
    ) -> Path:
        target = self.root if root is None else root
        write_jsonl(target / SOURCE_DENOMINATOR_FILENAME, rows)
        return target

    def with_cached_source(self, root: Path | None = None) -> Path:
        target = self.root if root is None else root
        cache = target / "_source-cache"
        cache.mkdir(parents=True, exist_ok=True)
        (cache / "demo.bin").write_bytes(DEMO_CONTENT)
        return target

    def one_declared_brand(self, root: Path | None = None) -> Path:
        target = self.root if root is None else root
        self.with_brands([brand_row()], target)
        self.with_declared([declared_row()], target)
        return target

    def assert_refused(self, root: Path, *fragments: str) -> str:
        with self.assertRaises(ValueError) as caught:
            discover_registry_root(root)
        message = str(caught.exception)
        for fragment in fragments:
            self.assertIn(fragment, message)
        return message


# ---------------------------------------------------------------------------
# 1. The exact brand set — twelve, no more and no fewer
# ---------------------------------------------------------------------------


class FirstCohortBrandSetTests(RootCase):
    def committed_brands(self) -> tuple[tuple[str, str], ...]:
        rows = read_jsonl(LIVE_REGISTRY_ROOT / BRAND_UNIVERSE_FILENAME)
        return tuple(
            (str(row["brand_id"]), str(row["brand_name"])) for row in rows
        )

    def test_the_committed_file_declares_exactly_the_first_cohort(self) -> None:
        self.assertEqual(
            set(EXPECTED_FIRST_COHORT), set(self.committed_brands())
        )
        self.assertEqual(BRAND_COUNT, len(self.committed_brands()))

    def test_the_snapshot_measures_exactly_the_same_twelve(self) -> None:
        snapshot = build_snapshot(LIVE_REGISTRY_ROOT)
        self.assertEqual(
            tuple(sorted(EXPECTED_FIRST_COHORT)),
            tuple(
                (entry.brand_id, entry.brand_name)
                for entry in snapshot.brand_universe
            ),
        )

    def test_a_thirteenth_brand_is_a_failure_not_a_silent_addition(
        self,
    ) -> None:
        """The exact-set assertion above is load-bearing, demonstrated here.

        A thirteenth brand is a structurally valid row; the reader has no
        opinion on how many brands there should be, and inventing one would be
        a number with no source. What must catch an addition is the exact-set
        comparison, so this drives a root carrying thirteen and watches that
        comparison refuse it.
        """

        root = self.new_root("thirteen")
        rows = expected_brand_rows()
        rows.append(brand_row("brand:surprise", "Surprise Fittings"))
        self.with_brands(rows, root)
        self.with_declared(expected_source_rows() + [declared_row()], root)
        measured = tuple(
            (entry.brand_id, entry.brand_name)
            for entry in build_snapshot(root).brand_universe
        )
        self.assertEqual(BRAND_COUNT + 1, len(measured))
        self.assertNotEqual(set(EXPECTED_FIRST_COHORT), set(measured))

    def test_the_committed_source_roots_are_exactly_as_declared(self) -> None:
        rows = read_jsonl(LIVE_REGISTRY_ROOT / SOURCE_DENOMINATOR_FILENAME)
        self.assertEqual(SOURCE_COUNT, len(rows))
        self.assertEqual(
            {
                (source_id, url)
                for source_id, _brand, url in EXPECTED_DECLARED_SOURCES
            },
            {(str(row["source_id"]), str(row["url"])) for row in rows},
        )

    def test_every_committed_source_is_claimed_by_its_brand(self) -> None:
        claimed: dict[str, str] = {}
        for row in read_jsonl(LIVE_REGISTRY_ROOT / BRAND_UNIVERSE_FILENAME):
            for source_id in row["source_ids"]:  # type: ignore[union-attr]
                claimed[str(source_id)] = str(row["brand_id"])
        self.assertEqual(
            {
                source_id: brand_id
                for source_id, brand_id, _url in EXPECTED_DECLARED_SOURCES
            },
            claimed,
        )

    # -- a brand row must be refusable ------------------------------------

    def test_a_brand_row_with_an_unknown_field_is_refused(self) -> None:
        root = self.new_root("brand-unknown")
        row = brand_row()
        row["url"] = "https://example.invalid/brand"
        self.with_brands([row], root)
        self.assert_refused(root, f"{BRAND_UNIVERSE_FILENAME}:1", "url")

    def test_a_brand_row_missing_a_required_field_is_refused(self) -> None:
        for field in ("brand_id", "brand_name", "source_ids"):
            with self.subTest(field=field):
                root = self.new_root(f"brand-missing-{field}")
                row = brand_row()
                row.pop(field)
                self.with_brands([row], root)
                self.assert_refused(
                    root, f"{BRAND_UNIVERSE_FILENAME}:1", field
                )

    def test_a_non_canonical_brand_id_is_refused(self) -> None:
        root = self.new_root("brand-id")
        self.with_brands([brand_row("Hafele", "Häfele")], root)
        self.assert_refused(root, f"{BRAND_UNIVERSE_FILENAME}:1", "brand_id")

    def test_a_blank_brand_name_is_refused(self) -> None:
        root = self.new_root("brand-blank")
        self.with_brands([brand_row("brand:demo", "  ")], root)
        self.assert_refused(root, f"{BRAND_UNIVERSE_FILENAME}:1", "brand_name")

    def test_a_brand_claiming_no_source_is_refused(self) -> None:
        root = self.new_root("brand-idle")
        self.with_brands([brand_row(source_ids=[])], root)
        self.assert_refused(
            root, f"{BRAND_UNIVERSE_FILENAME}:1", "source_ids"
        )

    def test_a_duplicate_brand_id_is_refused(self) -> None:
        root = self.new_root("brand-dup-id")
        self.with_brands(
            [brand_row("brand:demo", "One"), brand_row("brand:demo", "Two")],
            root,
        )
        self.assert_refused(root, f"{BRAND_UNIVERSE_FILENAME}:2", "brand:demo")

    def test_a_duplicate_brand_name_is_refused(self) -> None:
        root = self.new_root("brand-dup-name")
        self.with_brands(
            [brand_row("brand:one", "Same"), brand_row("brand:two", "Same")],
            root,
        )
        self.assert_refused(root, f"{BRAND_UNIVERSE_FILENAME}:2", "Same")

    def test_two_brands_cannot_claim_the_same_source(self) -> None:
        root = self.new_root("brand-shared-source")
        self.with_brands(
            [brand_row("brand:one", "One"), brand_row("brand:two", "Two")],
            root,
        )
        self.with_declared([declared_row()], root)
        self.assert_refused(root, DECLARED_ID)

    # -- the two files must agree with each other -------------------------

    def test_a_brand_claiming_a_source_nobody_declared_is_refused(
        self,
    ) -> None:
        root = self.new_root("ghost-source")
        self.with_brands([brand_row(source_ids=["source:demo:ghost"])], root)
        self.with_declared([declared_row()], root)
        self.assert_refused(
            root, BRAND_UNIVERSE_FILENAME, "source:demo:ghost"
        )

    def test_a_declared_source_claimed_by_no_brand_is_refused(self) -> None:
        root = self.new_root("unclaimed-source")
        self.with_declared([declared_row()], root)
        self.assert_refused(root, DECLARED_ID, BRAND_UNIVERSE_FILENAME)

    def test_a_brand_universe_with_no_denominator_file_is_refused(
        self,
    ) -> None:
        root = self.new_root("brands-only")
        self.with_brands([brand_row()], root)
        self.assert_refused(root, DECLARED_ID)

    def test_a_zero_record_brand_file_still_contributes_nothing(self) -> None:
        root = self.new_root("zero-brands")
        (root / BRAND_UNIVERSE_FILENAME).write_bytes(b"\n")
        result = discover_registry_root(root)
        self.assertEqual((), result.brand_universe)
        self.assertEqual((), result.source_denominator)

    def test_a_blocked_row_needs_no_brand(self) -> None:
        """Task 8's blocked-row contract is unchanged and still stands alone.

        A blocked source can reach the denominator from the evidence manifest,
        where no brand is involved at all, so requiring a brand claim for it
        would refuse a shape the reader already produces itself.
        """

        root = self.new_root("blocked-unclaimed")
        self.with_declared([blocked_row()], root)
        snapshot = build_snapshot(root)
        self.assertEqual(1, snapshot.blocked_source_count.count)
        self.assertEqual((), snapshot.brand_universe)


# ---------------------------------------------------------------------------
# 2/3/4. Counted, named and spoken — and neither registered nor blocked
# ---------------------------------------------------------------------------


class DeclaredUnreadStateTests(RootCase):
    def test_the_state_vocabulary_is_exactly_three_states(self) -> None:
        self.assertEqual(
            ("BLOCKED", DECLARED_UNREAD, "REGISTERED"),
            SOURCE_DENOMINATOR_STATES,
        )

    def test_the_live_root_counts_the_declared_but_unread_sources(
        self,
    ) -> None:
        measured = build_snapshot(
            LIVE_REGISTRY_ROOT
        ).declared_unread_source_count
        self.assertEqual(SOURCE_COUNT, measured.count)
        self.assertEqual(SOURCE_COUNT, measured.denominator)
        self.assertEqual("sources_in_denominator", measured.denominator_label)
        self.assertTrue(measured.measured_by)

    def test_the_rendered_statement_speaks_the_declared_but_unread_clause(
        self,
    ) -> None:
        """The owner's binding constraint on OR-9.1, asserted on the sentence.

        A count excluded from ``registered_source_count`` but never spoken is
        the coverage inflation this module exists to prevent, so the assertion
        is on the literal rendered string and not on the integer behind it.
        """

        statement = build_snapshot(LIVE_REGISTRY_ROOT).coverage_statement
        self.assertIn(
            f"{SOURCE_COUNT} of {SOURCE_COUNT} named sources declared but "
            "not yet read",
            statement,
        )
        self.assertIn(
            f"0 of {BRAND_COUNT} declared first-cohort brands", statement
        )
        self.assertIn("first cohort", statement)
        self.assertIn("covers nothing", statement)

    def test_the_published_payload_carries_the_same_sentence(self) -> None:
        payload = json.loads(
            build_release(
                root=LIVE_REGISTRY_ROOT,
                version="0.1.0",
                created_at_utc=CREATED_AT,
            ).payload_bytes
        )
        self.assertIn(
            f"{SOURCE_COUNT} of {SOURCE_COUNT} named sources declared but "
            "not yet read",
            payload["coverage_statement"],
        )
        self.assertEqual("NOT-FOR-PRODUCTION", payload["authority_state"])
        self.assertEqual(0, payload["discovered_item_count"])

    def test_a_declared_unread_source_does_not_move_registered(self) -> None:
        root = self.new_root("registered-stable")
        write_jsonl(root / "evidence-manifest.jsonl", [manifest_row()])
        self.with_cached_source(root)
        before = build_snapshot(root).registered_source_count
        self.assertEqual(1, before.count)
        self.assertEqual(1, before.denominator)

        self.one_declared_brand(root)
        after = build_snapshot(root).registered_source_count
        self.assertEqual(1, after.count)
        self.assertEqual(2, after.denominator)

    def test_a_declared_unread_source_does_not_move_blocked(self) -> None:
        root = self.new_root("blocked-stable")
        self.with_brands([brand_row()], root)
        self.with_declared([blocked_row(), declared_row()], root)
        snapshot = build_snapshot(root)
        self.assertEqual(1, snapshot.blocked_source_count.count)
        self.assertEqual(2, snapshot.blocked_source_count.denominator)
        self.assertEqual(1, snapshot.declared_unread_source_count.count)
        self.assertEqual(0, snapshot.registered_source_count.count)
        self.assertEqual(
            ("source:demo:blocked",),
            tuple(record.source_id for record in snapshot.blocked_sources),
        )

    def test_the_two_states_are_distinguishable_in_the_payload(self) -> None:
        root = self.new_root("distinguishable")
        self.with_brands([brand_row()], root)
        self.with_declared([blocked_row(), declared_row()], root)
        payload = json.loads(
            canonical_json_bytes(snapshot_payload(build_snapshot(root)))
        )
        rows = {row["source_id"]: row for row in payload["source_denominator"]}
        self.assertEqual("BLOCKED", rows["source:demo:blocked"]["state"])
        self.assertEqual(DECLARED_UNREAD, rows[DECLARED_ID]["state"])
        # Shape, not only spelling: a blocked row carries the digest whose
        # verification failed; a declared-unread row holds no digest key at all.
        self.assertIn("sha256", rows["source:demo:blocked"])
        self.assertNotIn("sha256", rows[DECLARED_ID])
        self.assertEqual(DECLARED_URL, rows[DECLARED_ID]["url"])
        self.assertNotIn("url", rows["source:demo:blocked"])

    # -- 6. a digest for bytes nobody holds is refused, never ignored ------

    def test_the_type_refuses_a_digest_on_the_declared_unread_state(
        self,
    ) -> None:
        with self.assertRaises(ValueError) as caught:
            SourceDenominatorEntry(
                source_id=DECLARED_ID,
                sha256=DEMO_SHA256,
                state=DECLARED_UNREAD,
                url=DECLARED_URL,
            )
        self.assertIn("sha256", str(caught.exception))

    def test_the_type_still_requires_a_digest_for_the_other_states(
        self,
    ) -> None:
        for state in ("BLOCKED", "REGISTERED"):
            with self.subTest(state=state):
                with self.assertRaises((TypeError, ValueError)) as caught:
                    SourceDenominatorEntry(
                        source_id=DECLARED_ID, sha256=None, state=state
                    )
                self.assertIn("sha256", str(caught.exception))

    def test_the_type_refuses_a_url_on_the_other_states(self) -> None:
        with self.assertRaises(ValueError) as caught:
            SourceDenominatorEntry(
                source_id=DECLARED_ID,
                sha256=DEMO_SHA256,
                state="BLOCKED",
                url=DECLARED_URL,
            )
        self.assertIn("url", str(caught.exception))

    def test_the_file_refuses_a_digest_on_the_declared_unread_state(
        self,
    ) -> None:
        root = self.new_root("declared-digest")
        self.with_brands([brand_row()], root)
        row = declared_row()
        row["sha256"] = DEMO_SHA256
        self.with_declared([row], root)
        self.assert_refused(
            root, f"{SOURCE_DENOMINATOR_FILENAME}:1", "sha256", DECLARED_UNREAD
        )

    def test_blocked_still_requires_its_digest(self) -> None:
        root = self.new_root("blocked-digest")
        row = blocked_row()
        row.pop("sha256")
        self.with_declared([row], root)
        self.assert_refused(root, f"{SOURCE_DENOMINATOR_FILENAME}:1", "sha256")

    def test_a_declared_unread_row_refuses_a_blocked_reason(self) -> None:
        root = self.new_root("declared-reason")
        self.with_brands([brand_row()], root)
        row = declared_row()
        row["blocked_reason"] = "NOT_YET_FETCHED"
        self.with_declared([row], root)
        self.assert_refused(
            root,
            f"{SOURCE_DENOMINATOR_FILENAME}:1",
            "blocked_reason",
            DECLARED_UNREAD,
        )

    def test_a_declared_unread_row_requires_its_url(self) -> None:
        root = self.new_root("declared-missing-url")
        self.with_brands([brand_row()], root)
        row = declared_row()
        row.pop("url")
        self.with_declared([row], root)
        self.assert_refused(root, f"{SOURCE_DENOMINATOR_FILENAME}:1", "url")

    def test_a_declared_url_must_be_an_https_url(self) -> None:
        for index, url in enumerate(
            (
                "http://example.invalid/x",
                "example.invalid/x",
                " ",
                "https://",
                "https://example.invalid/a b",
            )
        ):
            with self.subTest(url=url):
                root = self.new_root(f"declared-url-{index}")
                self.with_brands([brand_row()], root)
                self.with_declared([declared_row(url=url)], root)
                self.assert_refused(
                    root, f"{SOURCE_DENOMINATOR_FILENAME}:1", "url"
                )

    def test_registered_is_still_refused_from_the_file(self) -> None:
        root = self.new_root("registered-declared")
        self.with_declared(
            [
                {
                    "sha256": DEMO_SHA256,
                    "source_id": DECLARED_ID,
                    "state": "REGISTERED",
                }
            ],
            root,
        )
        self.assert_refused(root, "REGISTERED", "evidence-manifest.jsonl")

    def test_an_unknown_state_names_all_three_permitted_states(self) -> None:
        root = self.new_root("unknown-state")
        row = declared_row()
        row["state"] = "REVIEWED"
        self.with_declared([row], root)
        message = self.assert_refused(root, f"{SOURCE_DENOMINATOR_FILENAME}:1")
        for state in SOURCE_DENOMINATOR_STATES:
            self.assertIn(state, message)

    def test_a_brand_entry_is_frozen_and_carries_its_sources(self) -> None:
        entry = BrandUniverseEntry(
            brand_id="brand:demo",
            brand_name="Demo Brand",
            source_ids=(DECLARED_ID,),
        )
        self.assertEqual((DECLARED_ID,), entry.source_ids)
        with self.assertRaises(ValueError):
            BrandUniverseEntry(
                brand_id="brand:demo", brand_name="Demo", source_ids=()
            )
        with self.assertRaises(TypeError):
            BrandUniverseEntry(
                brand_id="brand:demo",
                brand_name="Demo",
                source_ids={DECLARED_ID},
            )


# ---------------------------------------------------------------------------
# 5. The evidence gate refuses the new state distinctly
# ---------------------------------------------------------------------------


class DeclaredUnreadGateTests(RootCase):
    def declared_root(self, name: str) -> Path:
        root = self.new_root(name)
        self.with_brands([brand_row()], root)
        self.with_declared([declared_row()], root)
        write_jsonl(
            root / "materials.jsonl", [item_row(source_id=DECLARED_ID)]
        )
        return root

    def test_a_verified_claim_on_a_declared_unread_source_is_refused(
        self,
    ) -> None:
        snapshot = build_snapshot(self.declared_root("gate-declared"))
        self.assertEqual(
            (DECLARED_UNREAD_GATE_REASON,),
            tuple(
                finding.reason for finding in snapshot.evidence_gate_findings
            ),
        )

    def test_the_refusal_does_not_collapse_into_source_not_registered(
        self,
    ) -> None:
        """``SOURCE_NOT_REGISTERED`` means *not in the denominator at all*.

        That is a different and less alarming fact than *declared, and nobody
        has read it yet*, so the two must not share a reason code.
        """

        declared = build_snapshot(self.declared_root("gate-distinct"))
        self.assertNotIn(
            "SOURCE_NOT_REGISTERED",
            [finding.reason for finding in declared.evidence_gate_findings],
        )
        absent_root = self.new_root("gate-absent")
        write_jsonl(
            absent_root / "materials.jsonl",
            [item_row(source_id="source:demo:ghost")],
        )
        self.assertEqual(
            ("SOURCE_NOT_REGISTERED",),
            tuple(
                finding.reason
                for finding in build_snapshot(
                    absent_root
                ).evidence_gate_findings
            ),
        )

    def test_the_refusal_does_not_collapse_into_a_blocked_reason(self) -> None:
        root = self.new_root("gate-not-blocked")
        self.with_brands([brand_row()], root)
        self.with_declared([blocked_row(), declared_row()], root)
        write_jsonl(
            root / "materials.jsonl", [item_row(source_id=DECLARED_ID)]
        )
        reasons = [
            finding.reason
            for finding in build_snapshot(root).evidence_gate_findings
        ]
        self.assertEqual([DECLARED_UNREAD_GATE_REASON], reasons)
        self.assertNotIn("SOURCE_BLOCKED_IN_MANIFEST", reasons)

    def test_the_reason_is_in_the_closed_allowlist_and_demonstrated(
        self,
    ) -> None:
        self.assertIn(DECLARED_UNREAD_GATE_REASON, EVIDENCE_GATE_REASONS)
        self.assertIn(
            DECLARED_UNREAD_GATE_REASON,
            GATE_REASONS_DEMONSTRATED_THROUGH_DISCOVERY,
        )

    def test_such_an_item_is_not_counted_as_verified(self) -> None:
        snapshot = build_snapshot(self.declared_root("gate-uncounted"))
        self.assertEqual(1, snapshot.discovered_item_count)
        self.assertEqual(0, snapshot.verified_item_count.count)
        self.assertEqual(1, snapshot.unbacked_verified_item_count.count)
        self.assertEqual((DEMO_ITEM_ID,), snapshot.unbacked_item_ids)


# ---------------------------------------------------------------------------
# 7. The plan's own Step 4 command, over the real committed files
# ---------------------------------------------------------------------------


class PlanStepFourTests(unittest.TestCase):
    def run_cli(
        self, script: str, *arguments: str
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                "-B",
                str(REPOSITORY_ROOT / "tools" / "connector_registry" / script),
                *arguments,
            ],
            cwd=REPOSITORY_ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            check=False,
        )

    def test_check_coverage_exits_zero_over_the_committed_files(self) -> None:
        completed = self.run_cli(
            "check_coverage.py",
            "--root",
            "data/component-master/registry/v1",
            "--fail-on-unclassified",
        )
        self.assertEqual(0, completed.returncode, completed.stderr)
        payload = json.loads(completed.stdout)
        self.assertEqual(0, payload["discovered_item_count"])
        self.assertEqual(SOURCE_COUNT, len(payload["source_denominator"]))

    def test_build_release_exits_zero_over_the_committed_files(self) -> None:
        completed = self.run_cli(
            "build_release.py",
            "--root",
            "data/component-master/registry/v1",
            "--version",
            "0.1.0",
        )
        self.assertEqual(0, completed.returncode, completed.stderr)


# ---------------------------------------------------------------------------
# 8/9. Determinism over non-empty input, and the pinned snapshot digest
# ---------------------------------------------------------------------------


class DeterminismOverDeclaredInputTests(RootCase):
    # Content derived, not environment derived: the SHA-256 of the canonical
    # payload bytes built over the committed registry root, which is also
    # `data/component-master/registry/v1/coverage-snapshot.json` byte for byte.
    LIVE_PAYLOAD_SHA256 = (
        "72ccc63ff4a3fd716adf7f3c10804d3ba7a5b179011134588b30bf68297fd788"
    )
    LIVE_PAYLOAD_BYTE_COUNT = 8930

    def build_bytes(self, name: str, rows: list[Mapping[str, object]]) -> bytes:
        root = self.new_root(name)
        self.with_brands(expected_brand_rows(), root)
        self.with_declared(rows, root)
        return build_release(
            root=root, version="0.1.0", created_at_utc=CREATED_AT
        ).payload_bytes

    def test_reversed_declaration_order_does_not_change_output_bytes(
        self,
    ) -> None:
        rows = expected_source_rows()
        forward = self.build_bytes("order-forward", rows)
        reverse = self.build_bytes("order-reverse", list(reversed(rows)))
        self.assertEqual(forward, reverse)
        self.assertEqual(
            hashlib.sha256(forward).hexdigest(),
            hashlib.sha256(reverse).hexdigest(),
        )

    def test_two_separate_processes_agree_over_the_live_root(self) -> None:
        environment = dict(os.environ)
        environment["PYTHONHASHSEED"] = "random"
        environment["PYTHONDONTWRITEBYTECODE"] = "1"
        payloads: list[bytes] = []
        digests: list[str] = []
        for index in (1, 2):
            out_dir = self.workspace / f"live-out-{index}"
            out_dir.mkdir()
            completed = subprocess.run(
                [
                    sys.executable,
                    "-B",
                    str(
                        REPOSITORY_ROOT
                        / "tools"
                        / "connector_registry"
                        / "build_release.py"
                    ),
                    "--root",
                    str(LIVE_REGISTRY_ROOT),
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
            self.assertEqual(0, completed.returncode, completed.stderr)
            payloads.append((out_dir / "registry.json").read_bytes())
            digests.append(json.loads(completed.stdout)["payload_sha256"])
        self.assertEqual(payloads[0], payloads[1])
        self.assertEqual(digests[0], digests[1])
        self.assertNotIn(b"\r", payloads[0])
        self.assertEqual(hashlib.sha256(payloads[0]).hexdigest(), digests[0])
        self.assertEqual(self.LIVE_PAYLOAD_SHA256, digests[0])

    def test_the_committed_snapshot_digest_is_pinned(self) -> None:
        release = build_release(
            root=LIVE_REGISTRY_ROOT,
            version="0.1.0",
            created_at_utc=CREATED_AT,
        )
        self.assertEqual(
            self.LIVE_PAYLOAD_BYTE_COUNT, len(release.payload_bytes)
        )
        self.assertEqual(self.LIVE_PAYLOAD_SHA256, release.payload_sha256)

    def test_a_fresh_build_reproduces_the_committed_file_byte_for_byte(
        self,
    ) -> None:
        self.assertTrue(COMMITTED_SNAPSHOT.is_file())
        generated = canonical_json_bytes(
            snapshot_payload(build_snapshot(LIVE_REGISTRY_ROOT))
        )
        self.assertNotIn(b"\r", generated)
        committed = COMMITTED_SNAPSHOT.read_bytes()
        self.assertEqual(generated, committed)
        self.assertEqual(
            self.LIVE_PAYLOAD_SHA256, hashlib.sha256(committed).hexdigest()
        )

    def test_the_committed_declaration_files_carry_no_cr(self) -> None:
        for filename in (BRAND_UNIVERSE_FILENAME, SOURCE_DENOMINATOR_FILENAME):
            with self.subTest(filename=filename):
                raw = (LIVE_REGISTRY_ROOT / filename).read_bytes()
                self.assertNotIn(b"\r", raw)
                self.assertTrue(raw.endswith(b"\n"))


# ---------------------------------------------------------------------------
# Authority boundary — a work list, not coverage
# ---------------------------------------------------------------------------


class AuthorityBoundaryTests(unittest.TestCase):
    def test_the_statement_never_claims_completeness(self) -> None:
        statement = build_snapshot(LIVE_REGISTRY_ROOT).coverage_statement.lower()
        for forbidden in (
            "complete",
            "worldwide",
            "every brand",
            "all brands",
            "production-ready",
            "qualified",
        ):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, statement)

    def test_the_declaration_holds_no_rights_or_access_claim(self) -> None:
        raw = (LIVE_REGISTRY_ROOT / SOURCE_DENOMINATOR_FILENAME).read_text(
            encoding="utf-8"
        )
        for forbidden in (
            "rights_state",
            "accessed_at",
            "license",
            "publisher",
            "edition",
            "region",
            "language",
        ):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, raw)

    def test_no_declared_source_is_registered_or_hash_verified(self) -> None:
        snapshot = build_snapshot(LIVE_REGISTRY_ROOT)
        self.assertEqual(0, snapshot.registered_source_count.count)
        self.assertEqual(0, snapshot.blocked_source_count.count)
        self.assertEqual(0, snapshot.verified_item_count.count)
        self.assertTrue(
            all(entry.sha256 is None for entry in snapshot.source_denominator)
        )

    def test_every_count_still_carries_its_denominator(self) -> None:
        for measured in build_snapshot(LIVE_REGISTRY_ROOT).counts:
            with self.subTest(label=measured.label):
                self.assertTrue(measured.denominator_label)
                self.assertTrue(measured.measured_by)
                self.assertLessEqual(measured.count, measured.denominator)

    def test_no_blended_coverage_score_exists(self) -> None:
        payload = json.loads(
            canonical_json_bytes(
                snapshot_payload(build_snapshot(LIVE_REGISTRY_ROOT))
            )
        )
        for key in payload:
            with self.subTest(key=key):
                self.assertNotIn("percent", key)
                self.assertNotIn("score", key)


# ---------------------------------------------------------------------------
# F1/F2. The hashed payload must attest which cohort was declared, and must
# publish a complete partition of its own source denominator.
# ---------------------------------------------------------------------------


# The exact key list `releases.snapshot_payload` publishes. Pinned so that a
# key cannot be added or dropped without a reviewer seeing it in the diff: the
# payload is what a release digest covers, and a silently removed key is a
# silently narrowed attestation.
#
# **This list records what is published; it cannot prove the list complete.**
# It was accurate at `b7cd54ab` while `verified_items_with_backing_evidence` —
# the module's headline coverage number — was still absent from the payload,
# because a pinned list can only freeze whatever it was written from.
# `PayloadCountCompletenessTests` below is what actually forbids a dropped
# count, by comparing the payload against the record rather than against a
# list a human typed.
EXPECTED_PAYLOAD_KEYS: tuple[str, ...] = (
    "authority_state",
    "blocked_source_count",
    "blocked_sources",
    "brand_universe",
    "classification_counts",
    "classified_item_count",
    "coverage_statement",
    "declared_unread_source_count",
    "dimension_verified_counts",
    "discovered_item_count",
    "evidence_gate_findings",
    "first_cohort_brand_count",
    "items",
    "registered_source_count",
    "schema",
    "source_denominator",
    "unbacked_verified_item_count",
    "unclassified",
    "unclassified_item_count",
    "verified_item_count",
)

MEASURED_COUNT_KEYS = frozenset(
    {"count", "denominator", "denominator_label", "label", "measured_by"}
)


def payload_count_labels(node: object) -> set[str]:
    """Every ``MeasuredCount`` label reachable anywhere inside a payload.

    A recursive walk rather than a lookup over known keys, because the defect
    being guarded against is precisely a count nobody remembered to look for.
    A walk finds counts nested inside ``classification_counts`` and
    ``dimension_verified_counts`` as readily as top-level ones, and it does not
    have to be updated when a count moves.

    Matching is by **superset** here, deliberately wider than the exact
    five-key match in the production collector
    ``releases._published_count_payloads``: an attacker flags anything that
    carries the five fields, while the guard compares only objects that are
    exactly a published count. The same difference is stated on the
    production side, and ``PublicationGuardResidualTests`` asserts the
    divergent verdict the two definitions give one six-key mapping, so the
    difference cannot drift unnoticed. ``payload_count_objects`` below
    matches the same way. Both attackers require the label to be a real
    ``str``, exactly as the production collector does.
    """

    found: set[str] = set()
    if isinstance(node, Mapping):
        if MEASURED_COUNT_KEYS <= set(node):
            label = node["label"]
            if not isinstance(label, str):
                raise TypeError("a payload count label must be a string")
            found.add(label)
        for value in node.values():
            found |= payload_count_labels(value)
    elif isinstance(node, (list, tuple)):
        for item in node:
            found |= payload_count_labels(item)
    return found


CountFingerprint = tuple[tuple[str, object], ...]


def payload_count_objects(node: object) -> set[CountFingerprint]:
    """The same walk, carrying **every field** of each count rather than its label.

    A label-only comparison answers "is a count of this name published?" and
    stops there, so a count republished under the right label with a wrong
    number, a wrong denominator or a wrong ``measured_by`` would satisfy it.
    The five fields together are what :meth:`MeasuredCount.as_payload` emits,
    so comparing on all five is what makes the guard say "the payload carries
    the record's count" rather than "the payload carries a count with that
    name".
    """

    found: set[CountFingerprint] = set()
    if isinstance(node, Mapping):
        if MEASURED_COUNT_KEYS <= set(node):
            if not isinstance(node["label"], str):
                raise TypeError("a payload count label must be a string")
            found.add(
                tuple(sorted((key, node[key]) for key in MEASURED_COUNT_KEYS))
            )
        for value in node.values():
            found |= payload_count_objects(value)
    elif isinstance(node, (list, tuple)):
        for item in node:
            found |= payload_count_objects(item)
    return found


def record_count_objects(snapshot: CoverageSnapshot) -> set[CountFingerprint]:
    """The record's own enumeration, in the same shape, for comparison."""

    return {
        tuple(sorted(count.as_payload().items())) for count in snapshot.counts
    }


def prose(text: str | None) -> str:
    """A docstring flattened for phrase search: one space, lower case.

    A residual list is prose a human reads, and a fragment assertion that
    breaks on a line wrap or a capital letter would push the author toward
    writing the docstring for the test instead of for the reader. Flattening
    is what keeps the assertion about the *statement* rather than its layout.
    """

    return " ".join((text or "").split()).lower()


class PayloadAttestsTheDeclaredCohortTests(RootCase):
    """A published digest must change when the declared cohort changes.

    Task 9 left `brand_universe` out of the hashed payload because
    `releases.py` was outside its authorized scope. The consequence is not
    cosmetic: two registry roots declaring **completely different** brands
    against the same two sources produced a byte-identical payload and the
    same digest, so no release could attest which cohort it was measured
    against, and no brand name appeared anywhere in the published bytes.
    """

    def two_source_rows(self) -> list[dict[str, object]]:
        return [
            declared_row("source:a:index", "https://example.invalid/a"),
            declared_row("source:b:index", "https://example.invalid/b"),
        ]

    def root_with_cohort(
        self, name: str, cohort: tuple[tuple[str, str, str], ...]
    ) -> Path:
        root = self.new_root(name)
        self.with_brands(
            [
                {
                    "brand_id": brand_id,
                    "brand_name": brand_name,
                    "source_ids": [source_id],
                }
                for brand_id, brand_name, source_id in cohort
            ],
            root,
        )
        self.with_declared(self.two_source_rows(), root)
        return root

    def payload_bytes_for(self, root: Path) -> bytes:
        return canonical_json_bytes(snapshot_payload(build_snapshot(root)))

    def test_two_roots_differing_only_in_brands_produce_different_digests(
        self,
    ) -> None:
        """The F1 proof. Without it the release digest attests nothing.

        The two roots hold an identical two-source denominator and identical
        item seeds. The **only** difference is the brand universe, and the
        brand universe is the declaration `0 of 12` will be computed from.
        """

        real = self.root_with_cohort(
            "cohort-real",
            (
                ("brand:hafele", "Häfele", "source:a:index"),
                ("brand:blum", "Blum", "source:b:index"),
            ),
        )
        other = self.root_with_cohort(
            "cohort-other",
            (
                ("brand:acme-fasteners", "Acme Fasteners", "source:a:index"),
                ("brand:zzz-ltd", "Zzz Ltd", "source:b:index"),
            ),
        )
        real_bytes = self.payload_bytes_for(real)
        other_bytes = self.payload_bytes_for(other)

        # Control: the two source denominators really are identical, so the
        # digest difference below can only come from the brand universe.
        self.assertEqual(
            json.loads(real_bytes)["source_denominator"],
            json.loads(other_bytes)["source_denominator"],
        )
        self.assertNotEqual(real_bytes, other_bytes)
        self.assertNotEqual(
            hashlib.sha256(real_bytes).hexdigest(),
            hashlib.sha256(other_bytes).hexdigest(),
        )

    def test_the_declared_brand_names_are_visible_in_the_published_bytes(
        self,
    ) -> None:
        root = self.root_with_cohort(
            "cohort-visible",
            (
                ("brand:hafele", "Häfele", "source:a:index"),
                ("brand:blum", "Blum", "source:b:index"),
            ),
        )
        raw = self.payload_bytes_for(root)
        self.assertIn("Häfele".encode("utf-8"), raw)
        self.assertIn(b"Blum", raw)

    def test_a_brand_row_reaches_the_payload_in_its_exact_shape(self) -> None:
        # Both brands are declared, because every DECLARED_UNREAD source must
        # be claimed by exactly one brand.
        root = self.root_with_cohort(
            "cohort-shape",
            (
                ("brand:hafele", "Häfele", "source:a:index"),
                ("brand:blum", "Blum", "source:b:index"),
            ),
        )
        payload = json.loads(self.payload_bytes_for(root))
        self.assertEqual(
            [
                {
                    "brand_id": "brand:blum",
                    "brand_name": "Blum",
                    "source_ids": ["source:b:index"],
                },
                {
                    "brand_id": "brand:hafele",
                    "brand_name": "Häfele",
                    "source_ids": ["source:a:index"],
                },
            ],
            payload["brand_universe"],
        )

    def test_the_live_payload_carries_the_committed_twelve(self) -> None:
        payload = json.loads(
            canonical_json_bytes(
                snapshot_payload(build_snapshot(LIVE_REGISTRY_ROOT))
            )
        )
        self.assertEqual(
            [
                {
                    "brand_id": brand_id,
                    "brand_name": brand_name,
                    "source_ids": sorted(source_ids_for(brand_id)),
                }
                for brand_id, brand_name in sorted(EXPECTED_FIRST_COHORT)
            ],
            payload["brand_universe"],
        )
        self.assertEqual(BRAND_COUNT, len(payload["brand_universe"]))

    def test_the_payload_key_list_is_exactly_as_declared(self) -> None:
        payload = json.loads(
            canonical_json_bytes(
                snapshot_payload(build_snapshot(LIVE_REGISTRY_ROOT))
            )
        )
        self.assertEqual(list(EXPECTED_PAYLOAD_KEYS), sorted(payload))

    # -- F2: the payload publishes a complete partition of its denominator --

    def test_the_two_dropped_counts_are_published_as_measured_counts(
        self,
    ) -> None:
        """Rule 1 of this module: every count carries its denominator.

        Both counts exist as properties and both appear in `snapshot.counts`;
        both were dropped on the way to the payload, so a consumer reading the
        published bytes could not see them at all.
        """

        snapshot = build_snapshot(LIVE_REGISTRY_ROOT)
        payload = json.loads(
            canonical_json_bytes(snapshot_payload(snapshot))
        )
        for key, expected in (
            ("declared_unread_source_count", snapshot.declared_unread_source_count),
            ("first_cohort_brand_count", snapshot.first_cohort_brand_count),
        ):
            with self.subTest(key=key):
                entry = payload[key]
                self.assertEqual(MEASURED_COUNT_KEYS, set(entry))
                self.assertEqual(expected.label, entry["label"])
                self.assertEqual(expected.count, entry["count"])
                self.assertEqual(expected.denominator, entry["denominator"])
                self.assertEqual(
                    expected.denominator_label, entry["denominator_label"]
                )
                self.assertEqual(expected.measured_by, entry["measured_by"])

    def test_the_published_source_counts_partition_the_denominator(
        self,
    ) -> None:
        """Enumerated from the payload, the way a consumer would read it.

        Before this wave two of the three source states carried a count object
        and the third carried none, so the enumerable counts summed to 0
        against a denominator of 14.
        """

        root = self.new_root("partition")
        self.with_brands([brand_row()], root)
        self.with_declared([blocked_row(), declared_row()], root)
        payload = json.loads(
            canonical_json_bytes(snapshot_payload(build_snapshot(root)))
        )
        source_counts = {
            key: value
            for key, value in payload.items()
            if isinstance(value, dict)
            and set(value) == MEASURED_COUNT_KEYS
            and value["denominator_label"] == "sources_in_denominator"
        }
        self.assertEqual(
            {
                "blocked_source_count",
                "declared_unread_source_count",
                "registered_source_count",
            },
            set(source_counts),
        )
        denominators = {entry["denominator"] for entry in source_counts.values()}
        self.assertEqual({2}, denominators)
        self.assertEqual(
            2, sum(entry["count"] for entry in source_counts.values())
        )
        self.assertEqual(
            len(payload["source_denominator"]),
            sum(entry["count"] for entry in source_counts.values()),
        )

    def test_the_live_partition_is_complete_too(self) -> None:
        payload = json.loads(
            canonical_json_bytes(
                snapshot_payload(build_snapshot(LIVE_REGISTRY_ROOT))
            )
        )
        total = (
            payload["registered_source_count"]["count"]
            + payload["declared_unread_source_count"]["count"]
            + payload["blocked_source_count"]["count"]
        )
        self.assertEqual(SOURCE_COUNT, total)
        self.assertEqual(
            SOURCE_COUNT, payload["declared_unread_source_count"]["denominator"]
        )
        self.assertEqual(
            BRAND_COUNT, payload["first_cohort_brand_count"]["denominator"]
        )
        self.assertEqual(0, payload["first_cohort_brand_count"]["count"])


# ---------------------------------------------------------------------------
# F3. A declared URL must be built from characters a reviewer can see.
# ---------------------------------------------------------------------------


# Every one of these was **accepted** by the validator before this wave. Each
# is named so a refusal cannot be reported for the wrong reason.
INVISIBLE_URL_CASES: tuple[tuple[str, str, str], ...] = (
    ("U+200B", "zero width space", "https://exam\u200bple.invalid/x"),
    ("U+FEFF", "zero width no-break space", "https://exam\ufeffple.invalid/x"),
    ("U+2060", "word joiner", "https://exam\u2060ple.invalid/x"),
    ("U+00AD", "soft hyphen", "https://exam\u00adple.invalid/x"),
    ("U+0000", "nul", "https://exam\x00ple.invalid/x"),
    ("U+200E", "left-to-right mark", "https://exam\u200eple.invalid/x"),
)

# Accepted before this wave, and a separate decision from the invisible ones.
HOMOGRAPH_URL_CASES: tuple[tuple[str, str, str], ...] = (
    ("U+0430", "Cyrillic small letter a", "https://ex\u0430mple.invalid/x"),
    ("U+0435", "Cyrillic small letter ie", "https://\u0435xample.invalid/x"),
)

# Refused before this wave and still refused. Kept so the suite cannot go
# vacuous by refusing everything.
ALREADY_REFUSED_URLS: tuple[tuple[str, str], ...] = (
    ("bare scheme", "https://"),
    ("ordinary space", "https://exam ple.invalid/x"),
    ("U+00A0 nbsp", "https://exam\u00a0ple.invalid/x"),
    ("http scheme", "http://example.invalid/x"),
    ("no scheme", "example.invalid/x"),
)

# Must stay accepted. An ASCII allowlist that refused these would have broken
# the fourteen committed rows.
STILL_ADMITTED_URLS: tuple[tuple[str, str], ...] = (
    ("plain", "https://example.invalid/x"),
    ("query and fragment", "https://example.invalid/a?b=1&c=2#d"),
    ("percent-encoded octet", "https://example.invalid/caf%C3%A9"),
    ("IDN A-label", "https://xn--hfele-vqa.invalid/products"),
    ("port and userless authority", "https://example.invalid:8443/a"),
    ("sub-delims in path", "https://example.invalid/a$b&c'd(e)f*g+h,i;j=k"),
    ("tilde and underscore", "https://example.invalid/~a_b-c.d"),
)


class DeclaredUrlCharacterSetTests(RootCase):
    """A URL is fetched later by exactly what is written, byte for byte.

    An invisible character makes the committed byte differ from the URL every
    human reviewer read, and it survives a character-for-character
    transcription check, which is the check this lane relies on.
    """

    def refuse_url(self, name: str, url: str) -> str:
        root = self.new_root(f"url-{name}")
        self.with_brands([brand_row()], root)
        self.with_declared([declared_row(url=url)], root)
        return self.assert_refused(
            root, f"{SOURCE_DENOMINATOR_FILENAME}:1", "url"
        )

    def test_each_invisible_character_is_refused_and_named(self) -> None:
        for index, (code_point, label, url) in enumerate(INVISIBLE_URL_CASES):
            with self.subTest(code_point=code_point, label=label):
                message = self.refuse_url(f"invisible-{index}", url)
                # Naming the code point is the substance: a message saying
                # only "bad character" for a character nobody can see is
                # nearly as unhelpful as accepting it.
                self.assertIn(code_point, message)

    def test_the_type_refuses_them_too_not_only_the_file_reader(self) -> None:
        for code_point, label, url in INVISIBLE_URL_CASES:
            with self.subTest(code_point=code_point, label=label):
                with self.assertRaises(ValueError) as caught:
                    SourceDenominatorEntry(
                        source_id=DECLARED_ID,
                        sha256=None,
                        state=DECLARED_UNREAD,
                        url=url,
                    )
                self.assertIn(code_point, str(caught.exception))

    def test_the_homograph_case_is_refused_by_the_same_rule(self) -> None:
        """The recorded decision, asserted rather than described.

        An explicit permitted character set was chosen over a
        format-category refusal, so a Cyrillic homograph is refused for the
        same reason a zero-width space is: it is not in the set. What that
        excludes is stated in `_require_declared_url`'s docstring and in the
        wave report; it is not left in neither place.
        """

        for index, (code_point, label, url) in enumerate(HOMOGRAPH_URL_CASES):
            with self.subTest(code_point=code_point, label=label):
                message = self.refuse_url(f"homograph-{index}", url)
                self.assertIn(code_point, message)

    def test_the_already_refused_controls_are_still_refused(self) -> None:
        for index, (label, url) in enumerate(ALREADY_REFUSED_URLS):
            with self.subTest(label=label):
                self.refuse_url(f"control-{index}", url)

    def test_the_admitted_controls_are_still_admitted(self) -> None:
        """Non-vacuity. A rule that refused everything would pass every test
        above and break the fourteen committed rows."""

        for label, url in STILL_ADMITTED_URLS:
            with self.subTest(label=label):
                entry = SourceDenominatorEntry(
                    source_id=DECLARED_ID,
                    sha256=None,
                    state=DECLARED_UNREAD,
                    url=url,
                )
                self.assertEqual(url, entry.url)

    def test_every_committed_url_is_still_admitted_unchanged(self) -> None:
        """The fourteen URLs are unvisited and must stay exactly as transcribed."""

        rows = read_jsonl(LIVE_REGISTRY_ROOT / SOURCE_DENOMINATOR_FILENAME)
        self.assertEqual(SOURCE_COUNT, len(rows))
        for row in rows:
            with self.subTest(source_id=row["source_id"]):
                url = row["url"]
                self.assertEqual(url, url.encode("ascii").decode("ascii"))
                entry = SourceDenominatorEntry(
                    source_id=str(row["source_id"]),
                    sha256=None,
                    state=DECLARED_UNREAD,
                    url=url,
                )
                self.assertEqual(url, entry.url)

    def test_the_refusal_explains_why_an_invisible_character_matters(
        self,
    ) -> None:
        message = self.refuse_url("explains", INVISIBLE_URL_CASES[0][2])
        self.assertIn("U+200B", message)
        # The rule is named, so a reader can look it up rather than guess.
        self.assertIn("3986", message)


# ---------------------------------------------------------------------------
# F4. Every file this reader opens must resolve inside the registry root.
# ---------------------------------------------------------------------------


class RegistryRootAnchoringTests(RootCase):
    """`content_path` has been root-anchored since Task 8; the entry points were not.

    `Path.rglob` declines to descend into a symlinked **directory**, which is
    why the recorded exposure only ever named directories. It lists a
    symlinked **file** like any other, and this reader then followed it out of
    the root. Task 9 added two contract-bearing entry points at that root, so
    the exposure grew while the record did not.
    """

    def link_or_skip(self, link: Path, target: Path) -> None:
        try:
            os.symlink(target, link)
        except (OSError, NotImplementedError) as error:  # pragma: no cover
            self.skipTest(f"symlink creation unavailable on this host: {error}")

    def outside_file(self, name: str, rows: list[Mapping[str, object]]) -> Path:
        outside = self.workspace / "outside"
        outside.mkdir(parents=True, exist_ok=True)
        path = outside / name
        write_jsonl(path, rows)
        return path

    def test_the_anchor_refuses_a_path_outside_the_root_without_a_symlink(
        self,
    ) -> None:
        """Asserted directly, so the rule is covered on hosts that cannot symlink."""

        root = self.new_root("anchor-direct")
        outside = self.outside_file("elsewhere.jsonl", [])
        with self.assertRaises(ValueError) as caught:
            coverage_module._require_inside_root(
                root, outside, "elsewhere.jsonl"
            )
        message = str(caught.exception)
        self.assertIn("elsewhere.jsonl", message)
        self.assertIn("outside the registry root", message)

    def test_the_anchor_admits_a_path_inside_the_root(self) -> None:
        root = self.new_root("anchor-inside")
        inside = root / "materials.jsonl"
        self.assertEqual(
            inside.resolve(),
            coverage_module._require_inside_root(
                root, inside, "materials.jsonl"
            ),
        )

    def test_a_symlinked_source_denominator_is_refused(self) -> None:
        root = self.new_root("symlink-denominator")
        target = self.outside_file(
            "evil-denominator.jsonl",
            [declared_row("source:evil:index", "https://evil.invalid/x")],
        )
        self.link_or_skip(root / SOURCE_DENOMINATOR_FILENAME, target)
        self.assert_refused(
            root, SOURCE_DENOMINATOR_FILENAME, "outside the registry root"
        )

    def test_a_symlinked_brand_universe_is_refused(self) -> None:
        root = self.new_root("symlink-brands")
        target = self.outside_file(
            "evil-brands.jsonl",
            [brand_row(brand_id="brand:evil", brand_name="Evil")],
        )
        self.link_or_skip(root / BRAND_UNIVERSE_FILENAME, target)
        self.assert_refused(
            root, BRAND_UNIVERSE_FILENAME, "outside the registry root"
        )

    def test_a_symlinked_item_file_is_refused(self) -> None:
        """The same rule, applied to every file the reader opens.

        Anchoring only the two new entry points would leave the item files and
        the source manifest reachable through the same link, which is the
        inconsistency this wave exists to stop repeating.
        """

        root = self.new_root("symlink-item")
        target = self.outside_file("evil-items.jsonl", [item_row()])
        (root / "materials.jsonl").unlink()
        self.link_or_skip(root / "materials.jsonl", target)
        self.assert_refused(
            root, "materials.jsonl", "outside the registry root"
        )

    def test_a_symlinked_source_manifest_is_refused(self) -> None:
        root = self.new_root("symlink-manifest")
        target = self.outside_file("evil-manifest.jsonl", [])
        (root / "evidence-manifest.jsonl").unlink()
        self.link_or_skip(root / "evidence-manifest.jsonl", target)
        self.assert_refused(
            root, "evidence-manifest.jsonl", "outside the registry root"
        )

    def test_an_ordinary_root_is_still_measured(self) -> None:
        """Non-vacuity: the anchor must not refuse the committed root."""

        snapshot = build_snapshot(LIVE_REGISTRY_ROOT)
        self.assertEqual(SOURCE_COUNT, len(snapshot.source_denominator))
        self.assertEqual(BRAND_COUNT, len(snapshot.brand_universe))

    def test_a_symlink_that_stays_inside_the_root_is_admitted(self) -> None:
        """Anchored, not banned. The rule is about leaving the root."""

        root = self.new_root("symlink-inside")
        real = root / "real-brands.jsonl.txt"
        write_jsonl(real, [brand_row()])
        self.with_declared([declared_row()], root)
        self.link_or_skip(root / BRAND_UNIVERSE_FILENAME, real)
        snapshot = build_snapshot(root)
        self.assertEqual(
            ("brand:demo",),
            tuple(entry.brand_id for entry in snapshot.brand_universe),
        )


# ---------------------------------------------------------------------------
# F7. Nothing may collapse "declared but unread" and "blocked", in either
# direction — including a hand-built record that names one source as both.
# ---------------------------------------------------------------------------


class BlockedStateAgreementTests(unittest.TestCase):
    """`_require_backed_verified_claims` recorded this limit for `REGISTERED` only.

    Task 9 added a third state and widened the uncross-checked pair without
    widening the record. This wave cross-checks instead, because the module's
    own principle is that an invariant living in one caller is a convention —
    `_require_brand_source_agreement` was correctly enforced in two places and
    this one was not enforced at all.
    """

    def snapshot_with(self, state: str) -> CoverageSnapshot:
        entry = (
            SourceDenominatorEntry(
                source_id=DECLARED_ID,
                sha256=None,
                state=DECLARED_UNREAD,
                url=DECLARED_URL,
            )
            if state == DECLARED_UNREAD
            else SourceDenominatorEntry(
                source_id=DECLARED_ID, sha256=DEMO_SHA256, state=state
            )
        )
        brands = (
            (
                BrandUniverseEntry(
                    brand_id="brand:demo",
                    brand_name="Demo Brand",
                    source_ids=(DECLARED_ID,),
                ),
            )
            if state == DECLARED_UNREAD
            else ()
        )
        return CoverageSnapshot(
            discovered_item_count=0,
            items=(),
            unclassified=(),
            blocked_sources=(
                BlockedSource(source_id=DECLARED_ID, reason="PAYWALLED"),
            ),
            source_denominator=(entry,),
            evidence_gate_findings=(),
            brand_universe=brands,
        )

    def test_a_blocked_source_declared_unread_is_refused(self) -> None:
        with self.assertRaises(ValueError) as caught:
            self.snapshot_with(DECLARED_UNREAD)
        message = str(caught.exception)
        self.assertIn(DECLARED_ID, message)
        self.assertIn(DECLARED_UNREAD, message)
        self.assertIn("blocked_sources", message)

    def test_a_blocked_source_registered_is_refused(self) -> None:
        with self.assertRaises(ValueError) as caught:
            self.snapshot_with("REGISTERED")
        message = str(caught.exception)
        self.assertIn(DECLARED_ID, message)
        self.assertIn("REGISTERED", message)

    def test_the_agreeing_shape_is_still_accepted(self) -> None:
        """Non-vacuity control: the shape discovery itself produces."""

        snapshot = self.snapshot_with("BLOCKED")
        self.assertEqual(1, snapshot.blocked_source_count.count)
        self.assertEqual(1, snapshot.blocked_source_count.denominator)

    def test_a_blocked_source_the_denominator_does_not_name_is_refused(
        self,
    ) -> None:
        with self.assertRaises(ValueError) as caught:
            CoverageSnapshot(
                discovered_item_count=0,
                items=(),
                unclassified=(),
                blocked_sources=(
                    BlockedSource(
                        source_id="source:demo:ghost", reason="PAYWALLED"
                    ),
                ),
                source_denominator=(
                    SourceDenominatorEntry(
                        source_id=DECLARED_ID,
                        sha256=DEMO_SHA256,
                        state="BLOCKED",
                    ),
                ),
                evidence_gate_findings=(),
            )
        self.assertIn("source:demo:ghost", str(caught.exception))

    def test_discovery_still_produces_the_agreeing_shape(self) -> None:
        """The rule must not refuse anything `discover_registry_root` builds."""

        snapshot = build_snapshot(LIVE_REGISTRY_ROOT)
        self.assertEqual((), snapshot.blocked_sources)


# ---------------------------------------------------------------------------
# G1. Every MeasuredCount the record holds must reach the hashed payload.
#
# A class-level assertion on purpose. The previous wave named three missing
# counts, added those three, and wrote a docstring saying the audit was
# complete while a fourth was still absent. A pinned key list and a
# denominator-filtered partition test both read as authorities and neither
# could see it. Comparing the record against the payload can.
# ---------------------------------------------------------------------------


class PayloadCountCompletenessTests(RootCase):
    """No count on the record may be absent from what a release attests.

    ``CoverageSnapshot.counts`` is the record's own enumeration of every
    ``MeasuredCount`` it holds. ``snapshot_payload`` names its fields one by
    one, so a count it does not name is outside ``payload_sha256`` and is
    attested by no release at all. Those two facts have to be checked against
    each other; checking either against a hand-written list only re-freezes
    whatever was true when the list was typed.
    """

    def backed_root(self) -> Path:
        """A root whose VERIFIED item is backed, so the count is nonzero."""

        root = self.new_root("counts-backed")
        write_jsonl(root / "evidence-manifest.jsonl", [manifest_row()])
        self.with_cached_source(root)
        write_jsonl(root / "materials.jsonl", [item_row()])
        return root

    def unbacked_root(self) -> Path:
        """A root whose VERIFIED item names a source nobody has read."""

        root = self.new_root("counts-unbacked")
        self.with_brands([brand_row()], root)
        self.with_declared([declared_row()], root)
        write_jsonl(
            root / "materials.jsonl", [item_row(source_id=DECLARED_ID)]
        )
        return root

    def blocked_root(self) -> Path:
        root = self.new_root("counts-blocked")
        self.with_brands([brand_row()], root)
        self.with_declared([blocked_row(), declared_row()], root)
        return root

    def every_root(self) -> tuple[tuple[str, Path], ...]:
        return (
            ("live", LIVE_REGISTRY_ROOT),
            ("backed", self.backed_root()),
            ("unbacked", self.unbacked_root()),
            ("blocked", self.blocked_root()),
        )

    def test_every_measured_count_on_the_record_reaches_the_payload(
        self,
    ) -> None:
        """The wave's central guard. It must hold for every shape of root."""

        for name, root in self.every_root():
            with self.subTest(root=name):
                snapshot = build_snapshot(root)
                payload = json.loads(
                    canonical_json_bytes(snapshot_payload(snapshot))
                )
                missing = {
                    count.label for count in snapshot.counts
                } - payload_count_labels(payload)
                self.assertEqual(
                    set(),
                    missing,
                    "a MeasuredCount the record holds is absent from the "
                    "hashed payload, so no release attests it",
                )

    def test_the_payload_publishes_no_count_the_record_does_not_hold(
        self,
    ) -> None:
        """The converse, so the two enumerations are identical rather than
        merely nested. Without it the guard above could be satisfied by
        publishing an invented count alongside the real ones."""

        for name, root in self.every_root():
            with self.subTest(root=name):
                snapshot = build_snapshot(root)
                payload = json.loads(
                    canonical_json_bytes(snapshot_payload(snapshot))
                )
                self.assertEqual(
                    {count.label for count in snapshot.counts},
                    payload_count_labels(payload),
                )

    def test_the_guard_is_not_vacuous(self) -> None:
        """The record really does hold counts, and the walk really finds them."""

        snapshot = build_snapshot(LIVE_REGISTRY_ROOT)
        labels = {count.label for count in snapshot.counts}
        # 4 item counts + 3 source counts + 1 cohort count + 7 classification
        # states + 10 verification dimensions.
        self.assertEqual(25, len(labels))
        self.assertEqual(
            labels,
            payload_count_labels(
                json.loads(canonical_json_bytes(snapshot_payload(snapshot)))
            ),
        )

    def test_the_headline_count_is_published_by_name(self) -> None:
        """The survivor the previous wave missed, named rather than implied."""

        snapshot = build_snapshot(LIVE_REGISTRY_ROOT)
        raw = canonical_json_bytes(snapshot_payload(snapshot))
        self.assertIn(b"verified_items_with_backing_evidence", raw)
        entry = json.loads(raw)["verified_item_count"]
        self.assertEqual(MEASURED_COUNT_KEYS, set(entry))
        expected = snapshot.verified_item_count
        self.assertEqual(expected.label, entry["label"])
        self.assertEqual(expected.count, entry["count"])
        self.assertEqual(expected.denominator, entry["denominator"])
        self.assertEqual(
            expected.denominator_label, entry["denominator_label"]
        )
        self.assertEqual(expected.measured_by, entry["measured_by"])

    def test_it_is_not_substitutable_by_the_classification_count(self) -> None:
        """Measured, not argued: the two numbers disagree on a real root.

        ``classification.VERIFIED`` counts what a file *claims*.
        ``verified_items_with_backing_evidence`` counts what the evidence gate
        *admitted*. On a root whose only VERIFIED item names a source nobody
        has read they are 1 and 0, and two different functions measured them.
        """

        snapshot = build_snapshot(self.unbacked_root())
        headline = snapshot.verified_item_count
        claimed = snapshot.classification_counts["VERIFIED"]
        self.assertEqual(1, claimed.count)
        self.assertEqual(0, headline.count)
        self.assertNotEqual(claimed.label, headline.label)
        self.assertEqual("coverage.discover_registry_root", claimed.measured_by)
        self.assertEqual(
            "coverage.evaluate_evidence_gate", headline.measured_by
        )
        payload = json.loads(canonical_json_bytes(snapshot_payload(snapshot)))
        self.assertEqual(
            1, payload["classification_counts"]["VERIFIED"]["count"]
        )
        self.assertEqual(0, payload["verified_item_count"]["count"])

    def test_the_comparison_carries_every_field_not_only_the_label(
        self,
    ) -> None:
        """H3 of wave 2's review, closed rather than recorded.

        The label-only comparison could be satisfied by a count published
        under the right name with a wrong number. Comparing the five fields
        `MeasuredCount.as_payload` emits is what makes it say *the payload
        carries the record's count*.
        """

        for name, root in self.every_root():
            with self.subTest(root=name):
                snapshot = build_snapshot(root)
                payload = json.loads(
                    canonical_json_bytes(snapshot_payload(snapshot))
                )
                self.assertEqual(
                    record_count_objects(snapshot),
                    payload_count_objects(payload),
                )

    def test_the_value_level_comparison_is_not_vacuous(self) -> None:
        """Twenty-five fingerprints, not two empty sets."""

        snapshot = build_snapshot(LIVE_REGISTRY_ROOT)
        fingerprints = record_count_objects(snapshot)
        self.assertEqual(25, len(fingerprints))
        for fingerprint in fingerprints:
            with self.subTest(fingerprint=fingerprint):
                self.assertEqual(
                    MEASURED_COUNT_KEYS, {key for key, _value in fingerprint}
                )


# ---------------------------------------------------------------------------
# H2. `counts` must be **derived**, not hand-typed. A MeasuredCount property
# nobody remembered to enrol was invisible to the guard and to the payload.
# ---------------------------------------------------------------------------


class CountEnrollmentDerivationTests(RootCase):
    """The record's enumeration is introspected from the class, not typed out.

    The module docstring's guarantee is *"a count-by-count comparison of the
    record against the payload — not a list anybody maintains by hand"*. That
    sentence was false in one direction: ``CoverageSnapshot.counts`` was itself
    a hand-typed list, so a real ``MeasuredCount`` property added to the class
    and forgotten there was absent from the record's own enumeration, absent
    from the payload, and invisible to every test in this file.

    These tests attack the sentence rather than restate it: each one adds a
    genuine count-bearing property to the class and asserts what happens.
    """

    def add_count_property(
        self,
        name: str,
        label: str,
        *,
        shape: str = "count",
    ) -> None:
        """Install a real count-bearing class attribute, then remove it.

        ``shape`` decides how the count is reached, because *how* is exactly
        what the enumeration can and cannot walk.
        """

        def one(inner: CoverageSnapshot) -> MeasuredCount:
            return MeasuredCount(
                label=label,
                count=0,
                denominator=len(inner.source_denominator),
                denominator_label="sources_in_denominator",
                measured_by="coverage.discover_registry_root",
            )

        if shape == "count":
            attribute: object = property(one)
        elif shape == "cached":
            attribute = cached_property(one)
            attribute.__set_name__(CoverageSnapshot, name)
        elif shape == "tuple":
            attribute = property(lambda inner: (one(inner),))
        elif shape == "mapping":
            attribute = property(lambda inner: {"only": one(inner)})
        elif shape == "mapping_of_mappings":
            attribute = property(
                lambda inner: {"outer": {"only": one(inner)}}
            )
        elif shape == "plain":
            attribute = MeasuredCount(
                label=label,
                count=0,
                denominator=0,
                denominator_label="sources_in_denominator",
                measured_by="coverage.discover_registry_root",
            )
        else:  # pragma: no cover - guard against a typo in a subTest
            raise AssertionError(f"unknown shape {shape}")
        setattr(CoverageSnapshot, name, attribute)
        self.addCleanup(delattr, CoverageSnapshot, name)

    def test_a_new_count_property_is_enrolled_without_being_listed(
        self,
    ) -> None:
        """The mutation. Nothing in `coverage.py` names this property."""

        before = {count.label for count in build_snapshot(
            LIVE_REGISTRY_ROOT
        ).counts}
        self.assertNotIn("smuggled_by_a_property", before)

        self.add_count_property("smuggled_count", "smuggled_by_a_property")
        after = {
            count.label
            for count in build_snapshot(LIVE_REGISTRY_ROOT).counts
        }
        self.assertIn("smuggled_by_a_property", after)
        self.assertEqual(len(before) + 1, len(after))

    def test_a_mapping_of_counts_is_enrolled_too(self) -> None:
        """The second shape the record actually uses — `classification_counts`
        and `dimension_verified_counts` are both mappings."""

        self.add_count_property(
            "smuggled_mapping", "smuggled_in_a_mapping", shape="mapping"
        )
        self.assertIn(
            "smuggled_in_a_mapping",
            {
                count.label
                for count in build_snapshot(LIVE_REGISTRY_ROOT).counts
            },
        )

    def test_a_cached_property_count_is_enrolled_too(self) -> None:
        """It is a descriptor with a function and the value is reachable in
        the same way as a property; silence here would leave an idiomatic
        derived count outside publication."""

        self.add_count_property(
            "smuggled_cached", "smuggled_in_a_cached_property", shape="cached"
        )
        self.assertIn(
            "smuggled_in_a_cached_property",
            {
                count.label
                for count in build_snapshot(LIVE_REGISTRY_ROOT).counts
            },
        )
        self.assertIn(
            "cached_property",
            prose(coverage_module.CoverageSnapshot.counts.fget.__doc__),
        )

    def test_the_payload_guard_fails_when_a_property_is_not_published(
        self,
    ) -> None:
        """Publication itself runs the comparison, not only this test class."""

        self.add_count_property("smuggled_count", "smuggled_by_a_property")
        with self.assertRaises(ValueError) as caught:
            snapshot_payload(build_snapshot(LIVE_REGISTRY_ROOT))
        self.assertIn("smuggled_by_a_property", str(caught.exception))

    def test_the_guard_is_green_without_the_mutation(self) -> None:
        """The control. Without the added property the same guard passes, so
        the failure above is the mutation and not a broken guard."""

        snapshot = build_snapshot(LIVE_REGISTRY_ROOT)
        payload = snapshot_payload(snapshot)
        self.assertEqual(
            {count.label for count in snapshot.counts},
            payload_count_labels(payload),
        )

    def test_no_two_counts_share_a_label(self) -> None:
        """Direct enumeration corroborates the publication-path tests below."""

        snapshot = build_snapshot(LIVE_REGISTRY_ROOT)
        counts = snapshot.counts
        self.assertEqual(len(counts), len({count.label for count in counts}))
        valid_payload = canonical_json_bytes(snapshot_payload(snapshot))
        self.assertEqual(COMMITTED_SNAPSHOT.read_bytes(), valid_payload)
        self.assertTrue(
            build_release(
                root=LIVE_REGISTRY_ROOT,
                version="0.1.0",
                created_at_utc=CREATED_AT,
            ).payload_sha256.startswith("72ccc63f")
        )

        self.add_count_property(
            "smuggled_duplicate", "first_cohort_brands_with_a_source_read"
        )
        with self.assertRaises(ValueError) as caught:
            build_snapshot(LIVE_REGISTRY_ROOT).counts
        self.assertIn(
            "first_cohort_brands_with_a_source_read", str(caught.exception)
        )

    def test_snapshot_payload_refuses_a_duplicate_count_label(self) -> None:
        snapshot = build_snapshot(LIVE_REGISTRY_ROOT)
        self.add_count_property(
            "smuggled_duplicate", "first_cohort_brands_with_a_source_read"
        )
        with self.assertRaises(ValueError) as caught:
            snapshot_payload(snapshot)
        self.assertIn(
            "first_cohort_brands_with_a_source_read", str(caught.exception)
        )

    def test_build_release_refuses_a_duplicate_count_label(self) -> None:
        self.add_count_property(
            "smuggled_duplicate", "first_cohort_brands_with_a_source_read"
        )
        with self.assertRaises(ValueError) as caught:
            build_release(
                root=LIVE_REGISTRY_ROOT,
                version="0.1.0",
                created_at_utc=CREATED_AT,
            )
        self.assertIn(
            "first_cohort_brands_with_a_source_read", str(caught.exception)
        )

    def test_counts_is_not_reached_by_its_own_enumeration(self) -> None:
        """`counts` is a property too. Walking it would recurse forever, so it
        is skipped by name, and this pins that the skip is exactly one name."""

        snapshot = build_snapshot(LIVE_REGISTRY_ROOT)
        self.assertEqual(25, len(snapshot.counts))
        self.assertNotIn("counts", {count.label for count in snapshot.counts})


class CountEnrollmentResidualTests(RootCase):
    """What the derivation does **not** reach, asserted so the list cannot rot.

    Same shape as :class:`DeclaredUrlResidualTests`: each count *shape* the
    docstring names as unreached is exercised here and asserted **still open**.
    The one named residual bound elsewhere is the non-homogeneous mapping,
    which :class:`PublicationGuardSeamTests` drives through ``snapshot_payload``.
    """

    def add(self, name: str, label: str, shape: str) -> None:
        CountEnrollmentDerivationTests.add_count_property(
            self, name, label, shape=shape
        )

    def with_dataclass_count_field(self, label: str) -> CoverageSnapshot:
        residual = MeasuredCount(
            label=label,
            count=0,
            denominator=0,
            denominator_label="sources_in_denominator",
            measured_by="coverage.discover_registry_root",
        )

        @dataclass(frozen=True)
        class SnapshotWithCountField(CoverageSnapshot):
            residual_count: MeasuredCount = residual

        snapshot = build_snapshot(LIVE_REGISTRY_ROOT)
        return SnapshotWithCountField(
            **{
                field.name: getattr(snapshot, field.name)
                for field in fields(CoverageSnapshot)
            }
        )

    def test_every_named_count_shape_is_genuinely_still_unenrolled(
        self,
    ) -> None:
        cases = (
            ("tuple", "smuggled_in_a_tuple", "tuple"),
            (
                "mapping of mappings",
                "smuggled_in_a_mapping_of_mappings",
                "mapping_of_mappings",
            ),
            ("plain class attribute", "smuggled_in_an_attribute", "plain"),
            ("dataclass field", "smuggled_in_a_dataclass_field", "dataclass"),
        )
        for index, (name, label, shape) in enumerate(cases):
            with self.subTest(name=name):
                if shape == "dataclass":
                    snapshot = self.with_dataclass_count_field(label)
                else:
                    self.add(f"smuggled_residual_{index}", label, shape)
                    snapshot = build_snapshot(LIVE_REGISTRY_ROOT)
                self.assertNotIn(
                    label, {count.label for count in snapshot.counts}
                )

    def test_a_wrong_value_under_the_right_label_passes_enrolment_untouched(
        self,
    ) -> None:
        snapshot = build_snapshot(LIVE_REGISTRY_ROOT)
        correct = snapshot.first_cohort_brand_count
        wrong_count = correct.count + 1
        self.assertLessEqual(wrong_count, correct.denominator)
        original = CoverageSnapshot.first_cohort_brand_count

        def wrong(_snapshot: CoverageSnapshot) -> MeasuredCount:
            return MeasuredCount(
                label=correct.label,
                count=wrong_count,
                denominator=correct.denominator,
                denominator_label=correct.denominator_label,
                measured_by=correct.measured_by,
            )

        setattr(CoverageSnapshot, "first_cohort_brand_count", property(wrong))
        self.addCleanup(
            setattr, CoverageSnapshot, "first_cohort_brand_count", original
        )
        enrolled = {count.label: count for count in snapshot.counts}
        self.assertEqual(wrong_count, enrolled[correct.label].count)
        self.assertEqual(
            wrong_count,
            snapshot_payload(snapshot)["first_cohort_brand_count"]["count"],
        )

    def test_the_docstring_names_each_residual(self) -> None:
        """Secondary deletion guard; the preceding residual tests exercise
        every claim against ``CoverageSnapshot.counts`` itself."""

        text = prose(coverage_module.CoverageSnapshot.counts.fget.__doc__)
        for fragment in (
            "what this does not close",
            "tuple",
            "mapping of mappings",
            "not one of those descriptors",
            "dataclass field",
            "not homogeneous",
            "does not check that a count is right",
        ):
            with self.subTest(fragment=fragment):
                self.assertIn(fragment, text)

    def test_the_module_docstring_says_the_payload_list_is_hand_written(
        self,
    ) -> None:
        """Secondary deletion guard for behavior attacked above.

        The property-installation tests prove the record side is derived and
        that omitting it from the hand-written payload makes publication
        refuse; these fragments are not credited as that attack.
        """

        text = coverage_module.__doc__ or ""
        self.assertIn("enumerated by introspection", text)
        self.assertIn("still written by hand", text)
        payload_doc = releases_module.snapshot_payload.__doc__ or ""
        self.assertIn("still written by hand", payload_doc)
        self.assertIn("derived by introspection", payload_doc)


# ---------------------------------------------------------------------------
# Wave 5, F1/F2/F5. The publication guard itself: what its collector walks,
# what each of its three refusal arms refuses, and what stays open.
# ---------------------------------------------------------------------------


def doctored_count_payload(
    label: str = "doctored_count_nobody_measured",
) -> dict[str, object]:
    """A count-shaped mapping the record does not hold.

    Exactly the five keys ``MeasuredCount.as_payload`` emits and no sixth,
    because the production collector matches on the exact five-key set and
    anything wider is a container to it rather than a count.
    """

    return {
        "count": 0,
        "denominator": SOURCE_COUNT,
        "denominator_label": "sources_in_denominator",
        "label": label,
        "measured_by": "coverage.discover_registry_root",
    }


class PublicationGuardSeamTests(RootCase):
    """The guard's three refusal arms, each driven to refusal directly.

    Wave 4 shipped ``_require_count_publication_matches`` with a docstring
    claiming refusals in both directions and a wrong-field refusal, while the
    only arm any test drove was ``missing``; deleting the ``unexpected`` and
    ``changed`` computations left the whole suite green. Wave 5 then called
    ``unexpected`` and ``changed`` unreachable through
    ``snapshot_payload``. They are not: the builder publishes its two count
    mappings unconditionally while the record enrolls them conditionally, and
    it reads descriptors before the record enumeration reads them again. This
    class attacks both mechanisms through the public builder, keeps the direct
    seam attacks that bind each refusal independently, and attacks the
    collector's own traversal and duplicate-label branches at their seam.
    """

    def snapshot_and_payload(
        self,
    ) -> tuple[CoverageSnapshot, dict[str, object]]:
        snapshot = build_snapshot(LIVE_REGISTRY_ROOT)
        return snapshot, dict(snapshot_payload(snapshot))

    def test_a_list_nested_count_is_collected_by_the_production_walk(
        self,
    ) -> None:
        """The F1 hole. This exact probe collected zero labels at `a46c5e85`:
        a count nested in a `list` was publishable through canonical JSON
        while standing invisible to the guard, and the test-side walkers
        already descended into lists, so the attacker and the guard disagreed
        about what "reachable" means."""

        cases = (
            ("list", lambda count: [count]),
            ("list inside a tuple", lambda count: ([count],)),
            ("tuple inside a list", lambda count: [(count,)]),
        )
        for container, wrap in cases:
            with self.subTest(container=container):
                collected = releases_module._published_count_payloads(
                    {"wrapper": wrap(doctored_count_payload())}
                )
                self.assertEqual(
                    {"doctored_count_nobody_measured"}, set(collected)
                )

    def test_a_count_is_not_a_leaf_to_the_production_walk(self) -> None:
        """Canonical JSON walks a count's values, so the collector must too.

        The claim is the canonical container set, not a level count, so the
        depths run past any plausible cap and the containers are mixed: a walk
        capped at one or two levels below a count fails the deeper rows, and a
        walk that descends only some container types fails the mixed ones."""

        def nest(value: object, depth: int) -> object:
            for level in range(depth):
                if level % 3 == 0:
                    value = [value]
                elif level % 3 == 1:
                    value = {f"level_{level}": value}
                else:
                    value = (value,)
            return value

        for depth in (1, 2, 4, 7):
            with self.subTest(depth=depth):
                inner = doctored_count_payload("inner_count_inside_a_count")
                outer = doctored_count_payload("outer_count")
                outer["measured_by"] = nest(inner, depth)
                payload = {"wrapper": outer}
                self.assertTrue(canonical_json_bytes(payload).endswith(b"\n"))
                self.assertEqual(
                    {"outer_count", "inner_count_inside_a_count"},
                    set(releases_module._published_count_payloads(payload)),
                )

    def test_the_collectors_own_duplicate_label_arm_refuses(self) -> None:
        """Direct seam attack: two five-field counts under one label."""

        first = doctored_count_payload("duplicate_at_collector_seam")
        second = doctored_count_payload("duplicate_at_collector_seam")
        second["count"] = 1
        with self.assertRaises(ValueError) as caught:
            releases_module._published_count_payloads(
                {"first": first, "second": second}
            )
        message = str(caught.exception)
        self.assertIn("two counts with the same label", message)
        self.assertIn("duplicate_at_collector_seam", message)

    def test_snapshot_payload_refuses_a_mapping_the_record_does_not_enrol(
        self,
    ) -> None:
        """A duck-typed payload value makes the mapping non-homogeneous."""

        snapshot = build_snapshot(LIVE_REGISTRY_ROOT)
        label = "published_but_not_enrolled"

        class PayloadOnlyCount:
            def as_payload(self) -> Mapping[str, object]:
                return doctored_count_payload(label)

        original = CoverageSnapshot.classification_counts
        setattr(
            CoverageSnapshot,
            "classification_counts",
            property(lambda _snapshot: {"PAYLOAD_ONLY": PayloadOnlyCount()}),
        )
        self.addCleanup(
            setattr, CoverageSnapshot, "classification_counts", original
        )
        self.assertNotIn(label, {count.label for count in snapshot.counts})

        with self.assertRaises(ValueError) as caught:
            snapshot_payload(snapshot)
        message = str(caught.exception)
        self.assertIn("published counts absent from the record", message)
        self.assertIn(label, message)

    def test_snapshot_payload_refuses_a_descriptor_that_changes_between_reads(
        self,
    ) -> None:
        """The builder and record enumeration read the descriptor separately."""

        snapshot = build_snapshot(LIVE_REGISTRY_ROOT)
        reads = 0

        def changing(_snapshot: CoverageSnapshot) -> Mapping[str, MeasuredCount]:
            nonlocal reads
            reads += 1
            return {
                "STATEFUL": MeasuredCount(
                    label="stateful_public_count",
                    count=reads - 1,
                    denominator=2,
                    denominator_label="descriptor_reads",
                    measured_by="test.stateful_descriptor",
                )
            }

        original = CoverageSnapshot.classification_counts
        setattr(CoverageSnapshot, "classification_counts", property(changing))
        self.addCleanup(
            setattr, CoverageSnapshot, "classification_counts", original
        )

        with self.assertRaises(ValueError) as caught:
            snapshot_payload(snapshot)
        self.assertEqual(2, reads)
        message = str(caught.exception)
        self.assertIn(
            "four non-label fields differ under their shared label", message
        )
        self.assertIn("stateful_public_count", message)

    def test_an_unexpected_count_is_refused_at_the_comparison(self) -> None:
        """The `unexpected` arm driven independently at the comparison seam."""

        cases = (
            ("list-nested", lambda count: [count]),
            ("mapping-nested", lambda count: {"inner": count}),
        )
        for container, wrap in cases:
            with self.subTest(container=container):
                snapshot, payload = self.snapshot_and_payload()
                payload["doctored"] = wrap(doctored_count_payload())
                with self.assertRaises(ValueError) as caught:
                    releases_module._require_count_publication_matches(
                        snapshot, payload
                    )
                message = str(caught.exception)
                self.assertIn(
                    "published counts absent from the record", message
                )
                self.assertIn("doctored_count_nobody_measured", message)

    def test_a_right_label_count_with_one_changed_field_is_refused(
        self,
    ) -> None:
        """The `changed` arm. One field at a time, because the label is the
        lookup key and the other four fields must all be compared as values."""

        cases = (
            ("count", lambda entry: entry["count"] + 1),
            ("denominator", lambda entry: entry["denominator"] + 1),
            (
                "denominator_label",
                lambda entry: entry["denominator_label"] + "_wrong",
            ),
            ("measured_by", lambda entry: "coverage.discover_registry_root"),
        )
        for field_name, doctor in cases:
            with self.subTest(field=field_name):
                snapshot, payload = self.snapshot_and_payload()
                doctored = dict(payload["verified_item_count"])
                doctored[field_name] = doctor(doctored)
                payload["verified_item_count"] = doctored
                with self.assertRaises(ValueError) as caught:
                    releases_module._require_count_publication_matches(
                        snapshot, payload
                    )
                message = str(caught.exception)
                self.assertIn(
                    "four non-label fields differ under their shared label",
                    message,
                )
                self.assertIn(
                    "verified_items_with_backing_evidence", message
                )

    def test_the_comparison_is_green_without_the_doctoring(self) -> None:
        """The control also proves the comparison body actually runs."""

        snapshot, payload = self.snapshot_and_payload()
        calls: list[Mapping[str, Mapping[str, object]]] = []
        original = releases_module._published_count_payloads

        def observed(
            candidate: object,
        ) -> Mapping[str, Mapping[str, object]]:
            collected = original(candidate)
            calls.append(collected)
            return collected

        releases_module._published_count_payloads = observed
        self.addCleanup(
            setattr, releases_module, "_published_count_payloads", original
        )
        releases_module._require_count_publication_matches(snapshot, payload)
        self.assertEqual(1, len(calls))
        self.assertEqual(
            {count.label for count in snapshot.counts}, set(calls[0])
        )


class PublicationGuardResidualTests(RootCase):
    """What the publication guard does **not** close, asserted still open.

    Same shape as :class:`DeclaredUrlResidualTests`. Wave 4 shipped the guard
    as the lane's only rule without a `what this does not close` section;
    these are its reproduced residuals, each exercised so the new section
    cannot be wrong in either direction.
    """

    def test_a_sixth_key_makes_a_count_shaped_mapping_a_container(
        self,
    ) -> None:
        """The guard and the test helpers hold two definitions of what a
        count *is*: exact five-key set here, superset in
        ``payload_count_labels``. The divergent verdict on one object is
        asserted so the stated difference cannot drift unnoticed."""

        carrier = doctored_count_payload("smuggled_under_a_sixth_key")
        carrier["sixth_key"] = doctored_count_payload(
            "nested_inside_the_carrier"
        )
        collected = releases_module._published_count_payloads(
            {"wrapper": carrier}
        )
        # To the guard the carrier is a container: never compared itself,
        # walked for nested counts, so only the inner one is collected.
        self.assertEqual({"nested_inside_the_carrier"}, set(collected))
        # The test helper's superset match flags the carrier as a count too.
        self.assertEqual(
            {"smuggled_under_a_sixth_key", "nested_inside_the_carrier"},
            payload_count_labels({"wrapper": carrier}),
        )

    def test_direct_release_construction_bypasses_the_guard(self) -> None:
        """Pre-existing at base and now named rather than implied closed: the
        guard binds ``snapshot_payload`` and everything that calls it, not
        the ``RegistryRelease`` constructor. Self-consistent doctored bytes
        construct a release without the comparison ever running."""

        snapshot = build_snapshot(LIVE_REGISTRY_ROOT)
        payload = dict(snapshot_payload(snapshot))
        doctored = dict(payload["verified_item_count"])
        doctored["count"] = doctored["count"] + 1
        payload["verified_item_count"] = doctored
        raw = canonical_json_bytes(payload)
        release = releases_module.RegistryRelease(
            release_id=releases_module.RELEASE_ID_PREFIX + "0.1.0",
            version="0.1.0",
            payload_sha256=hashlib.sha256(raw).hexdigest(),
            source_denominator_sha256=releases_module.source_denominator_digest(
                snapshot
            ),
            created_at_utc=CREATED_AT,
            payload_bytes=raw,
        )
        self.assertEqual(raw, release.payload_bytes)
        self.assertNotEqual(
            COMMITTED_SNAPSHOT.read_bytes(), release.payload_bytes
        )

    def test_a_cyclic_payload_exhausts_the_stack_instead_of_being_refused(
        self,
    ) -> None:
        """The residual is the failure mode, not a bypass.

        A container that holds itself is walked forever. Both the collector and
        the canonical serialiser stop only at the recursion limit, so the
        payload is unpublishable — by ``RecursionError``, which names no field,
        rather than by a refusal that says what is wrong."""

        cycle: list[object] = []
        cycle.append(cycle)
        count = doctored_count_payload("cyclic_count")
        count["measured_by"] = cycle
        payload = {"wrapper": count}
        for name, call in (
            ("collector", releases_module._published_count_payloads),
            ("canonical serialiser", canonical_json_bytes),
        ):
            with self.subTest(walk=name), self.assertRaises(RecursionError):
                call(payload)

    def test_test_walkers_and_the_collector_require_a_string_label(self) -> None:
        """The attacker and guard agree on the label-type boundary."""

        count = doctored_count_payload()
        count["label"] = 7
        for name, walk in (
            ("collector", releases_module._published_count_payloads),
            ("label attacker", payload_count_labels),
            ("fingerprint attacker", payload_count_objects),
        ):
            with self.subTest(walk=name), self.assertRaises(TypeError):
                walk({"wrapper": count})

    def test_the_collector_docstring_records_what_it_does_not_close(
        self,
    ) -> None:
        """Secondary deletion guard for the collector behaviors above."""

        text = prose(releases_module._published_count_payloads.__doc__)
        for fragment in (
            "what this does not close",
            "sixth key",
            "a container, not a count",
            "superset",
            "``list``",
            "does not make that mapping a leaf",
            "contains itself",
            "nonempty and every value",
        ):
            with self.subTest(fragment=fragment):
                self.assertIn(fragment, text)

    def test_the_comparison_docstring_records_what_it_does_not_close(
        self,
    ) -> None:
        """Secondary deletion guard for the direct-constructor behavior."""

        text = prose(
            releases_module._require_count_publication_matches.__doc__
        )
        for fragment in (
            "what this does not close",
            "not the ``registryrelease`` constructor",
            "pre-existing at base",
        ):
            with self.subTest(fragment=fragment):
                self.assertIn(fragment, text)


# ---------------------------------------------------------------------------
# G2. The declared-URL rule: userinfo, the percent grammar, and an accurate
# statement of what stays open.
# ---------------------------------------------------------------------------


# A reviewer reads the brand before the `@`; every fetcher reads the host after
# it. Each of these was **accepted** before this wave.
USERINFO_URL_CASES: tuple[tuple[str, str], ...] = (
    ("bare userinfo", "https://www.hafele.com@evil.invalid/products/"),
    ("userinfo with password", "https://www.blum.com:pass@203.0.113.9/x"),
    ("empty userinfo", "https://@evil.invalid/x"),
    ("userinfo before a query", "https://titus.example@evil.invalid?a=1"),
    ("userinfo before a fragment", "https://ovvo.example@evil.invalid#f"),
    ("percent-encoded userinfo", "https://a%40b@evil.invalid/x"),
)

# `%` is the one admitted character that is not a literal: it introduces an
# escape, and an escape that is not exactly two hex digits is not an escape.
MALFORMED_PERCENT_URL_CASES: tuple[tuple[str, str], ...] = (
    ("non-hex pair", "https://example.invalid/%zz"),
    ("non-hex pair after bracket-port colon", "https://[::1]:%zz/x"),
    ("one hex digit then end", "https://example.invalid/%e"),
    ("bare trailing percent", "https://example.invalid/x%"),
    ("percent then delimiter", "https://example.invalid/%/a"),
    ("second digit non-hex", "https://example.invalid/%0g"),
)

# Refused because the character they decode to is refused unencoded, and an
# escape that smuggled it back in would make the rule depend on spelling.
CONTROL_ESCAPE_URL_CASES: tuple[tuple[str, str], ...] = (
    ("nul", "https://example.invalid/%00"),
    ("line feed", "https://example.invalid/a%0Ab"),
    ("unit separator", "https://example.invalid/%1F"),
    ("delete", "https://example.invalid/%7F"),
    ("lowercase hex line feed", "https://example.invalid/a%0ab"),
)

# Well-formed escapes that must stay admitted. RFC 3986 requires exactly this
# form for a non-ASCII byte, and `_require_declared_url`'s own refusal message
# tells a writer to use it.
ADMITTED_ESCAPE_URLS: tuple[tuple[str, str], ...] = (
    ("latin supplement octet", "https://example.invalid/caf%C3%A9"),
    ("encoded delimiter", "https://example.invalid/a%2Fb"),
    ("encoded space", "https://example.invalid/a%20b"),
    ("lowercase hex digits", "https://example.invalid/caf%c3%a9"),
)

# **The residual list, asserted rather than described.** Every one of these is
# still admitted after this wave. They are named in `_require_declared_url`'s
# docstring, and this is what stops that docstring drifting from the code in
# either direction: a case that quietly became refused would fail here, and the
# docstring would then be claiming a weakness it no longer has.
STILL_OPEN_URL_CASES: tuple[tuple[str, str], ...] = (
    ("rn read as m", "https://exarnple.invalid/x"),
    ("digit one read as letter l", "https://1ockdowel.invalid/x"),
    ("digit zero read as letter O", "https://l0ckdowel.invalid/x"),
    (
        "brand name as a subdomain prefix",
        "https://www.hafele.com.evil.invalid/x",
    ),
    ("brand name in the path", "https://evil.invalid/www.hafele.com/products/"),
    (
        "percent-encoded zero width space",
        "https://exam%E2%80%8Bple.invalid/x",
    ),
    # Added in wave 3. `%40` is not a literal `@`, so RFC 3986 reads the whole
    # string as one reg-name and no fetcher reaches `evil.invalid` — it is not
    # a live spoof. It is admitted, it was not on the list, and the list is
    # what this wave is about.
    (
        "percent-encoded at sign in the host",
        "https://www.hafele.com%40evil.invalid/",
    ),
    # Added in wave 3 with the host rule. The rule asks whether a host is
    # **present**; it does not ask whether the host is well formed.
    ("empty IP-literal brackets", "https://[]/x"),
    ("unclosed IP-literal bracket", "https://[2001:db8::1/x"),
    # Wave 4 names the port boundary rather than silently parsing only the
    # host. RFC 3986 section 3.2.3's `port = *DIGIT` is not implemented here.
    ("non-digit port", "https://host:abc/x"),
    ("negative port", "https://host:-1/x"),
    ("out-of-range digit port", "https://host:99999999999/x"),
    ("multiple unbracketed colons", "https://a:b:c/x"),
    ("empty port", "https://host:/x"),
    # Filed under host well-formedness: it has no opening bracket.
    ("unmatched closing bracket", "https://]/x"),
    # Added in wave 5. The bracket rule admits any suffix whose first
    # character is `:` and applies no port grammar or range after it, so the
    # port residual reaches bracketed hosts too.
    (
        "bracketed host with an unparsed port suffix",
        "https://[::1]:8080extra/x",
    ),
    # Wave 6 names the embedded-bracket branch instead of implying the
    # bracketed-host refusal sees a bracket that does not start the authority.
    (
        "opening bracket embedded after reg-name text",
        "https://a[::1]:8443/x",
    ),
)

# The ten-case matrix `_require_hostful_authority_without_userinfo` is judged
# against. Wave 2 wrote it; wave 3 changed the implementation underneath it
# from "the authority string is empty" to "the authority names no host", so
# every row here is regression surface and each is asserted with its verdict
# rather than left to two separate tests to imply.
AUTHORITY_MATRIX: tuple[tuple[str, str, bool], ...] = (
    ("port", "https://example.invalid:8443/a", True),
    ("IPv4 literal", "https://203.0.113.9/x", True),
    ("IPv6 literal", "https://[2001:db8::1]/x", True),
    ("at sign in the path", "https://example.invalid/a@b", True),
    ("at sign in the query", "https://example.invalid/x?to=a@b", True),
    ("at sign in the fragment", "https://example.invalid/x#a@b", True),
    ("no authority before a path", "https:///path", False),
    ("no authority before a query", "https://?a=1", False),
    ("no authority before a fragment", "https://#f", False),
    ("no authority, bare slash", "https:///", False),
)

# Refused by wave 3 and **admitted at `277d508b`**: the authority string is
# nonempty, so the old `if not authority:` never fired, but RFC 3986 section
# 3.2 reads `authority = [ userinfo "@" ] host [ ":" port ]`, and the host in
# each of these is the empty string.
HOSTLESS_AUTHORITY_URL_CASES: tuple[tuple[str, str], ...] = (
    ("port only", "https://:8443/x"),
    ("well-known port only", "https://:80"),
    ("colon then path", "https://:/x"),
    ("bare colon", "https://:"),
    ("colon then query", "https://:?a=1"),
    ("colon then fragment", "https://:#f"),
)


class DeclaredUrlAuthorityTests(RootCase):
    """Userinfo is an unread grammar feature, not a font accident.

    The rule's own justification is that *the only thing standing between the
    transcription and that fetch is a human reading the committed line*. A
    reviewer reading `https://www.hafele.com@evil.invalid/` reads Häfele; every
    fetcher reads `evil.invalid`. That defeats the exact check the rule rests
    on, and it does so with characters that are all inside the admitted set.
    """

    def refuse_url(self, name: str, url: str) -> str:
        root = self.new_root(f"authority-{name}")
        self.with_brands([brand_row()], root)
        self.with_declared([declared_row(url=url)], root)
        return self.assert_refused(
            root, f"{SOURCE_DENOMINATOR_FILENAME}:1", "url"
        )

    def test_userinfo_is_refused_in_the_authority(self) -> None:
        for index, (label, url) in enumerate(USERINFO_URL_CASES):
            with self.subTest(label=label):
                message = self.refuse_url(f"userinfo-{index}", url)
                self.assertIn("userinfo", message)

    def test_the_type_refuses_userinfo_too_not_only_the_file_reader(
        self,
    ) -> None:
        for label, url in USERINFO_URL_CASES:
            with self.subTest(label=label):
                with self.assertRaises(ValueError) as caught:
                    SourceDenominatorEntry(
                        source_id=DECLARED_ID,
                        sha256=None,
                        state=DECLARED_UNREAD,
                        url=url,
                    )
                self.assertIn("userinfo", str(caught.exception))

    def test_the_refusal_names_the_host_a_fetcher_would_reach(self) -> None:
        """A refusal saying only "bad URL" would leave the reader guessing
        which of the two hosts on the line is the real one."""

        message = self.refuse_url(
            "names-host", "https://www.hafele.com@evil.invalid/products/"
        )
        self.assertIn("evil.invalid", message)

    def test_an_authority_that_names_no_host_is_refused(self) -> None:
        """Falls out of parsing the authority, and is refused rather than
        parsed and then ignored."""

        for index, url in enumerate(
            ("https:///path", "https://?a=1", "https://#f", "https:///")
        ):
            with self.subTest(url=url):
                self.refuse_url(f"empty-authority-{index}", url)

    def test_a_port_an_ip_literal_and_a_later_at_sign_are_admitted(
        self,
    ) -> None:
        """Non-vacuity: the rule refuses userinfo, not authorities, and `@` is
        an ordinary character once the authority has ended."""

        for url in (
            "https://example.invalid:8443/a",
            "https://203.0.113.9/x",
            "https://[2001:db8::1]/x",
            "https://example.invalid/a@b",
            "https://example.invalid/x?to=a@b",
            "https://example.invalid/x#a@b",
        ):
            with self.subTest(url=url):
                entry = SourceDenominatorEntry(
                    source_id=DECLARED_ID,
                    sha256=None,
                    state=DECLARED_UNREAD,
                    url=url,
                )
                self.assertEqual(url, entry.url)


class DeclaredUrlPercentGrammarTests(RootCase):
    """`%` introduces an escape, so a `%` that introduces nothing is refused."""

    def refuse_url(self, name: str, url: str) -> str:
        root = self.new_root(f"percent-{name}")
        self.with_brands([brand_row()], root)
        self.with_declared([declared_row(url=url)], root)
        return self.assert_refused(
            root, f"{SOURCE_DENOMINATOR_FILENAME}:1", "url"
        )

    def test_a_malformed_escape_is_refused(self) -> None:
        for index, (label, url) in enumerate(MALFORMED_PERCENT_URL_CASES):
            with self.subTest(label=label):
                message = self.refuse_url(f"malformed-{index}", url)
                self.assertIn("two hexadecimal digits", message)

    def test_an_escape_decoding_to_a_control_is_refused(self) -> None:
        """The recorded decision, asserted. The unencoded character is refused,
        so admitting its escaped spelling would make the rule depend on how the
        same octet happens to be written."""

        for index, (label, url) in enumerate(CONTROL_ESCAPE_URL_CASES):
            with self.subTest(label=label):
                message = self.refuse_url(f"control-escape-{index}", url)
                self.assertIn("percent-escape", message)

    def test_a_well_formed_escape_is_still_admitted(self) -> None:
        """The other half of the same decision, and the reason a blanket
        refusal was not taken: RFC 3986 requires this form for non-ASCII."""

        for label, url in ADMITTED_ESCAPE_URLS:
            with self.subTest(label=label):
                entry = SourceDenominatorEntry(
                    source_id=DECLARED_ID,
                    sha256=None,
                    state=DECLARED_UNREAD,
                    url=url,
                )
                self.assertEqual(url, entry.url)

    def test_the_type_refuses_a_malformed_escape_too(self) -> None:
        for label, url in MALFORMED_PERCENT_URL_CASES:
            with self.subTest(label=label):
                with self.assertRaises(ValueError):
                    SourceDenominatorEntry(
                        source_id=DECLARED_ID,
                        sha256=None,
                        state=DECLARED_UNREAD,
                        url=url,
                    )


class DeclaredUrlHostTests(RootCase):
    """The rule says *names no host*; wave 2 implemented *authority is empty*.

    RFC 3986 section 3.2 reads ``authority = [ userinfo "@" ] host [ ":" port
    ]``, so ``":8443"`` is an authority whose **host** is the empty string. The
    old check tested the authority *string*, which is one character away from
    the sentence it was written to enforce.
    """

    def refuse_url(self, name: str, url: str) -> str:
        root = self.new_root(f"host-{name}")
        self.with_brands([brand_row()], root)
        self.with_declared([declared_row(url=url)], root)
        return self.assert_refused(
            root, f"{SOURCE_DENOMINATOR_FILENAME}:1", "url"
        )

    def test_an_authority_whose_host_is_empty_is_refused(self) -> None:
        for index, (label, url) in enumerate(HOSTLESS_AUTHORITY_URL_CASES):
            with self.subTest(label=label, url=url):
                message = self.refuse_url(f"empty-host-{index}", url)
                self.assertIn("names no host", message)

    def test_the_type_refuses_them_too_not_only_the_file_reader(self) -> None:
        for label, url in HOSTLESS_AUTHORITY_URL_CASES:
            with self.subTest(label=label, url=url):
                with self.assertRaises(ValueError) as caught:
                    SourceDenominatorEntry(
                        source_id=DECLARED_ID,
                        sha256=None,
                        state=DECLARED_UNREAD,
                        url=url,
                    )
                self.assertIn("names no host", str(caught.exception))

    def test_the_refusal_states_the_rule_it_comes_from(self) -> None:
        """A refusal reading only "bad URL" would leave a writer guessing that
        the port was the problem."""

        message = self.refuse_url("explains", "https://:8443/x")
        self.assertIn("host", message)
        self.assertIn("port", message)

    def test_text_after_a_bracketed_host_is_refused(self) -> None:
        url = "https://[::1]evil.invalid/x"
        message = self.refuse_url("bracket-suffix", url)
        for fragment in ("evil.invalid", "reviewer", "fetcher"):
            with self.subTest(fragment=fragment):
                self.assertIn(fragment, message)
        with self.assertRaises(ValueError):
            SourceDenominatorEntry(
                source_id=DECLARED_ID,
                sha256=None,
                state=DECLARED_UNREAD,
                url=url,
            )

    def test_the_named_bracket_well_formedness_residuals_stay_admitted(
        self,
    ) -> None:
        for url in ("https://[]/x", "https://[2001:db8::1/x"):
            with self.subTest(url=url):
                entry = SourceDenominatorEntry(
                    source_id=DECLARED_ID,
                    sha256=None,
                    state=DECLARED_UNREAD,
                    url=url,
                )
                self.assertEqual(url, entry.url)

    def test_a_bracketed_host_with_a_port_is_admitted(self) -> None:
        """The admitted side of the bracket-suffix boundary, which no test
        drove until this wave: the suffix after ``]`` must be empty or begin
        with ``:``, and an over-broad refusal of any suffix at all would have
        passed the whole suite while refusing every bracketed host that names
        a port. ``https://[::1]:/x`` attacks the exact boundary — the suffix
        is one character, and that character is ``:``."""

        for url in ("https://[::1]:8443/x", "https://[::1]:/x"):
            with self.subTest(url=url):
                entry = SourceDenominatorEntry(
                    source_id=DECLARED_ID,
                    sha256=None,
                    state=DECLARED_UNREAD,
                    url=url,
                )
                self.assertEqual(url, entry.url)

    def test_the_ten_case_matrix_is_unchanged(self) -> None:
        """Every currently-refused case still refused, every currently-admitted
        case still admitted. This is the regression surface the brief names."""

        for index, (label, url, admitted) in enumerate(AUTHORITY_MATRIX):
            with self.subTest(label=label, url=url, admitted=admitted):
                if admitted:
                    entry = SourceDenominatorEntry(
                        source_id=DECLARED_ID,
                        sha256=None,
                        state=DECLARED_UNREAD,
                        url=url,
                    )
                    self.assertEqual(url, entry.url)
                else:
                    self.refuse_url(f"matrix-{index}", url)

    def test_the_host_rule_records_what_it_does_not_close(self) -> None:
        """Secondary deletion guard for the residual table's behavior."""

        text = prose(
            coverage_module._require_hostful_authority_without_userinfo.__doc__
        )
        for fragment in (
            "what this does not close",
            "well formed",
            "ip-literal",
            "port = *digit",
            "https://]/x",
            # Added in wave 5: the clause used to say only an optional
            # `":" port` may stand after the bracket, which overstates what
            # is enforced — the suffix's content is never parsed.
            "https://[::1]:8080extra/x",
            "https://a[::1]:8443/x",
            "no port grammar or range",
        ):
            with self.subTest(fragment=fragment):
                self.assertIn(fragment, text)


class DeclaredUrlResidualTests(RootCase):
    """What the rule does **not** close, asserted so the record cannot drift.

    A residual list is a claim about behaviour. Left as prose it can be wrong
    in either direction — it can name a case that is actually refused, or omit
    the strongest one, which is what happened at `b7cd54ab`. Each case below is
    exercised, so the docstring and the code have to agree.
    """

    def test_every_named_residual_is_genuinely_still_admitted(self) -> None:
        for label, url in STILL_OPEN_URL_CASES:
            with self.subTest(label=label):
                entry = SourceDenominatorEntry(
                    source_id=DECLARED_ID,
                    sha256=None,
                    state=DECLARED_UNREAD,
                    url=url,
                )
                self.assertEqual(url, entry.url)

    def test_the_docstring_names_each_residual_class(self) -> None:
        """Secondary deletion guard; the residual table is the attack.

        It asserts the statement and tested behaviour land in one commit. It
        does not assert the list is exhaustive, and nothing here claims it.
        """

        text = coverage_module._require_declared_url.__doc__ or ""
        for fragment in (
            "``rn`` against ``m``",
            "userinfo",
            "percent-escape",
            "subdomain",
            "Nothing here resolves a host",
            # Added in wave 3. The first was admitted and unlisted; the second
            # is what the new host rule deliberately does not check.
            "%40",
            "well formed",
            "port = *DIGIT",
            "https://]/x",
            # Added in wave 5: the port residual reaches bracketed hosts.
            "https://[::1]:8080extra/x",
            "https://a[::1]:8443/x",
            "no port grammar or range",
        ):
            with self.subTest(fragment=fragment):
                self.assertIn(fragment, text)

    def test_the_committed_fourteen_are_unaffected_by_this_wave(self) -> None:
        """The transcriptions must stay byte-unchanged and still admitted."""

        rows = read_jsonl(LIVE_REGISTRY_ROOT / SOURCE_DENOMINATOR_FILENAME)
        self.assertEqual(SOURCE_COUNT, len(rows))
        declared = {
            source_id: url
            for source_id, _brand_id, url in EXPECTED_DECLARED_SOURCES
        }
        for row in rows:
            with self.subTest(source_id=row["source_id"]):
                url = str(row["url"])
                self.assertEqual(declared[str(row["source_id"])], url)
                self.assertNotIn("@", url)
                self.assertNotIn("%", url)
                entry = SourceDenominatorEntry(
                    source_id=str(row["source_id"]),
                    sha256=None,
                    state=DECLARED_UNREAD,
                    url=url,
                )
                self.assertEqual(url, entry.url)


# ---------------------------------------------------------------------------
# G3. `brand_name` admitted exactly the class `url` refuses, and F1 moved it
# into the hashed payload.
# ---------------------------------------------------------------------------


# Deliberately **not** the URL rule. A brand name legitimately carries
# non-ASCII — Häfele, Välinge, Italiana Ferramenta — so the refusal is by
# Unicode general category, never by an ASCII allowlist.
#
# Written as code points rather than as literals: every character here is
# invisible, or renders as something it is not, in whatever editor a reviewer
# reads this file in. That is the entire reason the table exists, so it must
# not be spelled in a way that hides its own contents.
REFUSED_BRAND_NAME_CODE_POINTS: tuple[tuple[str, int], ...] = (
    ("Cc", 0x0000),
    ("Cc", 0x000A),
    ("Cc", 0x001B),
    ("Cf", 0x200B),
    ("Cf", 0xFEFF),
    ("Cf", 0x00AD),
    ("Cf", 0x202E),  # bidi control: right-to-left override
    ("Cf", 0x200F),  # bidi control: right-to-left mark
    ("Cf", 0x2066),  # bidi control: left-to-right isolate
    ("Cn", 0x0378),
    ("Co", 0xE000),
    ("Zl", 0x2028),
    ("Zp", 0x2029),
    ("Zs", 0x00A0),
    ("Zs", 0x3000),
)

# A lone surrogate is refused by the same rule, but it cannot survive a JSONL
# file at all: `json.dumps(...).encode("utf-8")` raises before the reader could
# ever see it. It is asserted through the type only, and named here so the
# asymmetry is deliberate rather than an omission.
SURROGATE_CODE_POINT = 0xD800

# Only invisibles, or only non-ASCII separators: refused because a name with
# nothing visible left in it is not a name a reader can count.
INVISIBLE_ONLY_BRAND_NAMES: tuple[str, ...] = (
    chr(0x200B) * 3,
    chr(0x202E),
    chr(0x00A0) + chr(0x3000),
)

# Must stay admitted. A rule that refused these would have broken the twelve.
ADMITTED_BRAND_NAMES: tuple[str, ...] = (
    "Blum",
    "Häfele",
    "Välinge/Threespine",
    "Festool DOMINO",
    "Hoffmann Machine Company",
    "KNAPP",
    "Italiana Ferramenta",
    # Outside the cohort, and admitted on purpose: the rule is about invisible
    # and unassigned characters, not about scripts.
    "ニチハ",
    "Wilh. Schütte & Co.",
)


def refused_brand_name(code_point: int) -> str:
    return "Blum" + chr(code_point) + "Evil"


def code_point_label(code_point: int) -> str:
    return f"U+{code_point:04X}"


class BrandNameCharacterClassTests(RootCase):
    """A brand name is a published, counted, human-read string.

    `first_cohort_brand_count` publishes ``0 of 12``, and the duplicate-name
    refusal exists so that *a reader counting names counts what the
    denominator states*. Byte equality does not deliver that: two spellings of
    one rendered name, or a name padded with invisibles, each defeat it. F1 is
    what moved this field into the released bytes, so the argument that
    justified fixing `url` transfers to it unchanged.
    """

    def refuse_name(self, name: str, brand_name: str) -> str:
        root = self.new_root(f"brand-{name}")
        self.with_brands([brand_row(brand_name=brand_name)], root)
        self.with_declared([declared_row()], root)
        return self.assert_refused(
            root, f"{BRAND_UNIVERSE_FILENAME}:1", "brand_name"
        )

    def test_the_premise_of_each_case_is_the_category_it_claims(self) -> None:
        """A Unicode version that reassigned one of these must fail loudly
        rather than quietly make a case test nothing."""

        for category, code_point in (
            *REFUSED_BRAND_NAME_CODE_POINTS,
            ("Cs", SURROGATE_CODE_POINT),
        ):
            with self.subTest(code_point=code_point_label(code_point)):
                self.assertEqual(
                    category, unicodedata.category(chr(code_point))
                )

    def test_each_refused_category_is_named_by_the_refusal(self) -> None:
        for index, (category, code_point) in enumerate(
            REFUSED_BRAND_NAME_CODE_POINTS
        ):
            with self.subTest(
                category=category, code_point=code_point_label(code_point)
            ):
                message = self.refuse_name(
                    f"cat-{index}", refused_brand_name(code_point)
                )
                self.assertIn(code_point_label(code_point), message)
                self.assertIn(category, message)

    def test_the_type_refuses_them_too_not_only_the_file_reader(self) -> None:
        for category, code_point in (
            *REFUSED_BRAND_NAME_CODE_POINTS,
            ("Cs", SURROGATE_CODE_POINT),
        ):
            with self.subTest(
                category=category, code_point=code_point_label(code_point)
            ):
                with self.assertRaises(ValueError) as caught:
                    BrandUniverseEntry(
                        brand_id="brand:demo",
                        brand_name=refused_brand_name(code_point),
                        source_ids=(DECLARED_ID,),
                    )
                self.assertIn(
                    code_point_label(code_point), str(caught.exception)
                )

    def test_a_name_that_is_empty_once_the_invisibles_go_is_refused(
        self,
    ) -> None:
        for index, brand_name in enumerate(INVISIBLE_ONLY_BRAND_NAMES):
            with self.subTest(brand_name=ascii(brand_name)):
                self.refuse_name(f"invisible-only-{index}", brand_name)

    def test_legitimate_non_ascii_names_are_still_admitted(self) -> None:
        """The control that keeps every test above from going vacuous."""

        for brand_name in ADMITTED_BRAND_NAMES:
            with self.subTest(brand_name=brand_name):
                entry = BrandUniverseEntry(
                    brand_id="brand:demo",
                    brand_name=brand_name,
                    source_ids=(DECLARED_ID,),
                )
                self.assertEqual(brand_name, entry.brand_name)

    def test_the_twelve_committed_names_are_admitted_unchanged(self) -> None:
        """Byte for byte, through the type and through the live root."""

        rows = read_jsonl(LIVE_REGISTRY_ROOT / BRAND_UNIVERSE_FILENAME)
        self.assertEqual(BRAND_COUNT, len(rows))
        declared = dict(EXPECTED_FIRST_COHORT)
        for row in rows:
            with self.subTest(brand_id=row["brand_id"]):
                name = str(row["brand_name"])
                self.assertEqual(declared[str(row["brand_id"])], name)
                entry = BrandUniverseEntry(
                    brand_id=str(row["brand_id"]),
                    brand_name=name,
                    source_ids=tuple(row["source_ids"]),  # type: ignore[arg-type]
                )
                self.assertEqual(name, entry.brand_name)
                self.assertEqual(name, unicodedata.normalize("NFC", name))
        snapshot = build_snapshot(LIVE_REGISTRY_ROOT)
        self.assertEqual(
            sorted(declared.values()),
            sorted(entry.brand_name for entry in snapshot.brand_universe),
        )


class BrandNameNormalizationTests(RootCase):
    """Two spellings of one rendered name are one name, and must collide."""

    NFC_NAME = unicodedata.normalize("NFC", "Häfele")
    NFD_NAME = unicodedata.normalize("NFD", "Häfele")

    def test_the_premise_holds_the_two_spellings_differ_in_bytes(self) -> None:
        self.assertNotEqual(self.NFC_NAME, self.NFD_NAME)
        self.assertEqual(
            self.NFC_NAME, unicodedata.normalize("NFC", self.NFD_NAME)
        )

    def test_the_record_stores_the_composed_form(self) -> None:
        entry = BrandUniverseEntry(
            brand_id="brand:demo",
            brand_name=self.NFD_NAME,
            source_ids=(DECLARED_ID,),
        )
        self.assertEqual(self.NFC_NAME, entry.brand_name)

    def two_brand_root(self, name: str, first: str, second: str) -> Path:
        root = self.new_root(name)
        self.with_brands(
            [
                brand_row(
                    brand_id="brand:a",
                    brand_name=first,
                    source_ids=["source:a:x"],
                ),
                brand_row(
                    brand_id="brand:b",
                    brand_name=second,
                    source_ids=["source:b:x"],
                ),
            ],
            root,
        )
        self.with_declared(
            [
                declared_row("source:a:x", "https://a.invalid/"),
                declared_row("source:b:x", "https://b.invalid/"),
            ],
            root,
        )
        return root

    def test_two_spellings_of_one_name_are_refused_in_the_file(self) -> None:
        root = self.two_brand_root("nfc-file", self.NFC_NAME, self.NFD_NAME)
        self.assert_refused(
            root, f"{BRAND_UNIVERSE_FILENAME}:2", "duplicate brand_name"
        )

    def test_two_spellings_of_one_name_are_refused_on_the_record(self) -> None:
        """The same invariant where it belongs, for a caller with no file."""

        with self.assertRaises(ValueError) as caught:
            CoverageSnapshot(
                discovered_item_count=0,
                items=(),
                unclassified=(),
                blocked_sources=(),
                source_denominator=(
                    SourceDenominatorEntry(
                        source_id="source:a:x",
                        sha256=None,
                        state=DECLARED_UNREAD,
                        url="https://a.invalid/",
                    ),
                    SourceDenominatorEntry(
                        source_id="source:b:x",
                        sha256=None,
                        state=DECLARED_UNREAD,
                        url="https://b.invalid/",
                    ),
                ),
                evidence_gate_findings=(),
                brand_universe=(
                    BrandUniverseEntry(
                        brand_id="brand:a",
                        brand_name=self.NFC_NAME,
                        source_ids=("source:a:x",),
                    ),
                    BrandUniverseEntry(
                        brand_id="brand:b",
                        brand_name=self.NFD_NAME,
                        source_ids=("source:b:x",),
                    ),
                ),
            )
        self.assertIn("duplicate brand_name", str(caught.exception))

    def test_two_genuinely_different_names_still_coexist(self) -> None:
        """Non-vacuity: normalization must collapse spellings, not brands."""

        snapshot = build_snapshot(
            self.two_brand_root("nfc-distinct", "Häfele", "Hafele")
        )
        self.assertEqual(2, snapshot.first_cohort_brand_count.denominator)

    def test_the_published_bytes_carry_the_composed_form(self) -> None:
        root = self.new_root("nfc-payload")
        self.with_brands(
            [
                brand_row(
                    brand_id="brand:a",
                    brand_name=self.NFD_NAME,
                    source_ids=["source:a:x"],
                )
            ],
            root,
        )
        self.with_declared(
            [declared_row("source:a:x", "https://a.invalid/")], root
        )
        raw = canonical_json_bytes(snapshot_payload(build_snapshot(root)))
        self.assertIn(self.NFC_NAME.encode("utf-8"), raw)
        self.assertNotIn(self.NFD_NAME.encode("utf-8"), raw)

    def test_the_docstring_states_the_categories_and_the_form(self) -> None:
        """Secondary deletion guard for the category and NFC tests above."""

        text = coverage_module.BrandUniverseEntry.__doc__ or ""
        for fragment in (
            "``Cc``",
            "``Cf``",
            "``Cn``",
            "``Co``",
            "``Cs``",
            "``Zl``",
            "``Zp``",
            "``Zs``",
            "NFC",
        ):
            with self.subTest(fragment=fragment):
                self.assertIn(fragment, text)


# ---------------------------------------------------------------------------
# H1. The category rule refused two named invisibles while its prose closed the
# class. `Lo`, `So` and `Mn` hold characters that render as nothing too, and a
# trailing U+0020 made a second brand out of one name.
# ---------------------------------------------------------------------------


# The transcription `coverage.py` carries, written here a second time rather
# than imported from that module so the two can be compared entry by entry.
# Both were transcribed in one sitting by one author; independence is not
# claimed. Source: Unicode 16.0.0 `DerivedCoreProperties.txt`, property
# `Default_Ignorable_Code_Point`, restricted to the members whose general
# category is **not** already on `_REFUSED_BRAND_NAME_CATEGORIES`, plus U+2800
# which is not `Default_Ignorable` and renders as an empty braille cell.
#
# It is a **transcription, not a derivation**: `unicodedata` exposes no
# `Default_Ignorable_Code_Point` accessor, so nothing here can re-derive it and
# nothing here proves it complete. What can be checked is checked below.
TRANSCRIBED_INVISIBLE_RANGES: tuple[tuple[int, int, str], ...] = (
    (0x034F, 0x034F, "Mn"),
    (0x115F, 0x1160, "Lo"),
    (0x17B4, 0x17B5, "Mn"),
    (0x180B, 0x180D, "Mn"),
    (0x180F, 0x180F, "Mn"),
    (0x2800, 0x2800, "So"),
    (0x3164, 0x3164, "Lo"),
    (0xFE00, 0xFE0F, "Mn"),
    (0xFFA0, 0xFFA0, "Lo"),
    (0xE0100, 0xE01EF, "Mn"),
)

TRANSCRIBED_INVISIBLE_CODE_POINTS = frozenset(
    code_point
    for start, end, _category in TRANSCRIBED_INVISIBLE_RANGES
    for code_point in range(start, end + 1)
)

# The Unicode release the transcription above was read against. Pinned rather
# than tolerated: a release that adds a member changes what the rule ought to
# refuse, and nothing in this package would notice unless this fails.
TRANSCRIBED_AGAINST_UNICODE = "16.0.0"

# The five the orchestrator reproduced as **admitted** at `277d508b`, each
# appended to a real cohort name. Named individually so the reproduction and
# the fix sit beside each other.
REPRODUCED_ADMITTED_INVISIBLES: tuple[tuple[int, str], ...] = (
    (0x3164, "Lo"),
    (0x115F, "Lo"),
    (0x2800, "So"),
    (0x034F, "Mn"),
    (0xFFA0, "Lo"),
)


class BrandNameInvisibleTranscriptionTests(RootCase):
    """The category rule closed `Cc` and `Cf`; the prose closed *renders as nothing*.

    Those are not the same set. `U+3164` is `Lo`, `U+2800` is `So`, `U+034F` is
    `Mn`, and all three render as nothing. No category rule can reach them and
    `unicodedata` exposes no property that names the class, so the refusal is
    **extended by transcription** and the prose is **narrowed to say so**.
    """

    def refuse_name(self, name: str, brand_name: str) -> str:
        root = self.new_root(f"invisible-{name}")
        self.with_brands([brand_row(brand_name=brand_name)], root)
        self.with_declared([declared_row()], root)
        return self.assert_refused(
            root, f"{BRAND_UNIVERSE_FILENAME}:1", "brand_name"
        )

    def test_the_transcription_is_pinned_to_the_release_it_was_read_from(
        self,
    ) -> None:
        """The staleness residual, made loud instead of silent.

        A transcription cannot notice a Unicode release that adds a member.
        This is the only thing that can, so it fails rather than skips.
        """

        self.assertEqual(
            TRANSCRIBED_AGAINST_UNICODE,
            unicodedata.unidata_version,
            "the invisible-code-point list in coverage.py was transcribed "
            f"from Unicode {TRANSCRIBED_AGAINST_UNICODE} and is not derived "
            "from anything this interpreter can query; re-read "
            "DerivedCoreProperties.txt for this release before changing this "
            "constant",
        )

    def test_every_transcribed_code_point_has_the_category_it_claims(
        self,
    ) -> None:
        """Attacks the transcription itself, not the code that consumes it."""

        for start, end, category in TRANSCRIBED_INVISIBLE_RANGES:
            for code_point in range(start, end + 1):
                with self.subTest(code_point=code_point_label(code_point)):
                    self.assertEqual(
                        category, unicodedata.category(chr(code_point))
                    )

    def test_no_transcribed_code_point_was_already_refused_by_category(
        self,
    ) -> None:
        """Every member must be doing work. A member the category rule already
        refuses would make the list look larger than the hole it closes."""

        for code_point in sorted(TRANSCRIBED_INVISIBLE_CODE_POINTS):
            with self.subTest(code_point=code_point_label(code_point)):
                self.assertNotIn(
                    unicodedata.category(chr(code_point)),
                    coverage_module._REFUSED_BRAND_NAME_CATEGORIES,
                )

    def test_the_module_carries_the_same_transcription(self) -> None:
        """A second in-test transcription, compared entry by entry.

        Both copies were transcribed in one sitting by one author; the test
        claims a comparison, not independent authorship.
        """

        self.assertEqual(
            TRANSCRIBED_INVISIBLE_CODE_POINTS,
            coverage_module._REFUSED_BRAND_NAME_CODE_POINTS,
        )
        self.assertEqual(268, len(TRANSCRIBED_INVISIBLE_CODE_POINTS))
        # Spot-named so a reviewer can check the boundaries by eye rather than
        # by trusting a set comparison between two lists in one commit.
        for code_point, expected in (
            (0x034F, "COMBINING GRAPHEME JOINER"),
            (0x115F, "HANGUL CHOSEONG FILLER"),
            (0x1160, "HANGUL JUNGSEONG FILLER"),
            (0x17B4, "KHMER VOWEL INHERENT AQ"),
            (0x2800, "BRAILLE PATTERN BLANK"),
            (0x3164, "HANGUL FILLER"),
            (0xFE0F, "VARIATION SELECTOR-16"),
            (0xFFA0, "HALFWIDTH HANGUL FILLER"),
            (0xE01EF, "VARIATION SELECTOR-256"),
        ):
            with self.subTest(code_point=code_point_label(code_point)):
                self.assertEqual(expected, unicodedata.name(chr(code_point)))

    def test_the_five_reproduced_admissions_are_refused_and_named(
        self,
    ) -> None:
        """Each of these was **admitted** at `277d508b`, appended to `Häfele`."""

        for index, (code_point, category) in enumerate(
            REPRODUCED_ADMITTED_INVISIBLES
        ):
            with self.subTest(
                code_point=code_point_label(code_point), category=category
            ):
                message = self.refuse_name(
                    f"reproduced-{index}", "Häfele" + chr(code_point)
                )
                self.assertIn(code_point_label(code_point), message)
                self.assertIn("renders as nothing", message)

    def test_the_type_refuses_every_transcribed_code_point(self) -> None:
        """All 268, through the type rather than through a file."""

        for code_point in sorted(TRANSCRIBED_INVISIBLE_CODE_POINTS):
            with self.subTest(code_point=code_point_label(code_point)):
                with self.assertRaises(ValueError) as caught:
                    BrandUniverseEntry(
                        brand_id="brand:demo",
                        brand_name=refused_brand_name(code_point),
                        source_ids=(DECLARED_ID,),
                    )
                self.assertIn(
                    code_point_label(code_point), str(caught.exception)
                )

    def test_a_name_made_only_of_transcribed_invisibles_is_refused(
        self,
    ) -> None:
        """`'ㅤㅤㅤ'` was a brand at `277d508b`."""

        for index, code_point in enumerate((0x3164, 0x2800, 0x115F, 0x034F)):
            with self.subTest(code_point=code_point_label(code_point)):
                self.refuse_name(
                    f"only-invisible-{index}", chr(code_point) * 3
                )

    def test_a_name_padded_with_one_collides_with_nothing_because_it_is_refused(
        self,
    ) -> None:
        """The harm the rule exists to stop: two rows that print the same."""

        root = self.new_root("invisible-pair")
        self.with_brands(
            [
                brand_row(
                    brand_id="brand:a",
                    brand_name="Häfele",
                    source_ids=["source:a:x"],
                ),
                brand_row(
                    brand_id="brand:b",
                    brand_name="Häfele" + chr(0x3164),
                    source_ids=["source:b:x"],
                ),
            ],
            root,
        )
        self.with_declared(
            [
                declared_row("source:a:x", "https://a.invalid/"),
                declared_row("source:b:x", "https://b.invalid/"),
            ],
            root,
        )
        self.assert_refused(root, f"{BRAND_UNIVERSE_FILENAME}:2", "U+3164")

    def test_the_docstring_states_that_it_is_a_transcription(self) -> None:
        """Secondary deletion guard for the transcription tests above."""

        text = prose(coverage_module.BrandUniverseEntry.__doc__)
        for fragment in (
            "transcription",
            "default_ignorable_code_point",
            TRANSCRIBED_AGAINST_UNICODE,
            "not a derivation",
        ):
            with self.subTest(fragment=fragment):
                self.assertIn(fragment, text)


class BrandNameWhitespaceTests(RootCase):
    """`'Festool DOMINO'` and `'Festool DOMINO '` were two brands.

    The rule's own argument for refusing U+00A0 is that *`Festool DOMINO`
    spelled with U+00A0 renders exactly like `Festool DOMINO` spelled with
    U+0020 and would sit beside it as a second brand*. The U+0020 spelling of
    that same collision was admitted — one character away from the case the
    docstring argues.
    """

    PAIR = ("Festool DOMINO", "Festool DOMINO ")

    def two_brand_root(self, name: str, first: str, second: str) -> Path:
        root = self.new_root(name)
        self.with_brands(
            [
                brand_row(
                    brand_id="brand:a",
                    brand_name=first,
                    source_ids=["source:a:x"],
                ),
                brand_row(
                    brand_id="brand:b",
                    brand_name=second,
                    source_ids=["source:b:x"],
                ),
            ],
            root,
        )
        self.with_declared(
            [
                declared_row("source:a:x", "https://a.invalid/"),
                declared_row("source:b:x", "https://b.invalid/"),
            ],
            root,
        )
        return root

    def test_a_trailing_space_collides_in_the_file(self) -> None:
        self.assert_refused(
            self.two_brand_root("trailing-space", *self.PAIR),
            f"{BRAND_UNIVERSE_FILENAME}:2",
            "duplicate brand_name",
        )

    def test_a_leading_space_collides_too(self) -> None:
        self.assert_refused(
            self.two_brand_root(
                "leading-space", "Festool DOMINO", " Festool DOMINO"
            ),
            f"{BRAND_UNIVERSE_FILENAME}:2",
            "duplicate brand_name",
        )

    def test_the_same_collision_is_refused_on_the_record(self) -> None:
        """The invariant where it belongs, for a caller with no file."""

        with self.assertRaises(ValueError) as caught:
            CoverageSnapshot(
                discovered_item_count=0,
                items=(),
                unclassified=(),
                blocked_sources=(),
                source_denominator=(
                    SourceDenominatorEntry(
                        source_id="source:a:x",
                        sha256=None,
                        state=DECLARED_UNREAD,
                        url="https://a.invalid/",
                    ),
                    SourceDenominatorEntry(
                        source_id="source:b:x",
                        sha256=None,
                        state=DECLARED_UNREAD,
                        url="https://b.invalid/",
                    ),
                ),
                evidence_gate_findings=(),
                brand_universe=(
                    BrandUniverseEntry(
                        brand_id="brand:a",
                        brand_name=self.PAIR[0],
                        source_ids=("source:a:x",),
                    ),
                    BrandUniverseEntry(
                        brand_id="brand:b",
                        brand_name=self.PAIR[1],
                        source_ids=("source:b:x",),
                    ),
                ),
            )
        self.assertIn("duplicate brand_name", str(caught.exception))

    def test_the_record_stores_the_trimmed_name(self) -> None:
        for supplied in (
            "Festool DOMINO ",
            " Festool DOMINO",
            "  Festool DOMINO  ",
        ):
            with self.subTest(supplied=ascii(supplied)):
                entry = BrandUniverseEntry(
                    brand_id="brand:demo",
                    brand_name=supplied,
                    source_ids=(DECLARED_ID,),
                )
                self.assertEqual("Festool DOMINO", entry.brand_name)

    def test_the_published_bytes_carry_the_trimmed_name(self) -> None:
        root = self.new_root("trimmed-payload")
        self.with_brands(
            [
                brand_row(
                    brand_id="brand:a",
                    brand_name=" Festool DOMINO ",
                    source_ids=["source:a:x"],
                )
            ],
            root,
        )
        self.with_declared(
            [declared_row("source:a:x", "https://a.invalid/")], root
        )
        raw = canonical_json_bytes(snapshot_payload(build_snapshot(root)))
        self.assertIn(b'"brand_name":"Festool DOMINO"', raw)
        self.assertNotIn(b'"brand_name":" Festool DOMINO "', raw)

    def test_only_u0020_is_trimmed_and_every_other_space_is_refused(
        self,
    ) -> None:
        """Trimming a refused character would silently repair a line a human
        has to read; each of these is refused by name instead."""

        for code_point in (0x00A0, 0x3000, 0x2007, 0x205F):
            with self.subTest(code_point=code_point_label(code_point)):
                with self.assertRaises(ValueError) as caught:
                    BrandUniverseEntry(
                        brand_id="brand:demo",
                        brand_name="Festool DOMINO" + chr(code_point),
                        source_ids=(DECLARED_ID,),
                    )
                self.assertIn(
                    code_point_label(code_point), str(caught.exception)
                )

    def test_a_name_of_only_spaces_is_still_refused_as_blank(self) -> None:
        for supplied in (" ", "   ", "\t "):
            with self.subTest(supplied=ascii(supplied)):
                with self.assertRaises(ValueError) as caught:
                    BrandUniverseEntry(
                        brand_id="brand:demo",
                        brand_name=supplied,
                        source_ids=(DECLARED_ID,),
                    )
                self.assertIn("blank", str(caught.exception))

    def test_a_name_of_only_non_u0020_zs_is_refused_as_blank_first(
        self,
    ) -> None:
        with self.assertRaises(ValueError) as caught:
            BrandUniverseEntry(
                brand_id="brand:demo",
                brand_name="\u3000",
                source_ids=(DECLARED_ID,),
            )
        self.assertEqual("brand_name must not be blank", str(caught.exception))

    def test_the_twelve_committed_names_are_unaffected_by_trimming(
        self,
    ) -> None:
        """None of them carries a leading or trailing U+0020, so trimming is a
        no-op on all twelve — the control that keeps the fix from moving data."""

        for _brand_id, brand_name in EXPECTED_FIRST_COHORT:
            with self.subTest(brand_name=brand_name):
                self.assertEqual(brand_name, brand_name.strip(" "))
                entry = BrandUniverseEntry(
                    brand_id="brand:demo",
                    brand_name=brand_name,
                    source_ids=(DECLARED_ID,),
                )
                self.assertEqual(brand_name, entry.brand_name)

    def test_the_docstring_states_what_is_trimmed(self) -> None:
        """Secondary deletion guard for the trim/refusal tests above."""

        text = prose(coverage_module.BrandUniverseEntry.__doc__)
        for fragment in (
            "leading and trailing",
            "u+0020",
            "all-whitespace",
            "refused as blank before",
        ):
            with self.subTest(fragment=fragment):
                self.assertIn(fragment, text)


# Each of these is **still admitted** after wave 3, is named in
# `BrandUniverseEntry`'s docstring, and is asserted below. The list cannot be
# wrong in either direction: a case that quietly became refused fails here, and
# the docstring would then be claiming a weakness the rule no longer has.
STILL_OPEN_BRAND_NAME_CASES: tuple[tuple[str, str], ...] = (
    # Cyrillic U+0443 in place of Latin `u`. Refusing it would mean an ASCII
    # allowlist, which would refuse three of the twelve committed names.
    ("cyrillic homograph", "Blуm"),
    # Interior runs are not collapsed. Only the ends are trimmed.
    ("interior double space", "Festool  DOMINO"),
    # A name with no base character at all.
    ("combining marks only", "́́́"),
    # Padding with a visible-but-tiny mark rather than an invisible one.
    ("padded with a combining mark", "Blum̀"),
)


class BrandNameResidualTests(RootCase):
    """What the brand-name rule does **not** close, in the residual shape.

    `_require_declared_url` has carried a tested residual list since wave 2.
    `BrandUniverseEntry` carried none at all while making a class-level claim,
    and that asymmetry is the finding this class answers.
    """

    def test_every_named_residual_is_genuinely_still_admitted(self) -> None:
        for label, brand_name in STILL_OPEN_BRAND_NAME_CASES:
            with self.subTest(label=label, brand_name=ascii(brand_name)):
                entry = BrandUniverseEntry(
                    brand_id="brand:demo",
                    brand_name=brand_name,
                    source_ids=(DECLARED_ID,),
                )
                self.assertEqual(
                    unicodedata.normalize("NFC", brand_name), entry.brand_name
                )

    def test_an_interior_double_space_still_makes_two_brands(self) -> None:
        """The residual with its consequence spelled out: the cohort
        denominator counts two where a reader sees one name twice."""

        root = self.new_root("interior-space")
        self.with_brands(
            [
                brand_row(
                    brand_id="brand:a",
                    brand_name="Festool DOMINO",
                    source_ids=["source:a:x"],
                ),
                brand_row(
                    brand_id="brand:b",
                    brand_name="Festool  DOMINO",
                    source_ids=["source:b:x"],
                ),
            ],
            root,
        )
        self.with_declared(
            [
                declared_row("source:a:x", "https://a.invalid/"),
                declared_row("source:b:x", "https://b.invalid/"),
            ],
            root,
        )
        self.assertEqual(
            2, build_snapshot(root).first_cohort_brand_count.denominator
        )

    def test_a_homograph_still_makes_two_brands(self) -> None:
        root = self.new_root("homograph-pair")
        self.with_brands(
            [
                brand_row(
                    brand_id="brand:a",
                    brand_name="Blum",
                    source_ids=["source:a:x"],
                ),
                brand_row(
                    brand_id="brand:b",
                    brand_name="Blуm",
                    source_ids=["source:b:x"],
                ),
            ],
            root,
        )
        self.with_declared(
            [
                declared_row("source:a:x", "https://a.invalid/"),
                declared_row("source:b:x", "https://b.invalid/"),
            ],
            root,
        )
        self.assertEqual(
            2, build_snapshot(root).first_cohort_brand_count.denominator
        )

    def test_the_docstring_names_each_residual(self) -> None:
        """Secondary deletion guard for the admitted residuals above."""

        text = prose(coverage_module.BrandUniverseEntry.__doc__)
        for fragment in (
            "what this does not close",
            "homograph",
            "interior runs",
            "combining mark",
            "transcription",
        ):
            with self.subTest(fragment=fragment):
                self.assertIn(fragment, text)


# ---------------------------------------------------------------------------
# G4. The anchor resolves a path, and the reader must open **that** path.
# ---------------------------------------------------------------------------


class AnchorResolvedPathTests(RootCase):
    """`_require_inside_root` returned a resolved path both callers discarded.

    Severity is low — an attacker needs write access to the registry root,
    which already permits arbitrary content — but passing the resolved path to
    the read is free, and check-then-open is a shape that should not be left in
    a module whose whole subject is what a release attests.
    """

    def redirect(self, mapping: Mapping[str, Path]) -> None:
        """Make the anchor return a different, still-inside path.

        The direct proof that the *returned* path is what gets opened: if a
        caller re-opens its own unpinned argument, this redirect has no effect
        at all.
        """

        original = coverage_module._require_inside_root

        def patched(root: Path, path: Path, origin: str) -> Path:
            resolved = original(root, path, origin)
            replacement = mapping.get(origin)
            if replacement is None:
                return resolved
            return original(root, replacement, origin)

        coverage_module._require_inside_root = patched
        self.addCleanup(
            setattr, coverage_module, "_require_inside_root", original
        )

    def test_an_item_file_is_read_from_the_resolved_path(self) -> None:
        root = self.new_root("resolved-item")
        write_jsonl(root / "evidence-manifest.jsonl", [manifest_row()])
        self.with_cached_source(root)
        real = root / "real-items.jsonl.txt"
        write_jsonl(real, [item_row()])
        self.assertEqual((), build_snapshot(root).items)

        self.redirect({"materials.jsonl": real})
        self.assertEqual(
            (DEMO_ITEM_ID,),
            tuple(item.item_id for item in build_snapshot(root).items),
        )

    def test_the_source_manifest_is_read_from_the_resolved_path(self) -> None:
        root = self.new_root("resolved-manifest")
        self.with_cached_source(root)
        real = root / "real-manifest.jsonl.txt"
        write_jsonl(real, [manifest_row()])
        self.assertEqual((), build_snapshot(root).source_denominator)

        self.redirect({"evidence-manifest.jsonl": real})
        self.assertEqual(
            (DEMO_SOURCE_ID,),
            tuple(
                entry.source_id
                for entry in build_snapshot(root).source_denominator
            ),
        )

    def test_a_denominator_input_file_is_read_from_the_resolved_path(
        self,
    ) -> None:
        root = self.new_root("resolved-denominator")
        self.with_brands([brand_row()], root)
        self.with_declared([], root)
        real = root / "real-declared.jsonl.txt"
        write_jsonl(real, [declared_row()])
        # Without the redirect the empty file is read and the brand claims a
        # source the denominator does not hold, so the root is refused.
        with self.assertRaises(ValueError):
            build_snapshot(root)

        self.redirect({SOURCE_DENOMINATOR_FILENAME: real})
        self.assertEqual(
            (DECLARED_ID,),
            tuple(
                entry.source_id
                for entry in build_snapshot(root).source_denominator
            ),
        )

    def test_the_residual_is_recorded_rather_than_claimed_closed(self) -> None:
        """Secondary deletion guard for the resolved-path and junction tests.

        Resolving and then opening still leaves a window a rename could use;
        this fragment check is not credited as the behavioral attack.
        """

        text = coverage_module._require_inside_root.__doc__ or ""
        self.assertIn("resolved path", text)
        self.assertIn("junction", text)


class WindowsDirectoryJunctionTests(RootCase):
    """A junction is not a symlink, and the difference is measured, not assumed.

    The module recorded that directory symlinks are not followed. On Windows a
    directory **junction** reports ``is_symlink() == False``, ``Path.rglob``
    therefore descends it, and the file inside is caught by the anchor rather
    than going unmeasured. That is a real difference between the two platforms,
    and the record read as though junctions behaved like symlinks.
    """

    def outside_directory(self) -> Path:
        outside = self.workspace / "outside-junction"
        outside.mkdir(parents=True, exist_ok=True)
        write_jsonl(outside / "smuggled.jsonl", [item_row()])
        return outside

    def make_junction(self, link: Path, target: Path) -> None:
        if sys.platform != "win32":  # pragma: no cover - platform dependent
            self.skipTest("directory junctions exist only on Windows")
        result = subprocess.run(
            ["cmd", "/c", "mklink", "/J", str(link), str(target)],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:  # pragma: no cover - host dependent
            self.skipTest(f"mklink /J unavailable: {result.stderr.strip()}")
        # Removed before the workspace is torn down, so the cleanup cannot walk
        # through the junction into its target.
        self.addCleanup(lambda: link.is_dir() and link.rmdir())

    def test_a_junction_is_descended_and_the_file_inside_is_refused(
        self,
    ) -> None:
        root = self.new_root("junction")
        junction = root / "nested"
        self.make_junction(junction, self.outside_directory())

        # The measured premise: not a symlink, and therefore listed.
        self.assertFalse(junction.is_symlink())
        listed = {
            path.relative_to(root).as_posix() for path in root.rglob("*.jsonl")
        }
        self.assertIn("nested/smuggled.jsonl", listed)

        self.assert_refused(
            root, "nested/smuggled.jsonl", "outside the registry root"
        )

    def test_a_directory_symlink_is_still_not_descended(self) -> None:
        """The contrast, so the two cases are recorded as the two facts they
        are: one is refused by name, the other goes unmeasured."""

        root = self.new_root("symlinked-directory")
        link = root / "nested"
        try:
            os.symlink(
                self.outside_directory(), link, target_is_directory=True
            )
        except (OSError, NotImplementedError) as error:  # pragma: no cover
            self.skipTest(f"symlink creation unavailable: {error}")
        self.assertTrue(link.is_symlink())
        listed = {
            path.relative_to(root).as_posix() for path in root.rglob("*.jsonl")
        }
        self.assertNotIn("nested/smuggled.jsonl", listed)
        # Unmeasured, not refused. Still unhandled, and still recorded.
        self.assertEqual(0, build_snapshot(root).discovered_item_count)


if __name__ == "__main__":  # pragma: no cover - manual invocation
    unittest.main()
