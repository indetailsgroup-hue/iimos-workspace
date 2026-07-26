"""Contracts for evidence-bound material and thickness joint qualification."""

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

from monolith_component_master.qualification import (  # noqa: E402
    JointConfiguration,
    MaterialConstraint,
    MaterialInstance,
    QualificationEnvelope,
    QualificationResult,
    ThicknessEvidenceKind,
    Verdict,
    qualify_joint,
)


CONNECTOR_SKU_ID = "sku:demo:connector-1:EU"
OTHER_CONNECTOR_SKU_ID = "sku:demo:connector-2:EU"
ENVELOPE_ID = "envelope:demo:connector-1:mdf-plywood"
EVIDENCE_ID = "assertion:demo:qualification:mdf-plywood"


def make_material(
    thickness_mm: float = 15.0,
    **overrides: object,
) -> MaterialInstance:
    arguments: dict[str, object] = {
        "substrate": "MDF",
        "core": "homogeneous-fibre",
        "density_kg_m3": 720.0,
        "moisture_pct": 8.0,
        "orientation": "grain-longitudinal",
        "nominal_thickness_mm": thickness_mm,
        "measured_thickness_mm": thickness_mm,
        "facing_thickness_mm": 0.5,
    }
    arguments.update(overrides)
    return MaterialInstance(**arguments)


def make_constraint(
    thickness_mm: float = 15.0,
    **overrides: object,
) -> MaterialConstraint:
    arguments: dict[str, object] = {
        "substrate": "MDF",
        "core": "homogeneous-fibre",
        "density_min_kg_m3": 680.0,
        "density_max_kg_m3": 760.0,
        "moisture_min_pct": 6.0,
        "moisture_max_pct": 10.0,
        "orientation": "grain-longitudinal",
        "nominal_thickness_min_mm": thickness_mm,
        "nominal_thickness_max_mm": thickness_mm,
        "measured_thickness_min_mm": thickness_mm,
        "measured_thickness_max_mm": thickness_mm,
        "facing_thickness_min_mm": 0.0,
        "facing_thickness_max_mm": 1.0,
        "thickness_evidence_kind": ThicknessEvidenceKind.EXACT_POINT,
    }
    arguments.update(overrides)
    return MaterialConstraint(**arguments)


def make_joint(
    *,
    connector_sku_id: str = CONNECTOR_SKU_ID,
    panel_a: MaterialInstance | None = None,
    panel_b: MaterialInstance | None = None,
) -> JointConfiguration:
    return JointConfiguration(
        connector_sku_id=connector_sku_id,
        panel_a=panel_a or make_material(),
        panel_b=panel_b
        or make_material(
            18.0,
            substrate="plywood",
            core="birch-plies",
            density_kg_m3=650.0,
            moisture_pct=9.0,
            orientation="cross-laminated",
            facing_thickness_mm=0.8,
        ),
    )


def make_envelope(
    **overrides: object,
) -> QualificationEnvelope:
    arguments: dict[str, object] = {
        "envelope_id": ENVELOPE_ID,
        "connector_sku_id": CONNECTOR_SKU_ID,
        "panel_a": make_constraint(),
        "panel_b": make_constraint(
            18.0,
            substrate="plywood",
            core="birch-plies",
            density_min_kg_m3=620.0,
            density_max_kg_m3=680.0,
            moisture_min_pct=7.0,
            moisture_max_pct=11.0,
            orientation="cross-laminated",
            facing_thickness_min_mm=0.4,
            facing_thickness_max_mm=1.2,
        ),
        "verdict": Verdict.QUALIFIED,
        "evidence_assertion_ids": (EVIDENCE_ID,),
    }
    arguments.update(overrides)
    return QualificationEnvelope(**arguments)


class EnumContractTests(unittest.TestCase):
    def test_verdict_has_exact_planned_members_and_values(self) -> None:
        self.assertEqual(
            {
                "QUALIFIED": "QUALIFIED",
                "CONDITIONALLY_QUALIFIED": "CONDITIONALLY_QUALIFIED",
                "UNQUALIFIED": "UNQUALIFIED",
                "INSUFFICIENT_EVIDENCE": "INSUFFICIENT_EVIDENCE",
                "DISCONTINUED_OR_UNORDERABLE":
                    "DISCONTINUED_OR_UNORDERABLE",
            },
            {member.name: member.value for member in Verdict},
        )

    def test_thickness_evidence_kind_is_explicit_and_has_no_inferred_kind(
        self,
    ) -> None:
        self.assertEqual(
            {
                "EXACT_POINT": "EXACT_POINT",
                "DECLARED_RANGE": "DECLARED_RANGE",
                "APPROVED_INTERPOLATION": "APPROVED_INTERPOLATION",
            },
            {
                member.name: member.value
                for member in ThicknessEvidenceKind
            },
        )


