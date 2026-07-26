"""Contracts for exact-SKU BOM and compatibility graph validation."""

from __future__ import annotations

from dataclasses import FrozenInstanceError, fields
import json
import math
from pathlib import Path
import sys
import unittest


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
PACKAGE_SOURCE = REPOSITORY_ROOT / "packages" / "component-master" / "src"
sys.path.insert(0, str(PACKAGE_SOURCE))

from monolith_component_master.compatibility import (  # noqa: E402
    BomEdge,
    CompatibilityEdge,
    CompatibilityGraph,
    EdgeType,
    GraphIssue,
)
from monolith_component_master.registry_models import (  # noqa: E402
    CommercialSku,
    LifecycleState,
    ProductModel,
    Registry,
    VerificationDimension,
    VerificationState,
)


CAM_MODEL_ID = "model:demo:cam"
BOLT_MODEL_ID = "model:demo:bolt"
CAP_MODEL_ID = "model:demo:cap"
CAM_SKU_ID = "sku:demo:cam-15:EU"
BOLT_SKU_ID = "sku:demo:bolt-24:EU"
CAP_SKU_ID = "sku:demo:cap-grey:EU"


def verification_states() -> dict[
    VerificationDimension, VerificationState
]:
    return {
        dimension: VerificationState.PENDING
        for dimension in VerificationDimension
    }


def make_model(
    model_id: str,
    *,
    lifecycle: LifecycleState = LifecycleState.ACTIVE,
) -> ProductModel:
    return ProductModel(
        model_id=model_id,
        brand_id="brand:demo",
        name=model_id.rsplit(":", 1)[-1],
        lifecycle=lifecycle,
    )


def make_sku(
    global_id: str,
    model_id: str,
    *,
    region: str = "EU",
) -> CommercialSku:
    return CommercialSku(
        global_id=global_id,
        brand_id="brand:demo",
        model_id=model_id,
        oem_order_code=global_id.rsplit(":", 2)[-2],
        region=region,
        pack_qty=1,
        verification=verification_states(),
    )


def make_registry(
    *,
    assembly_lifecycle: LifecycleState = LifecycleState.ACTIVE,
    bolt_lifecycle: LifecycleState = LifecycleState.ACTIVE,
    cap_lifecycle: LifecycleState = LifecycleState.ACTIVE,
    assembly_region: str = "EU",
    bolt_region: str = "EU",
    cap_region: str = "EU",
) -> Registry:
    models = [
        make_model(CAM_MODEL_ID, lifecycle=assembly_lifecycle),
        make_model(BOLT_MODEL_ID, lifecycle=bolt_lifecycle),
        make_model(CAP_MODEL_ID, lifecycle=cap_lifecycle),
    ]
    skus = [
        make_sku(CAM_SKU_ID, CAM_MODEL_ID, region=assembly_region),
        make_sku(BOLT_SKU_ID, BOLT_MODEL_ID, region=bolt_region),
        make_sku(CAP_SKU_ID, CAP_MODEL_ID, region=cap_region),
    ]
    return Registry(models=models, skus=skus)


def make_bom_edge(**overrides: object) -> BomEdge:
    arguments: dict[str, object] = {
        "assembly_sku_id": CAM_SKU_ID,
        "component_id": BOLT_SKU_ID,
        "edge_type": EdgeType.REQUIRES,
        "quantity": 1.0,
        "region": "EU",
        "evidence_assertion_ids": (
            "assertion:demo:cam-requires-bolt",
        ),
    }
    arguments.update(overrides)
    return BomEdge(**arguments)


def make_compatibility_edge(**overrides: object) -> CompatibilityEdge:
    arguments: dict[str, object] = {
        "source_id": CAM_SKU_ID,
        "target_id": BOLT_SKU_ID,
        "edge_type": EdgeType.COMPATIBLE,
        "region": "EU",
        "evidence_assertion_ids": (
            "assertion:demo:cam-compatible-bolt",
        ),
    }
    arguments.update(overrides)
    return CompatibilityEdge(**arguments)


