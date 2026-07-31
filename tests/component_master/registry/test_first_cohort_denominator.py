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
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
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
    SourceDenominatorEntry,
    build_snapshot,
    discover_registry_root,
)
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
        "4e61581ceee3515d263d326fcb1fa011f44bfc85ed381833be10779b14cc0171"
    )
    LIVE_PAYLOAD_BYTE_COUNT = 8746

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
)

MEASURED_COUNT_KEYS = frozenset(
    {"count", "denominator", "denominator_label", "label", "measured_by"}
)


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


if __name__ == "__main__":  # pragma: no cover - manual invocation
    unittest.main()