class FrozenRecordContractTests(unittest.TestCase):
    def test_material_instance_has_exact_frozen_field_shape(self) -> None:
        material = make_material()

        self.assertEqual(
            [
                "substrate",
                "core",
                "density_kg_m3",
                "moisture_pct",
                "orientation",
                "nominal_thickness_mm",
                "measured_thickness_mm",
                "facing_thickness_mm",
            ],
            [field.name for field in fields(MaterialInstance)],
        )
        with self.assertRaises(FrozenInstanceError):
            material.core = "changed"

    def test_material_constraint_has_exact_frozen_field_shape(self) -> None:
        constraint = make_constraint()

        self.assertEqual(
            [
                "substrate",
                "core",
                "density_min_kg_m3",
                "density_max_kg_m3",
                "moisture_min_pct",
                "moisture_max_pct",
                "orientation",
                "nominal_thickness_min_mm",
                "nominal_thickness_max_mm",
                "measured_thickness_min_mm",
                "measured_thickness_max_mm",
                "facing_thickness_min_mm",
                "facing_thickness_max_mm",
                "thickness_evidence_kind",
            ],
            [field.name for field in fields(MaterialConstraint)],
        )
        with self.assertRaises(FrozenInstanceError):
            constraint.core = "changed"

    def test_joint_configuration_has_exact_frozen_field_shape(self) -> None:
        joint = make_joint()

        self.assertEqual(
            ["connector_sku_id", "panel_a", "panel_b"],
            [field.name for field in fields(JointConfiguration)],
        )
        with self.assertRaises(FrozenInstanceError):
            joint.connector_sku_id = OTHER_CONNECTOR_SKU_ID

    def test_qualification_envelope_has_exact_frozen_field_shape(
        self,
    ) -> None:
        envelope = make_envelope()

        self.assertEqual(
            [
                "envelope_id",
                "connector_sku_id",
                "panel_a",
                "panel_b",
                "verdict",
                "evidence_assertion_ids",
            ],
            [field.name for field in fields(QualificationEnvelope)],
        )
        with self.assertRaises(FrozenInstanceError):
            envelope.verdict = Verdict.UNQUALIFIED

    def test_qualification_result_has_exact_frozen_field_shape(self) -> None:
        result = QualificationResult(
            verdict=Verdict.QUALIFIED,
            envelope_id=ENVELOPE_ID,
            reason_codes=(),
        )

        self.assertEqual(
            ["verdict", "envelope_id", "reason_codes"],
            [field.name for field in fields(QualificationResult)],
        )
        with self.assertRaises(FrozenInstanceError):
            result.verdict = Verdict.UNQUALIFIED


class MaterialInstanceValidationTests(unittest.TestCase):
    def test_material_text_fields_are_typed_and_nonblank(self) -> None:
        for field_name in ("substrate", "core", "orientation"):
            for value, error_type in (
                ("", ValueError),
                ("   ", ValueError),
                (None, TypeError),
                (7, TypeError),
            ):
                with self.subTest(field=field_name, value=value):
                    with self.assertRaises(error_type):
                        make_material(**{field_name: value})

    def test_density_nominal_and_measured_are_positive_finite_reals(
        self,
    ) -> None:
        for field_name in (
            "density_kg_m3",
            "nominal_thickness_mm",
            "measured_thickness_mm",
        ):
            for value in (
                0,
                -1,
                True,
                False,
                math.inf,
                -math.inf,
                math.nan,
                "1",
                None,
            ):
                with self.subTest(field=field_name, value=value):
                    with self.assertRaises((TypeError, ValueError)):
                        make_material(**{field_name: value})

        self.assertEqual(700, make_material(density_kg_m3=700).density_kg_m3)
        self.assertEqual(
            15.25,
            make_material(
                nominal_thickness_mm=15.25,
                measured_thickness_mm=15.25,
            ).measured_thickness_mm,
        )

    def test_moisture_is_a_finite_real_from_zero_through_one_hundred(
        self,
    ) -> None:
        for value in (
            -0.01,
            100.01,
            True,
            False,
            math.inf,
            -math.inf,
            math.nan,
            "8",
            None,
        ):
            with self.subTest(value=value):
                with self.assertRaises((TypeError, ValueError)):
                    make_material(moisture_pct=value)

        self.assertEqual(0, make_material(moisture_pct=0).moisture_pct)
        self.assertEqual(
            100,
            make_material(moisture_pct=100).moisture_pct,
        )

    def test_facing_is_finite_nonnegative_and_below_measured_thickness(
        self,
    ) -> None:
        for value in (
            -0.01,
            15.0,
            16.0,
            True,
            False,
            math.inf,
            -math.inf,
            math.nan,
            "0.5",
            None,
        ):
            with self.subTest(value=value):
                with self.assertRaises((TypeError, ValueError)):
                    make_material(facing_thickness_mm=value)

        self.assertEqual(
            0,
            make_material(facing_thickness_mm=0).facing_thickness_mm,
        )