def complete_fixture_edges() -> list[BomEdge]:
    return [
        make_bom_edge(),
        make_bom_edge(
            component_id=CAP_SKU_ID,
            quantity=1,
            evidence_assertion_ids=(
                "assertion:demo:cam-requires-cap",
            ),
        ),
    ]


class EdgeContractTests(unittest.TestCase):
    def test_edge_type_has_exact_approved_members_and_values(self) -> None:
        self.assertEqual(
            {
                "REQUIRES": "REQUIRES",
                "OPTIONAL": "OPTIONALLY_USES",
                "COMPATIBLE": "COMPATIBLE_WITH",
                "INCOMPATIBLE": "INCOMPATIBLE_WITH",
                "REPLACES": "REPLACES",
                "SUPERSEDES": "SUPERSEDES",
                "REGION_VARIANT": "REGION_VARIANT_OF",
                "GEOMETRY_VARIANT": "GEOMETRY_VARIANT_OF",
                "TOOLED_BY": "TOOLED_BY",
                "MACHINED_BY": "MACHINED_BY",
                "INSTALLED_WITH": "INSTALLED_WITH",
                "QUALIFIED_WITH": "QUALIFIED_WITH",
                "REQUIRES_MATERIAL_CONDITION":
                    "REQUIRES_MATERIAL_CONDITION",
            },
            {member.name: member.value for member in EdgeType},
        )

    def test_bom_edge_has_exact_frozen_field_shape(self) -> None:
        edge = make_bom_edge()

        self.assertEqual(
            [
                "assembly_sku_id",
                "component_id",
                "edge_type",
                "quantity",
                "region",
                "evidence_assertion_ids",
            ],
            [field.name for field in fields(BomEdge)],
        )
        with self.assertRaises(FrozenInstanceError):
            edge.quantity = 2

    def test_compatibility_edge_has_exact_frozen_field_shape(self) -> None:
        edge = make_compatibility_edge()

        self.assertEqual(
            [
                "source_id",
                "target_id",
                "edge_type",
                "region",
                "evidence_assertion_ids",
            ],
            [field.name for field in fields(CompatibilityEdge)],
        )
        with self.assertRaises(FrozenInstanceError):
            edge.region = "TH"

    def test_graph_issue_has_exact_frozen_field_shape(self) -> None:
        issue = GraphIssue(
            code="EXAMPLE",
            entity_id=CAM_SKU_ID,
            related_id=BOLT_SKU_ID,
            message="example",
        )

        self.assertEqual(
            ["code", "entity_id", "related_id", "message"],
            [field.name for field in fields(GraphIssue)],
        )
        with self.assertRaises(FrozenInstanceError):
            issue.code = "CHANGED"

    def test_bom_ids_and_region_are_typed_and_nonblank(self) -> None:
        cases = (
            ("assembly_sku_id", "component:demo:cam", ValueError),
            ("assembly_sku_id", "sku:   ", ValueError),
            ("assembly_sku_id", None, TypeError),
            ("component_id", "   ", ValueError),
            ("component_id", "not-canonical", ValueError),
            ("component_id", None, TypeError),
            ("region", "   ", ValueError),
            ("region", None, TypeError),
        )

        for field_name, value, error_type in cases:
            with self.subTest(field=field_name, value=value):
                with self.assertRaises(error_type):
                    make_bom_edge(**{field_name: value})

    def test_compatibility_ids_are_canonical_and_region_is_nonblank(
        self,
    ) -> None:
        cases = (
            ("source_id", "   ", ValueError),
            ("source_id", "not-canonical", ValueError),
            ("source_id", None, TypeError),
            ("target_id", "   ", ValueError),
            ("target_id", "not-canonical", ValueError),
            ("target_id", None, TypeError),
            ("region", "   ", ValueError),
            ("region", None, TypeError),
        )

        for field_name, value, error_type in cases:
            with self.subTest(field=field_name, value=value):
                with self.assertRaises(error_type):
                    make_compatibility_edge(**{field_name: value})

    def test_quantity_requires_a_positive_finite_non_boolean_real(
        self,
    ) -> None:
        invalid_values = (
            0,
            -1,
            True,
            False,
            math.inf,
            -math.inf,
            math.nan,
            "1",
            None,
        )

        for value in invalid_values:
            with self.subTest(quantity=value):
                with self.assertRaises((TypeError, ValueError)):
                    make_bom_edge(quantity=value)

        self.assertEqual(2.5, make_bom_edge(quantity=2.5).quantity)
        self.assertEqual(2, make_bom_edge(quantity=2).quantity)

    def test_edge_type_must_be_typed_and_valid_for_the_record_kind(
        self,
    ) -> None:
        with self.assertRaises(TypeError):
            make_bom_edge(edge_type="REQUIRES")
        with self.assertRaises(TypeError):
            make_compatibility_edge(edge_type="COMPATIBLE_WITH")

        for edge_type in (
            EdgeType.COMPATIBLE,
            EdgeType.INCOMPATIBLE,
            EdgeType.REPLACES,
            EdgeType.SUPERSEDES,
            EdgeType.REGION_VARIANT,
            EdgeType.GEOMETRY_VARIANT,
        ):
            with self.subTest(record="bom", edge_type=edge_type):
                with self.assertRaises(ValueError):
                    make_bom_edge(edge_type=edge_type)

        for edge_type in (
            EdgeType.REQUIRES,
            EdgeType.OPTIONAL,
            EdgeType.TOOLED_BY,
            EdgeType.MACHINED_BY,
            EdgeType.INSTALLED_WITH,
            EdgeType.QUALIFIED_WITH,
            EdgeType.REQUIRES_MATERIAL_CONDITION,
        ):
            with self.subTest(record="compatibility", edge_type=edge_type):
                with self.assertRaises(ValueError):
                    make_compatibility_edge(edge_type=edge_type)

    def test_all_bom_membership_and_operational_relationships_are_allowed(
        self,
    ) -> None:
        allowed = (
            EdgeType.REQUIRES,
            EdgeType.OPTIONAL,
            EdgeType.TOOLED_BY,
            EdgeType.MACHINED_BY,
            EdgeType.INSTALLED_WITH,
            EdgeType.QUALIFIED_WITH,
            EdgeType.REQUIRES_MATERIAL_CONDITION,
        )

        self.assertEqual(
            allowed,
            tuple(
                make_bom_edge(edge_type=edge_type).edge_type
                for edge_type in allowed
            ),
        )

    def test_evidence_ids_are_nonempty_typed_unique_assertion_tuples(
        self,
    ) -> None:
        invalid_values = (
            (),
            [],
            ("evidence:wrong-prefix",),
            ("assertion:   ",),
            (None,),
            (
                "assertion:demo:duplicate",
                "assertion:demo:duplicate",
            ),
        )

        for value in invalid_values:
            with self.subTest(value=value):
                with self.assertRaises((TypeError, ValueError)):
                    make_bom_edge(evidence_assertion_ids=value)
                with self.assertRaises((TypeError, ValueError)):
                    make_compatibility_edge(
                        evidence_assertion_ids=value
                    )

    def test_evidence_iterables_are_defensively_tuple_copied(self) -> None:
        bom_ids = ["assertion:demo:bom"]
        compatibility_ids = ["assertion:demo:compatibility"]

        bom_edge = make_bom_edge(evidence_assertion_ids=bom_ids)
        compatibility_edge = make_compatibility_edge(
            evidence_assertion_ids=compatibility_ids
        )
        bom_ids.append("assertion:demo:mutated")
        compatibility_ids.clear()

        self.assertEqual(
            ("assertion:demo:bom",),
            bom_edge.evidence_assertion_ids,
        )
        self.assertEqual(
            ("assertion:demo:compatibility",),
            compatibility_edge.evidence_assertion_ids,
        )