class MaterialConstraintValidationTests(unittest.TestCase):
    def test_constraint_text_fields_are_typed_and_nonblank(self) -> None:
        for field_name in ("substrate", "core", "orientation"):
            for value, error_type in (
                ("", ValueError),
                ("   ", ValueError),
                (None, TypeError),
                (7, TypeError),
            ):
                with self.subTest(field=field_name, value=value):
                    with self.assertRaises(error_type):
                        make_constraint(**{field_name: value})

    def test_every_constraint_bound_is_a_finite_non_boolean_real(
        self,
    ) -> None:
        bound_fields = (
            "density_min_kg_m3",
            "density_max_kg_m3",
            "moisture_min_pct",
            "moisture_max_pct",
            "nominal_thickness_min_mm",
            "nominal_thickness_max_mm",
            "measured_thickness_min_mm",
            "measured_thickness_max_mm",
            "facing_thickness_min_mm",
            "facing_thickness_max_mm",
        )
        for field_name in bound_fields:
            for value in (
                True,
                False,
                math.inf,
                -math.inf,
                math.nan,
                "1",
                None,
            ):
                with self.subTest(field=field_name, value=value):
                    with self.assertRaises((TypeError, ValueError)):
                        make_constraint(**{field_name: value})

    def test_positive_and_nonnegative_lower_bounds_are_enforced(
        self,
    ) -> None:
        for field_name in (
            "density_min_kg_m3",
            "nominal_thickness_min_mm",
            "measured_thickness_min_mm",
        ):
            for value in (0, -1):
                with self.subTest(field=field_name, value=value):
                    with self.assertRaises(ValueError):
                        make_constraint(**{field_name: value})

        for field_name in (
            "moisture_min_pct",
            "facing_thickness_min_mm",
        ):
            with self.subTest(field=field_name):
                with self.assertRaises(ValueError):
                    make_constraint(**{field_name: -0.01})

    def test_moisture_bounds_cannot_exceed_one_hundred_percent(
        self,
    ) -> None:
        boundary = make_constraint(
            moisture_min_pct=0,
            moisture_max_pct=100,
        )
        self.assertEqual(
            (0, 100),
            (
                boundary.moisture_min_pct,
                boundary.moisture_max_pct,
            ),
        )

        for moisture_max_pct in (100.01, 101):
            with self.subTest(
                moisture_max_pct=moisture_max_pct,
            ):
                with self.assertRaises(ValueError):
                    make_constraint(
                        moisture_min_pct=0,
                        moisture_max_pct=moisture_max_pct,
                    )

    def test_every_bound_pair_is_ordered_and_inclusive(self) -> None:
        reversed_pairs = (
            ("density_min_kg_m3", 761.0, "density_max_kg_m3", 760.0),
            ("moisture_min_pct", 10.1, "moisture_max_pct", 10.0),
            (
                "nominal_thickness_min_mm",
                15.1,
                "nominal_thickness_max_mm",
                15.0,
            ),
            (
                "measured_thickness_min_mm",
                15.1,
                "measured_thickness_max_mm",
                15.0,
            ),
            (
                "facing_thickness_min_mm",
                1.1,
                "facing_thickness_max_mm",
                1.0,
            ),
        )
        for min_name, min_value, max_name, max_value in reversed_pairs:
            with self.subTest(min_name=min_name, max_name=max_name):
                with self.assertRaises(ValueError):
                    make_constraint(
                        **{
                            min_name: min_value,
                            max_name: max_value,
                        }
                    )

        collapsed = make_constraint(
            density_min_kg_m3=720.0,
            density_max_kg_m3=720.0,
            moisture_min_pct=8.0,
            moisture_max_pct=8.0,
            facing_thickness_min_mm=0.5,
            facing_thickness_max_mm=0.5,
        )
        self.assertEqual(
            (720.0, 8.0, 0.5),
            (
                collapsed.density_max_kg_m3,
                collapsed.moisture_max_pct,
                collapsed.facing_thickness_max_mm,
            ),
        )

    def test_facing_maximum_must_remain_below_measured_minimum(
        self,
    ) -> None:
        for facing_max in (15.0, 15.1):
            with self.subTest(facing_max=facing_max):
                with self.assertRaises(ValueError):
                    make_constraint(
                        facing_thickness_max_mm=facing_max,
                    )

    def test_exact_point_requires_collapsed_nominal_and_measured_bounds(
        self,
    ) -> None:
        with self.assertRaises(ValueError):
            make_constraint(nominal_thickness_max_mm=16.0)
        with self.assertRaises(ValueError):
            make_constraint(measured_thickness_max_mm=16.0)

    def test_declared_and_approved_ranges_may_span_only_explicit_bounds(
        self,
    ) -> None:
        for kind in (
            ThicknessEvidenceKind.DECLARED_RANGE,
            ThicknessEvidenceKind.APPROVED_INTERPOLATION,
        ):
            with self.subTest(kind=kind):
                constraint = make_constraint(
                    nominal_thickness_max_mm=18.0,
                    measured_thickness_max_mm=18.0,
                    thickness_evidence_kind=kind,
                )
                self.assertEqual(kind, constraint.thickness_evidence_kind)

    def test_thickness_evidence_kind_must_be_typed(self) -> None:
        for value in (
            "EXACT_POINT",
            "DECLARED_RANGE",
            "APPROVED_INTERPOLATION",
            None,
        ):
            with self.subTest(value=value):
                with self.assertRaises(TypeError):
                    make_constraint(thickness_evidence_kind=value)