class CompatibilityGraphConstructionTests(unittest.TestCase):
    def test_constructor_requires_canonical_registry_and_typed_edges(
        self,
    ) -> None:
        with self.assertRaises(TypeError):
            CompatibilityGraph(object(), [], [])
        with self.assertRaises(TypeError):
            CompatibilityGraph(make_registry(), [object()], [])
        with self.assertRaises(TypeError):
            CompatibilityGraph(make_registry(), [], [object()])

    def test_constructor_snapshots_all_iterable_inputs(self) -> None:
        bom_edges = complete_fixture_edges()
        compatibility_edges = [make_compatibility_edge()]
        registered_entity_ids = ["tool:demo:installation-driver"]
        graph = CompatibilityGraph(
            make_registry(),
            bom_edges,
            compatibility_edges,
            registered_entity_ids,
        )

        bom_edges.clear()
        compatibility_edges.clear()
        registered_entity_ids.clear()

        self.assertEqual(2, len(graph.bom_edges))
        self.assertEqual(1, len(graph.compatibility_edges))
        self.assertIn(
            "tool:demo:installation-driver",
            graph.registered_entity_ids,
        )
        self.assertEqual(
            {
                CAM_SKU_ID,
                BOLT_SKU_ID,
                CAP_SKU_ID,
                "tool:demo:installation-driver",
            },
            set(graph.registered_entity_ids),
        )

    def test_duplicate_edge_records_are_rejected_before_collapse(
        self,
    ) -> None:
        bom_edge = make_bom_edge()
        compatibility_edge = make_compatibility_edge()

        with self.assertRaises(ValueError):
            CompatibilityGraph(
                make_registry(),
                [bom_edge, bom_edge],
                [],
            )
        with self.assertRaises(ValueError):
            CompatibilityGraph(
                make_registry(),
                [],
                [compatibility_edge, compatibility_edge],
            )

    def test_registered_extras_are_canonical_non_sku_entity_ids(
        self,
    ) -> None:
        valid = (
            "tool:demo:driver",
            "machine:demo:boring-centre",
            "material:demo:mdf-18",
            "qualification:demo:fixture-q1",
        )
        graph = CompatibilityGraph(
            make_registry(),
            [],
            [],
            valid,
        )

        self.assertTrue(set(valid).issubset(graph.registered_entity_ids))
        for invalid in (
            "   ",
            "not-canonical",
            "sku:demo:unregistered:EU",
            None,
        ):
            with self.subTest(value=invalid):
                with self.assertRaises((TypeError, ValueError)):
                    CompatibilityGraph(
                        make_registry(),
                        [],
                        [],
                        [invalid],
                    )


class ReleaseBomValidationTests(unittest.TestCase):
    def test_unknown_assembly_returns_one_structured_issue(self) -> None:
        graph = CompatibilityGraph(
            make_registry(),
            complete_fixture_edges(),
            [],
        )

        issues = graph.validate_release_bom(
            "sku:demo:unknown:EU",
            "EU",
        )

        self.assertIsInstance(issues, tuple)
        self.assertEqual(1, len(issues))
        self.assertEqual("UNKNOWN_ASSEMBLY", issues[0].code)
        self.assertEqual("sku:demo:unknown:EU", issues[0].entity_id)
        self.assertEqual("", issues[0].related_id)

    def test_validation_inputs_are_typed_and_nonblank(self) -> None:
        graph = CompatibilityGraph(make_registry(), [], [])

        for value, error_type in (
            ("not-a-sku", ValueError),
            ("sku:   ", ValueError),
            (None, TypeError),
        ):
            with self.subTest(field="assembly_sku_id", value=value):
                with self.assertRaises(error_type):
                    graph.validate_release_bom(value, "EU")
        for value, error_type in (
            ("   ", ValueError),
            (None, TypeError),
        ):
            with self.subTest(field="region", value=value):
                with self.assertRaises(error_type):
                    graph.validate_release_bom(CAM_SKU_ID, value)

    def test_empty_release_bom_is_refused(self) -> None:
        graph = CompatibilityGraph(make_registry(), [], [])

        issues = graph.validate_release_bom(CAM_SKU_ID, "EU")

        self.assertEqual(
            ["EMPTY_RELEASE_BOM"],
            [issue.code for issue in issues],
        )

    def test_complete_cam_bolt_cap_fixture_has_zero_issues(self) -> None:
        graph = CompatibilityGraph(
            make_registry(),
            complete_fixture_edges(),
            [make_compatibility_edge()],
        )

        self.assertEqual(
            (),
            graph.validate_release_bom(CAM_SKU_ID, "EU"),
        )

    def test_required_unregistered_mating_sku_is_refused(self) -> None:
        missing_id = "sku:demo:missing-bolt:EU"
        graph = CompatibilityGraph(
            make_registry(),
            [
                make_bom_edge(
                    component_id=missing_id,
                    evidence_assertion_ids=(
                        "assertion:demo:missing-required-bolt",
                    ),
                )
            ],
            [],
        )

        issues = graph.validate_release_bom(CAM_SKU_ID, "EU")

        self.assertEqual(
            [("UNREGISTERED_REQUIRED_TARGET", missing_id)],
            [(issue.code, issue.related_id) for issue in issues],
        )

    def test_missing_optional_target_is_non_blocking(self) -> None:
        graph = CompatibilityGraph(
            make_registry(),
            [
                make_bom_edge(
                    component_id="sku:demo:optional-trim:EU",
                    edge_type=EdgeType.OPTIONAL,
                    evidence_assertion_ids=(
                        "assertion:demo:optional-trim",
                    ),
                )
            ],
            [],
        )

        self.assertEqual(
            (),
            graph.validate_release_bom(CAM_SKU_ID, "EU"),
        )

    def test_every_required_operational_target_must_be_registered(
        self,
    ) -> None:
        cases = (
            (EdgeType.REQUIRES, "sku:demo:missing:EU"),
            (EdgeType.TOOLED_BY, "tool:demo:missing"),
            (EdgeType.MACHINED_BY, "machine:demo:missing"),
            (EdgeType.INSTALLED_WITH, "tool:demo:installer-missing"),
            (
                EdgeType.QUALIFIED_WITH,
                "qualification:demo:missing",
            ),
            (
                EdgeType.REQUIRES_MATERIAL_CONDITION,
                "material:demo:missing",
            ),
        )

        for edge_type, target_id in cases:
            with self.subTest(edge_type=edge_type):
                graph = CompatibilityGraph(
                    make_registry(),
                    [
                        make_bom_edge(
                            component_id=target_id,
                            edge_type=edge_type,
                            evidence_assertion_ids=(
                                f"assertion:demo:{edge_type.name.lower()}",
                            ),
                        )
                    ],
                    [],
                )

                issues = graph.validate_release_bom(CAM_SKU_ID, "EU")

                self.assertEqual(
                    [
                        (
                            "UNREGISTERED_REQUIRED_TARGET",
                            target_id,
                        )
                    ],
                    [
                        (issue.code, issue.related_id)
                        for issue in issues
                    ],
                )

    def test_registered_operational_targets_satisfy_required_edges(
        self,
    ) -> None:
        extras = (
            "tool:demo:boring-bit",
            "machine:demo:boring-centre",
            "tool:demo:installation-driver",
            "qualification:demo:fixture-q1",
            "material:demo:mdf-18",
        )
        edges = [
            make_bom_edge(),
            make_bom_edge(
                component_id=extras[0],
                edge_type=EdgeType.TOOLED_BY,
                evidence_assertion_ids=(
                    "assertion:demo:tool",
                ),
            ),
            make_bom_edge(
                component_id=extras[1],
                edge_type=EdgeType.MACHINED_BY,
                evidence_assertion_ids=(
                    "assertion:demo:machine",
                ),
            ),
            make_bom_edge(
                component_id=extras[2],
                edge_type=EdgeType.INSTALLED_WITH,
                evidence_assertion_ids=(
                    "assertion:demo:installation",
                ),
            ),
            make_bom_edge(
                component_id=extras[3],
                edge_type=EdgeType.QUALIFIED_WITH,
                evidence_assertion_ids=(
                    "assertion:demo:qualification",
                ),
            ),
            make_bom_edge(
                component_id=extras[4],
                edge_type=EdgeType.REQUIRES_MATERIAL_CONDITION,
                evidence_assertion_ids=(
                    "assertion:demo:material",
                ),
            ),
        ]
        graph = CompatibilityGraph(
            make_registry(),
            edges,
            [],
            extras,
        )

        self.assertEqual(
            (),
            graph.validate_release_bom(CAM_SKU_ID, "EU"),
        )

    def test_assembly_region_must_match_exactly(self) -> None:
        graph = CompatibilityGraph(
            make_registry(assembly_region="TH"),
            complete_fixture_edges(),
            [],
        )

        issues = graph.validate_release_bom(CAM_SKU_ID, "EU")

        self.assertIn(
            "ASSEMBLY_REGION_MISMATCH",
            {issue.code for issue in issues},
        )

    def test_edges_from_another_region_do_not_fill_release_bom(
        self,
    ) -> None:
        graph = CompatibilityGraph(
            make_registry(),
            [make_bom_edge(region="TH")],
            [],
        )

        issues = graph.validate_release_bom(CAM_SKU_ID, "EU")

        self.assertEqual(
            ["EMPTY_RELEASE_BOM"],
            [issue.code for issue in issues],
        )

    def test_referenced_sku_region_must_match_exactly(self) -> None:
        graph = CompatibilityGraph(
            make_registry(bolt_region="TH"),
            [make_bom_edge()],
            [],
        )

        issues = graph.validate_release_bom(CAM_SKU_ID, "EU")

        self.assertEqual(
            [("TARGET_REGION_MISMATCH", BOLT_SKU_ID)],
            [(issue.code, issue.related_id) for issue in issues],
        )

    def test_non_releasable_assembly_lifecycles_are_refused(self) -> None:
        invalid_states = (
            LifecycleState.PENDING,
            LifecycleState.SUPERSEDED,
            LifecycleState.DISCONTINUED,
            LifecycleState.SOURCE_BLOCKED,
        )

        for lifecycle in invalid_states:
            with self.subTest(lifecycle=lifecycle):
                graph = CompatibilityGraph(
                    make_registry(assembly_lifecycle=lifecycle),
                    complete_fixture_edges(),
                    [],
                )

                issues = graph.validate_release_bom(
                    CAM_SKU_ID,
                    "EU",
                )

                self.assertIn(
                    "ASSEMBLY_LIFECYCLE_INVALID",
                    {issue.code for issue in issues},
                )

    def test_non_releasable_component_lifecycles_are_refused(self) -> None:
        invalid_states = (
            LifecycleState.PENDING,
            LifecycleState.SUPERSEDED,
            LifecycleState.DISCONTINUED,
            LifecycleState.SOURCE_BLOCKED,
        )

        for lifecycle in invalid_states:
            with self.subTest(lifecycle=lifecycle):
                graph = CompatibilityGraph(
                    make_registry(bolt_lifecycle=lifecycle),
                    [make_bom_edge()],
                    [],
                )

                issues = graph.validate_release_bom(
                    CAM_SKU_ID,
                    "EU",
                )

                self.assertIn(
                    "TARGET_LIFECYCLE_INVALID",
                    {issue.code for issue in issues},
                )

    def test_region_only_models_are_releasable_only_in_sku_region(
        self,
    ) -> None:
        matching = CompatibilityGraph(
            make_registry(
                assembly_lifecycle=LifecycleState.REGION_ONLY,
                bolt_lifecycle=LifecycleState.REGION_ONLY,
            ),
            [make_bom_edge()],
            [],
        )
        mismatching = CompatibilityGraph(
            make_registry(
                assembly_lifecycle=LifecycleState.REGION_ONLY,
                assembly_region="TH",
                bolt_lifecycle=LifecycleState.REGION_ONLY,
                bolt_region="TH",
            ),
            [make_bom_edge()],
            [],
        )

        self.assertEqual(
            (),
            matching.validate_release_bom(CAM_SKU_ID, "EU"),
        )
        mismatch_codes = {
            issue.code
            for issue in mismatching.validate_release_bom(
                CAM_SKU_ID,
                "EU",
            )
        }
        self.assertIn("ASSEMBLY_REGION_MISMATCH", mismatch_codes)
        self.assertIn("ASSEMBLY_LIFECYCLE_INVALID", mismatch_codes)
        self.assertIn("TARGET_REGION_MISMATCH", mismatch_codes)
        self.assertIn("TARGET_LIFECYCLE_INVALID", mismatch_codes)

    def test_explicitly_incompatible_bom_target_is_refused(self) -> None:
        graph = CompatibilityGraph(
            make_registry(),
            [make_bom_edge()],
            [
                make_compatibility_edge(
                    edge_type=EdgeType.INCOMPATIBLE,
                    evidence_assertion_ids=(
                        "assertion:demo:incompatible",
                    ),
                )
            ],
        )

        issues = graph.validate_release_bom(CAM_SKU_ID, "EU")

        self.assertIn(
            ("INCOMPATIBLE_BOM_TARGET", BOLT_SKU_ID),
            [(issue.code, issue.related_id) for issue in issues],
        )

    def test_reverse_explicit_incompatibility_is_also_refused(self) -> None:
        graph = CompatibilityGraph(
            make_registry(),
            [make_bom_edge()],
            [
                make_compatibility_edge(
                    source_id=BOLT_SKU_ID,
                    target_id=CAM_SKU_ID,
                    edge_type=EdgeType.INCOMPATIBLE,
                    evidence_assertion_ids=(
                        "assertion:demo:reverse-incompatible",
                    ),
                )
            ],
        )

        issues = graph.validate_release_bom(CAM_SKU_ID, "EU")

        self.assertIn(
            ("INCOMPATIBLE_BOM_TARGET", BOLT_SKU_ID),
            [(issue.code, issue.related_id) for issue in issues],
        )

    def test_directed_compatible_and_incompatible_pair_is_a_contradiction(
        self,
    ) -> None:
        compatibility_edges = [
            make_compatibility_edge(
                source_id=BOLT_SKU_ID,
                target_id=CAP_SKU_ID,
                edge_type=EdgeType.COMPATIBLE,
                evidence_assertion_ids=(
                    "assertion:demo:bolt-cap-compatible",
                ),
            ),
            make_compatibility_edge(
                source_id=BOLT_SKU_ID,
                target_id=CAP_SKU_ID,
                edge_type=EdgeType.INCOMPATIBLE,
                evidence_assertion_ids=(
                    "assertion:demo:bolt-cap-incompatible",
                ),
            ),
        ]
        graph = CompatibilityGraph(
            make_registry(),
            complete_fixture_edges(),
            compatibility_edges,
        )

        issues = graph.validate_release_bom(CAM_SKU_ID, "EU")

        self.assertIn(
            ("COMPATIBILITY_CONTRADICTION", BOLT_SKU_ID, CAP_SKU_ID),
            [
                (issue.code, issue.entity_id, issue.related_id)
                for issue in issues
            ],
        )

    def test_other_region_does_not_create_a_directed_contradiction(
        self,
    ) -> None:
        graph = CompatibilityGraph(
            make_registry(),
            complete_fixture_edges(),
            [
                make_compatibility_edge(
                    source_id=BOLT_SKU_ID,
                    target_id=CAP_SKU_ID,
                    edge_type=EdgeType.COMPATIBLE,
                    evidence_assertion_ids=(
                        "assertion:demo:bolt-cap-compatible",
                    ),
                ),
                make_compatibility_edge(
                    source_id=BOLT_SKU_ID,
                    target_id=CAP_SKU_ID,
                    edge_type=EdgeType.INCOMPATIBLE,
                    region="TH",
                    evidence_assertion_ids=(
                        "assertion:demo:bolt-cap-incompatible-th",
                    ),
                ),
            ],
        )

        self.assertEqual(
            (),
            graph.validate_release_bom(CAM_SKU_ID, "EU"),
        )

    def test_validation_is_deterministic_and_read_only(self) -> None:
        bom_edges = [
            make_bom_edge(
                component_id="tool:demo:missing-z",
                edge_type=EdgeType.TOOLED_BY,
                evidence_assertion_ids=(
                    "assertion:demo:missing-z",
                ),
            ),
            make_bom_edge(
                component_id="machine:demo:missing-a",
                edge_type=EdgeType.MACHINED_BY,
                evidence_assertion_ids=(
                    "assertion:demo:missing-a",
                ),
            ),
        ]
        original = tuple(bom_edges)
        graph = CompatibilityGraph(
            make_registry(),
            bom_edges,
            [],
        )

        first = graph.validate_release_bom(CAM_SKU_ID, "EU")
        second = graph.validate_release_bom(CAM_SKU_ID, "EU")

        self.assertEqual(first, second)
        self.assertEqual(
            sorted(
                first,
                key=lambda issue: (
                    issue.code,
                    issue.entity_id,
                    issue.related_id,
                    issue.message,
                ),
            ),
            list(first),
        )
        self.assertEqual(original, tuple(bom_edges))
        self.assertEqual(original, graph.bom_edges)

    def test_missing_exact_target_is_not_auto_resolved_by_variant_edges(
        self,
    ) -> None:
        missing_id = "sku:demo:bolt-obsolete:EU"
        graph = CompatibilityGraph(
            make_registry(),
            [
                make_bom_edge(
                    component_id=missing_id,
                    evidence_assertion_ids=(
                        "assertion:demo:requires-obsolete-bolt",
                    ),
                )
            ],
            [
                make_compatibility_edge(
                    source_id=BOLT_SKU_ID,
                    target_id=missing_id,
                    edge_type=EdgeType.REPLACES,
                    evidence_assertion_ids=(
                        "assertion:demo:replacement",
                    ),
                ),
                make_compatibility_edge(
                    source_id=BOLT_SKU_ID,
                    target_id=missing_id,
                    edge_type=EdgeType.SUPERSEDES,
                    evidence_assertion_ids=(
                        "assertion:demo:supersession",
                    ),
                ),
                make_compatibility_edge(
                    source_id=BOLT_SKU_ID,
                    target_id=missing_id,
                    edge_type=EdgeType.REGION_VARIANT,
                    evidence_assertion_ids=(
                        "assertion:demo:region-variant",
                    ),
                ),
                make_compatibility_edge(
                    source_id=BOLT_SKU_ID,
                    target_id=missing_id,
                    edge_type=EdgeType.GEOMETRY_VARIANT,
                    evidence_assertion_ids=(
                        "assertion:demo:geometry-variant",
                    ),
                ),
            ],
        )

        issues = graph.validate_release_bom(CAM_SKU_ID, "EU")

        self.assertEqual(
            [("UNREGISTERED_REQUIRED_TARGET", missing_id)],
            [(issue.code, issue.related_id) for issue in issues],
        )
        for method_name in (
            "resolve",
            "substitute",
            "auto_select",
            "mutate",
            "add_edge",
            "remove_edge",
        ):
            with self.subTest(method=method_name):
                self.assertFalse(hasattr(graph, method_name))


class CompatibilityDataSeedTests(unittest.TestCase):
    def test_bom_and_compatibility_seeds_are_valid_empty_jsonl(
        self,
    ) -> None:
        registry_dir = (
            REPOSITORY_ROOT
            / "data"
            / "component-master"
            / "registry"
            / "v1"
        )

        for filename in (
            "bom-edges.jsonl",
            "compatibility-edges.jsonl",
        ):
            with self.subTest(filename=filename):
                records = [
                    json.loads(line)
                    for line in (registry_dir / filename).read_text(
                        encoding="utf-8"
                    ).splitlines()
                    if line.strip()
                ]
                self.assertEqual([], records)


if __name__ == "__main__":
    unittest.main()