class IdentifierAndEvidenceContractTests(unittest.TestCase):
    def test_connector_and_envelope_ids_require_exact_namespaces(
        self,
    ) -> None:
        cases = (
            ("joint", {"connector_sku_id": "model:demo:item"}, ValueError),
            ("joint", {"connector_sku_id": None}, TypeError),
            (
                "envelope",
                {"connector_sku_id": "model:demo:item"},
                ValueError,
            ),
            ("envelope", {"connector_sku_id": None}, TypeError),
            ("envelope", {"envelope_id": "qualification:demo:item"}, ValueError),
            ("envelope", {"envelope_id": None}, TypeError),
        )
        for record, overrides, error_type in cases:
            with self.subTest(record=record, overrides=overrides):
                with self.assertRaises(error_type):
                    if record == "joint":
                        make_joint(**overrides)
                    else:
                        make_envelope(**overrides)

    def test_ids_reject_malformed_ascii_namespaced_segments(self) -> None:
        malformed_ids = (
            "{prefix}::",
            "{prefix}:!",
            "{prefix}:demo::EU",
            "{prefix}:demo:_part:EU",
            "{prefix}:demo:.part:EU",
            "{prefix}:demo:-part:EU",
            "{prefix}:demo/part:EU",
            "{prefix}:demo:part?:EU",
            "{prefix}:demo:part:ÉU",
        )
        accepted: list[tuple[str, str]] = []
        record_cases = (
            (
                "joint_connector",
                "sku",
                lambda value: make_joint(connector_sku_id=value),
            ),
            (
                "envelope_connector",
                "sku",
                lambda value: make_envelope(connector_sku_id=value),
            ),
            (
                "envelope_id",
                "envelope",
                lambda value: make_envelope(envelope_id=value),
            ),
        )
        for label, prefix, constructor in record_cases:
            for template in malformed_ids:
                value = template.format(prefix=prefix)
                try:
                    constructor(value)
                except ValueError:
                    continue
                accepted.append((label, value))

        self.assertEqual([], accepted)

    def test_ids_preserve_approved_ascii_characters(self) -> None:
        joint = make_joint(
            connector_sku_id="sku:Demo_1:part-2.5:EU",
        )
        envelope = make_envelope(
            envelope_id="envelope:Demo_1:part-2.5:EU",
            connector_sku_id="sku:Demo_1:part-2.5:EU",
            evidence_assertion_ids=(
                "assertion:SKU_1:qualification.field",
            ),
        )

        self.assertEqual(
            "sku:Demo_1:part-2.5:EU",
            joint.connector_sku_id,
        )
        self.assertEqual(
            "envelope:Demo_1:part-2.5:EU",
            envelope.envelope_id,
        )

    def test_joint_and_envelope_panels_require_exact_record_types(
        self,
    ) -> None:
        for field_name in ("panel_a", "panel_b"):
            with self.subTest(record="joint", field=field_name):
                with self.assertRaises(TypeError):
                    make_joint(**{field_name: make_constraint()})
            with self.subTest(record="envelope", field=field_name):
                with self.assertRaises(TypeError):
                    make_envelope(**{field_name: make_material()})

    def test_envelope_verdict_must_be_typed(self) -> None:
        for value in ("QUALIFIED", None):
            with self.subTest(value=value):
                with self.assertRaises(TypeError):
                    make_envelope(verdict=value)

    def test_evidence_ids_are_nonempty_typed_unique_assertion_tuples(
        self,
    ) -> None:
        invalid_values = (
            (),
            [],
            "assertion:demo:not-an-iterable-record",
            b"assertion:demo:not-an-iterable-record",
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
                    make_envelope(evidence_assertion_ids=value)

    def test_evidence_ids_reject_malformed_namespaced_segments(
        self,
    ) -> None:
        malformed_ids = (
            "assertion::",
            "assertion:!",
            "assertion:demo::field",
            "assertion:demo:_field",
            "assertion:demo/field",
            "assertion:demo:field?",
            "assertion:demo:ฟิลด์",
        )
        for value in malformed_ids:
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    make_envelope(evidence_assertion_ids=(value,))

    def test_evidence_iterables_are_defensively_tuple_copied(self) -> None:
        evidence_ids = [EVIDENCE_ID]
        envelope = make_envelope(evidence_assertion_ids=evidence_ids)
        evidence_ids.append("assertion:demo:mutated")

        self.assertEqual((EVIDENCE_ID,), envelope.evidence_assertion_ids)


class MaterialConstraintMatchingTests(unittest.TestCase):
    def test_all_material_dimensions_must_match_the_same_envelope(
        self,
    ) -> None:
        constraint = make_constraint()
        self.assertTrue(constraint.matches(make_material()))

        mismatches = (
            {"substrate": "particleboard"},
            {"core": "three-layer"},
            {"density_kg_m3": 679.99},
            {"density_kg_m3": 760.01},
            {"moisture_pct": 5.99},
            {"moisture_pct": 10.01},
            {"orientation": "grain-transverse"},
            {"nominal_thickness_mm": 14.99},
            {"nominal_thickness_mm": 15.01},
            {"measured_thickness_mm": 14.99},
            {"measured_thickness_mm": 15.01},
            {"facing_thickness_mm": 1.01},
        )
        for overrides in mismatches:
            with self.subTest(overrides=overrides):
                self.assertFalse(
                    constraint.matches(make_material(**overrides))
                )

    def test_every_declared_bound_is_inclusive(self) -> None:
        constraint = make_constraint(
            density_min_kg_m3=680.0,
            density_max_kg_m3=760.0,
            moisture_min_pct=6.0,
            moisture_max_pct=10.0,
            nominal_thickness_min_mm=15.0,
            nominal_thickness_max_mm=18.0,
            measured_thickness_min_mm=14.5,
            measured_thickness_max_mm=18.5,
            facing_thickness_min_mm=0.0,
            facing_thickness_max_mm=1.0,
            thickness_evidence_kind=ThicknessEvidenceKind.DECLARED_RANGE,
        )
        lower = make_material(
            density_kg_m3=680.0,
            moisture_pct=6.0,
            nominal_thickness_mm=15.0,
            measured_thickness_mm=14.5,
            facing_thickness_mm=0.0,
        )
        upper = make_material(
            18.0,
            density_kg_m3=760.0,
            moisture_pct=10.0,
            measured_thickness_mm=18.5,
            facing_thickness_mm=1.0,
        )

        self.assertTrue(constraint.matches(lower))
        self.assertTrue(constraint.matches(upper))

    def test_nominal_thickness_never_substitutes_for_measured_thickness(
        self,
    ) -> None:
        constraint = make_constraint(
            16.0,
            measured_thickness_min_mm=15.8,
            measured_thickness_max_mm=15.8,
        )
        material = make_material(
            16.0,
            measured_thickness_mm=16.0,
        )

        self.assertFalse(constraint.matches(material))

    def test_match_input_must_be_a_material_instance(self) -> None:
        with self.assertRaises(TypeError):
            make_constraint().matches(None)
        with self.assertRaises(TypeError):
            make_constraint().matches({"substrate": "MDF"})


class QualificationBehaviorTests(unittest.TestCase):
    def test_exact_panel_a_and_panel_b_configuration_qualifies(self) -> None:
        result = qualify_joint(make_joint(), [make_envelope()])

        self.assertEqual(
            QualificationResult(
                verdict=Verdict.QUALIFIED,
                envelope_id=ENVELOPE_ID,
                reason_codes=(),
            ),
            result,
        )

    def test_panel_a_and_panel_b_are_independent_and_never_swapped(
        self,
    ) -> None:
        joint = make_joint()
        swapped = make_joint(
            panel_a=joint.panel_b,
            panel_b=joint.panel_a,
        )

        self.assertEqual(
            Verdict.QUALIFIED,
            qualify_joint(joint, [make_envelope()]).verdict,
        )
        self.assertEqual(
            QualificationResult(
                verdict=Verdict.INSUFFICIENT_EVIDENCE,
                envelope_id=None,
                reason_codes=(
                    "NO_EXACT_CONFIGURATION_EVIDENCE",
                ),
            ),
            qualify_joint(swapped, [make_envelope()]),
        )

    def test_two_exact_points_at_fifteen_and_eighteen_refuse_sixteen(
        self,
    ) -> None:
        joint = make_joint(
            panel_a=make_material(16.0),
        )
        envelopes = (
            make_envelope(),
            make_envelope(
                envelope_id="envelope:demo:connector-1:point-18",
                panel_a=make_constraint(18.0),
                evidence_assertion_ids=(
                    "assertion:demo:qualification:point-18",
                ),
            ),
        )

        self.assertEqual(
            QualificationResult(
                verdict=Verdict.INSUFFICIENT_EVIDENCE,
                envelope_id=None,
                reason_codes=(
                    "NO_EXACT_CONFIGURATION_EVIDENCE",
                ),
            ),
            qualify_joint(joint, envelopes),
        )

    def test_declared_range_qualifies_only_inside_its_inclusive_bounds(
        self,
    ) -> None:
        envelope = make_envelope(
            panel_a=make_constraint(
                nominal_thickness_min_mm=15.0,
                nominal_thickness_max_mm=18.0,
                measured_thickness_min_mm=15.0,
                measured_thickness_max_mm=18.0,
                thickness_evidence_kind=(
                    ThicknessEvidenceKind.DECLARED_RANGE
                ),
            ),
        )

        for thickness in (15.0, 16.0, 18.0):
            with self.subTest(thickness=thickness):
                result = qualify_joint(
                    make_joint(panel_a=make_material(thickness)),
                    [envelope],
                )
                self.assertEqual(Verdict.QUALIFIED, result.verdict)
        for thickness in (14.99, 18.01):
            with self.subTest(thickness=thickness):
                result = qualify_joint(
                    make_joint(panel_a=make_material(thickness)),
                    [envelope],
                )
                self.assertEqual(
                    Verdict.INSUFFICIENT_EVIDENCE,
                    result.verdict,
                )

    def test_approved_interpolation_requires_its_explicit_evidenced_range(
        self,
    ) -> None:
        envelope = make_envelope(
            panel_a=make_constraint(
                nominal_thickness_min_mm=15.0,
                nominal_thickness_max_mm=18.0,
                measured_thickness_min_mm=15.0,
                measured_thickness_max_mm=18.0,
                thickness_evidence_kind=(
                    ThicknessEvidenceKind.APPROVED_INTERPOLATION
                ),
            ),
            evidence_assertion_ids=(
                "assertion:demo:qualification:approved-interpolation",
            ),
        )

        self.assertEqual(
            Verdict.QUALIFIED,
            qualify_joint(
                make_joint(panel_a=make_material(16.0)),
                [envelope],
            ).verdict,
        )
        for thickness in (14.99, 18.01):
            with self.subTest(thickness=thickness):
                self.assertEqual(
                    Verdict.INSUFFICIENT_EVIDENCE,
                    qualify_joint(
                        make_joint(panel_a=make_material(thickness)),
                        [envelope],
                    ).verdict,
                )

    def test_core_and_facing_are_separate_refusal_dimensions(self) -> None:
        envelope = make_envelope()
        for overrides in (
            {"core": "three-layer"},
            {"facing_thickness_mm": 1.01},
        ):
            with self.subTest(overrides=overrides):
                result = qualify_joint(
                    make_joint(panel_a=make_material(**overrides)),
                    [envelope],
                )
                self.assertEqual(
                    Verdict.INSUFFICIENT_EVIDENCE,
                    result.verdict,
                )

    def test_density_moisture_and_orientation_travel_with_each_panel(
        self,
    ) -> None:
        envelope = make_envelope()
        cases = (
            (
                "panel_a",
                make_material(density_kg_m3=600.0),
            ),
            (
                "panel_a",
                make_material(moisture_pct=11.0),
            ),
            (
                "panel_a",
                make_material(orientation="grain-transverse"),
            ),
            (
                "panel_b",
                make_material(
                    18.0,
                    substrate="plywood",
                    core="birch-plies",
                    density_kg_m3=700.0,
                    moisture_pct=9.0,
                    orientation="cross-laminated",
                    facing_thickness_mm=0.8,
                ),
            ),
            (
                "panel_b",
                make_material(
                    18.0,
                    substrate="plywood",
                    core="birch-plies",
                    density_kg_m3=650.0,
                    moisture_pct=12.0,
                    orientation="cross-laminated",
                    facing_thickness_mm=0.8,
                ),
            ),
            (
                "panel_b",
                make_material(
                    18.0,
                    substrate="plywood",
                    core="birch-plies",
                    density_kg_m3=650.0,
                    moisture_pct=9.0,
                    orientation="grain-longitudinal",
                    facing_thickness_mm=0.8,
                ),
            ),
        )
        for panel_name, material in cases:
            with self.subTest(panel=panel_name, material=material):
                result = qualify_joint(
                    make_joint(**{panel_name: material}),
                    [envelope],
                )
                self.assertEqual(
                    Verdict.INSUFFICIENT_EVIDENCE,
                    result.verdict,
                )

    def test_no_matching_configuration_returns_insufficient_evidence(
        self,
    ) -> None:
        result = qualify_joint(
            make_joint(connector_sku_id=OTHER_CONNECTOR_SKU_ID),
            [make_envelope()],
        )

        self.assertEqual(
            QualificationResult(
                verdict=Verdict.INSUFFICIENT_EVIDENCE,
                envelope_id=None,
                reason_codes=(
                    "NO_EXACT_CONFIGURATION_EVIDENCE",
                ),
            ),
            result,
        )

    def test_near_connector_id_is_not_auto_substituted(self) -> None:
        result = qualify_joint(
            make_joint(
                connector_sku_id="sku:demo:connector-1.1:EU",
            ),
            [make_envelope()],
        )

        self.assertEqual(
            Verdict.INSUFFICIENT_EVIDENCE,
            result.verdict,
        )

    def test_multiple_matching_qualified_records_are_ambiguous(self) -> None:
        second = make_envelope(
            envelope_id="envelope:demo:connector-1:duplicate-evidence",
            evidence_assertion_ids=(
                "assertion:demo:qualification:duplicate-evidence",
            ),
        )

        self.assertEqual(
            QualificationResult(
                verdict=Verdict.UNQUALIFIED,
                envelope_id=None,
                reason_codes=(
                    "AMBIGUOUS_OR_NONQUALIFIED_ENVELOPE",
                ),
            ),
            qualify_joint(
                make_joint(),
                [make_envelope(), second],
            ),
        )

    def test_qualified_match_never_overrides_a_conflicting_match(
        self,
    ) -> None:
        conflicting = make_envelope(
            envelope_id="envelope:demo:connector-1:conflict",
            verdict=Verdict.UNQUALIFIED,
            evidence_assertion_ids=(
                "assertion:demo:qualification:conflict",
            ),
        )

        self.assertEqual(
            QualificationResult(
                verdict=Verdict.UNQUALIFIED,
                envelope_id=None,
                reason_codes=(
                    "AMBIGUOUS_OR_NONQUALIFIED_ENVELOPE",
                ),
            ),
            qualify_joint(
                make_joint(),
                [make_envelope(), conflicting],
            ),
        )

    def test_sole_nonqualified_match_uses_approved_fail_closed_result(
        self,
    ) -> None:
        nonqualified_verdicts = (
            Verdict.CONDITIONALLY_QUALIFIED,
            Verdict.UNQUALIFIED,
            Verdict.INSUFFICIENT_EVIDENCE,
            Verdict.DISCONTINUED_OR_UNORDERABLE,
        )
        expected = QualificationResult(
            verdict=Verdict.UNQUALIFIED,
            envelope_id=None,
            reason_codes=(
                "AMBIGUOUS_OR_NONQUALIFIED_ENVELOPE",
            ),
        )

        for verdict in nonqualified_verdicts:
            with self.subTest(verdict=verdict):
                self.assertEqual(
                    expected,
                    qualify_joint(
                        make_joint(),
                        [make_envelope(verdict=verdict)],
                    ),
                )

    def test_qualification_inputs_are_typed_and_iterables_snapshotted(
        self,
    ) -> None:
        with self.assertRaises(TypeError):
            qualify_joint(None, [make_envelope()])
        for envelopes in (
            None,
            make_envelope(),
            "not-an-envelope-iterable",
            [None],
        ):
            with self.subTest(envelopes=envelopes):
                with self.assertRaises(TypeError):
                    qualify_joint(make_joint(), envelopes)

        envelope_source = [make_envelope()]
        result = qualify_joint(
            make_joint(),
            (envelope for envelope in envelope_source),
        )
        envelope_source.clear()
        self.assertEqual(Verdict.QUALIFIED, result.verdict)

    def test_qualification_is_deterministic_and_does_not_mutate_inputs(
        self,
    ) -> None:
        joint = make_joint()
        envelopes = [make_envelope()]
        original = list(envelopes)

        first = qualify_joint(joint, envelopes)
        second = qualify_joint(joint, envelopes)

        self.assertEqual(first, second)
        self.assertEqual(original, envelopes)
        self.assertIs(original[0], envelopes[0])


class QualificationResultValidationTests(unittest.TestCase):
    def test_result_verdict_and_optional_envelope_id_are_validated(
        self,
    ) -> None:
        with self.assertRaises(TypeError):
            QualificationResult(
                verdict="QUALIFIED",
                envelope_id=ENVELOPE_ID,
                reason_codes=(),
            )
        for value, error_type in (
            ("qualification:demo:item", ValueError),
            ("envelope:!", ValueError),
            (7, TypeError),
        ):
            with self.subTest(value=value):
                with self.assertRaises(error_type):
                    QualificationResult(
                        verdict=Verdict.QUALIFIED,
                        envelope_id=value,
                        reason_codes=(),
                    )

        result = QualificationResult(
            verdict=Verdict.INSUFFICIENT_EVIDENCE,
            envelope_id=None,
            reason_codes=("NO_EXACT_CONFIGURATION_EVIDENCE",),
        )
        self.assertIsNone(result.envelope_id)

    def test_qualified_and_conditional_results_authorize_exact_shapes(
        self,
    ) -> None:
        qualified = QualificationResult(
            verdict=Verdict.QUALIFIED,
            envelope_id=ENVELOPE_ID,
            reason_codes=(),
        )
        conditional = QualificationResult(
            verdict=Verdict.CONDITIONALLY_QUALIFIED,
            envelope_id=ENVELOPE_ID,
            reason_codes=("INSTALLATION_CONDITION_REQUIRED",),
        )
        self.assertEqual((), qualified.reason_codes)
        self.assertEqual(
            ("INSTALLATION_CONDITION_REQUIRED",),
            conditional.reason_codes,
        )

        invalid_cases = (
            (Verdict.QUALIFIED, None, ()),
            (
                Verdict.QUALIFIED,
                ENVELOPE_ID,
                ("UNEXPECTED_QUALIFICATION_REASON",),
            ),
            (
                Verdict.CONDITIONALLY_QUALIFIED,
                None,
                ("INSTALLATION_CONDITION_REQUIRED",),
            ),
            (
                Verdict.CONDITIONALLY_QUALIFIED,
                ENVELOPE_ID,
                (),
            ),
        )
        for verdict, envelope_id, reason_codes in invalid_cases:
            with self.subTest(
                verdict=verdict,
                envelope_id=envelope_id,
                reason_codes=reason_codes,
            ):
                with self.assertRaises(ValueError):
                    QualificationResult(
                        verdict=verdict,
                        envelope_id=envelope_id,
                        reason_codes=reason_codes,
                    )

    def test_refusal_results_forbid_envelopes_and_require_reasons(
        self,
    ) -> None:
        refusal_verdicts = (
            Verdict.UNQUALIFIED,
            Verdict.INSUFFICIENT_EVIDENCE,
            Verdict.DISCONTINUED_OR_UNORDERABLE,
        )
        for verdict in refusal_verdicts:
            with self.subTest(verdict=verdict, valid=True):
                result = QualificationResult(
                    verdict=verdict,
                    envelope_id=None,
                    reason_codes=("FAIL_CLOSED_REASON",),
                )
                self.assertEqual(
                    ("FAIL_CLOSED_REASON",),
                    result.reason_codes,
                )
            with self.subTest(verdict=verdict, envelope=True):
                with self.assertRaises(ValueError):
                    QualificationResult(
                        verdict=verdict,
                        envelope_id=ENVELOPE_ID,
                        reason_codes=("FAIL_CLOSED_REASON",),
                    )
            with self.subTest(verdict=verdict, empty_reasons=True):
                with self.assertRaises(ValueError):
                    QualificationResult(
                        verdict=verdict,
                        envelope_id=None,
                        reason_codes=(),
                    )

    def test_reason_codes_are_typed_nonblank_immutable_tuples(self) -> None:
        reason_codes = ["NO_EXACT_CONFIGURATION_EVIDENCE"]
        result = QualificationResult(
            verdict=Verdict.INSUFFICIENT_EVIDENCE,
            envelope_id=None,
            reason_codes=reason_codes,
        )
        reason_codes.append("MUTATED")
        self.assertEqual(
            ("NO_EXACT_CONFIGURATION_EVIDENCE",),
            result.reason_codes,
        )

        for value in (
            "ONE_STRING_IS_NOT_AN_ITERABLE_OF_CODES",
            b"BYTES_ARE_NOT_CODES",
            ("",),
            ("   ",),
            (None,),
        ):
            with self.subTest(value=value):
                with self.assertRaises((TypeError, ValueError)):
                    QualificationResult(
                        verdict=Verdict.UNQUALIFIED,
                        envelope_id=None,
                        reason_codes=value,
                    )


class QualificationDataSeedTests(unittest.TestCase):
    def test_material_and_envelope_seeds_are_valid_empty_jsonl(
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
            "materials.jsonl",
            "qualification-envelopes.jsonl",
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
