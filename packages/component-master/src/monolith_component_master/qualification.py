"""Immutable evidence-bound material and thickness qualification contracts."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from enum import Enum
from fractions import Fraction
import math
from numbers import Real
import re

from .registry_models import (
    LifecycleState,
    Registry,
    VerificationDimension,
    VerificationState,
)


class Verdict(str, Enum):
    QUALIFIED = "QUALIFIED"
    CONDITIONALLY_QUALIFIED = "CONDITIONALLY_QUALIFIED"
    UNQUALIFIED = "UNQUALIFIED"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
    DISCONTINUED_OR_UNORDERABLE = "DISCONTINUED_OR_UNORDERABLE"


class ThicknessEvidenceKind(str, Enum):
    EXACT_POINT = "EXACT_POINT"
    DECLARED_RANGE = "DECLARED_RANGE"
    APPROVED_INTERPOLATION = "APPROVED_INTERPOLATION"


class SpacingAxis(str, Enum):
    WIDTH = "WIDTH"
    DEPTH = "DEPTH"
    HEIGHT = "HEIGHT"


_CANONICAL_IDENTIFIER = re.compile(
    r"^[a-z][a-z0-9_-]*(?::[A-Za-z0-9][A-Za-z0-9._-]*)+$"
)


def _require_nonblank(value: object, field_name: str) -> None:
    if not isinstance(value, str):
        raise TypeError(f"{field_name} must be a string")
    if not value.strip():
        raise ValueError(f"{field_name} must not be blank")


def _require_canonical_identifier(
    value: object,
    field_name: str,
) -> None:
    _require_nonblank(value, field_name)
    if _CANONICAL_IDENTIFIER.fullmatch(value) is None:
        raise ValueError(
            f"{field_name} must be a canonical namespaced identifier"
        )


def _require_prefixed_identifier(
    value: object,
    field_name: str,
    prefix: str,
) -> None:
    _require_canonical_identifier(value, field_name)
    if not value.startswith(prefix):
        raise ValueError(f"{field_name} must start with {prefix!r}")


def _require_finite_real(value: object, field_name: str) -> None:
    if isinstance(value, bool) or not isinstance(value, Real):
        raise TypeError(f"{field_name} must be a real number")
    if not math.isfinite(value):
        raise ValueError(f"{field_name} must be finite")


def _copy_evidence_assertion_ids(value: object) -> tuple[str, ...]:
    if isinstance(value, (str, bytes, bytearray)):
        raise TypeError(
            "evidence_assertion_ids must be an iterable of strings"
        )
    try:
        assertion_ids = tuple(value)
    except TypeError as error:
        raise TypeError(
            "evidence_assertion_ids must be an iterable of strings"
        ) from error
    if not assertion_ids:
        raise ValueError(
            "evidence_assertion_ids must contain at least one assertion"
        )
    for assertion_id in assertion_ids:
        _require_prefixed_identifier(
            assertion_id,
            "evidence_assertion_ids",
            "assertion:",
        )
    if len(set(assertion_ids)) != len(assertion_ids):
        raise ValueError(
            "evidence_assertion_ids must not contain duplicates"
        )
    return assertion_ids


def _copy_reason_codes(value: object) -> tuple[str, ...]:
    if isinstance(value, (str, bytes, bytearray)):
        raise TypeError("reason_codes must be an iterable of strings")
    try:
        reason_codes = tuple(value)
    except TypeError as error:
        raise TypeError(
            "reason_codes must be an iterable of strings"
        ) from error
    for reason_code in reason_codes:
        _require_nonblank(reason_code, "reason_codes")
    return reason_codes


def _copy_nonblank_strings(
    value: object,
    field_name: str,
    *,
    require_nonempty: bool,
    unique: bool,
) -> tuple[str, ...]:
    if isinstance(value, (str, bytes, bytearray)):
        raise TypeError(f"{field_name} must be an iterable of strings")
    try:
        snapshot = tuple(value)
    except TypeError as error:
        raise TypeError(
            f"{field_name} must be an iterable of strings"
        ) from error
    if require_nonempty and not snapshot:
        raise ValueError(
            f"{field_name} must contain at least one value"
        )
    for item in snapshot:
        _require_nonblank(item, field_name)
    if unique and len(set(snapshot)) != len(snapshot):
        raise ValueError(f"{field_name} must not contain duplicates")
    return snapshot


def _copy_optional_evidence_assertion_ids(
    value: object,
) -> tuple[str, ...]:
    if isinstance(value, (str, bytes, bytearray)):
        raise TypeError(
            "evidence_assertion_ids must be an iterable of strings"
        )
    try:
        snapshot = tuple(value)
    except TypeError as error:
        raise TypeError(
            "evidence_assertion_ids must be an iterable of strings"
        ) from error
    if not snapshot:
        return ()
    return _copy_evidence_assertion_ids(snapshot)


@dataclass(frozen=True)
class MaterialInstance:
    substrate: str
    core: str
    density_kg_m3: float
    moisture_pct: float
    orientation: str
    nominal_thickness_mm: float
    measured_thickness_mm: float
    facing_thickness_mm: float

    def __post_init__(self) -> None:
        for field_name in ("substrate", "core", "orientation"):
            _require_nonblank(getattr(self, field_name), field_name)
        for field_name in (
            "density_kg_m3",
            "moisture_pct",
            "nominal_thickness_mm",
            "measured_thickness_mm",
            "facing_thickness_mm",
        ):
            _require_finite_real(getattr(self, field_name), field_name)
        if self.density_kg_m3 <= 0:
            raise ValueError("density_kg_m3 must be positive")
        if not 0 <= self.moisture_pct <= 100:
            raise ValueError("moisture_pct must be between 0 and 100")
        if self.nominal_thickness_mm <= 0:
            raise ValueError("nominal_thickness_mm must be positive")
        if self.measured_thickness_mm <= 0:
            raise ValueError("measured_thickness_mm must be positive")
        if self.facing_thickness_mm < 0:
            raise ValueError("facing_thickness_mm must be nonnegative")
        if self.facing_thickness_mm >= self.measured_thickness_mm:
            raise ValueError(
                "facing_thickness_mm must be below measured_thickness_mm"
            )


@dataclass(frozen=True)
class MaterialConstraint:
    substrate: str
    core: str
    density_min_kg_m3: float
    density_max_kg_m3: float
    moisture_min_pct: float
    moisture_max_pct: float
    orientation: str
    nominal_thickness_min_mm: float
    nominal_thickness_max_mm: float
    measured_thickness_min_mm: float
    measured_thickness_max_mm: float
    facing_thickness_min_mm: float
    facing_thickness_max_mm: float
    thickness_evidence_kind: ThicknessEvidenceKind

    def __post_init__(self) -> None:
        for field_name in ("substrate", "core", "orientation"):
            _require_nonblank(getattr(self, field_name), field_name)

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
            _require_finite_real(getattr(self, field_name), field_name)

        if self.density_min_kg_m3 <= 0:
            raise ValueError("density_min_kg_m3 must be positive")
        if self.nominal_thickness_min_mm <= 0:
            raise ValueError(
                "nominal_thickness_min_mm must be positive"
            )
        if self.measured_thickness_min_mm <= 0:
            raise ValueError(
                "measured_thickness_min_mm must be positive"
            )
        if self.moisture_min_pct < 0:
            raise ValueError("moisture_min_pct must be nonnegative")
        if self.moisture_max_pct > 100:
            raise ValueError("moisture_max_pct must not exceed 100")
        if self.facing_thickness_min_mm < 0:
            raise ValueError(
                "facing_thickness_min_mm must be nonnegative"
            )

        bound_pairs = (
            ("density_min_kg_m3", "density_max_kg_m3"),
            ("moisture_min_pct", "moisture_max_pct"),
            (
                "nominal_thickness_min_mm",
                "nominal_thickness_max_mm",
            ),
            (
                "measured_thickness_min_mm",
                "measured_thickness_max_mm",
            ),
            (
                "facing_thickness_min_mm",
                "facing_thickness_max_mm",
            ),
        )
        for min_name, max_name in bound_pairs:
            if getattr(self, max_name) < getattr(self, min_name):
                raise ValueError(
                    f"{max_name} must be greater than or equal to {min_name}"
                )

        if (
            self.facing_thickness_max_mm
            >= self.measured_thickness_min_mm
        ):
            raise ValueError(
                "facing_thickness_max_mm must be below "
                "measured_thickness_min_mm"
            )
        if not isinstance(
            self.thickness_evidence_kind,
            ThicknessEvidenceKind,
        ):
            raise TypeError(
                "thickness_evidence_kind must be a ThicknessEvidenceKind"
            )
        if (
            self.thickness_evidence_kind
            is ThicknessEvidenceKind.EXACT_POINT
            and (
                self.nominal_thickness_min_mm
                != self.nominal_thickness_max_mm
                or self.measured_thickness_min_mm
                != self.measured_thickness_max_mm
            )
        ):
            raise ValueError(
                "EXACT_POINT requires equal nominal and measured bounds"
            )

    def matches(self, material: MaterialInstance) -> bool:
        if not isinstance(material, MaterialInstance):
            raise TypeError("material must be a MaterialInstance")
        return (
            material.substrate == self.substrate
            and material.core == self.core
            and self.density_min_kg_m3
            <= material.density_kg_m3
            <= self.density_max_kg_m3
            and self.moisture_min_pct
            <= material.moisture_pct
            <= self.moisture_max_pct
            and material.orientation == self.orientation
            and self.nominal_thickness_min_mm
            <= material.nominal_thickness_mm
            <= self.nominal_thickness_max_mm
            and self.measured_thickness_min_mm
            <= material.measured_thickness_mm
            <= self.measured_thickness_max_mm
            and self.facing_thickness_min_mm
            <= material.facing_thickness_mm
            <= self.facing_thickness_max_mm
        )


@dataclass(frozen=True)
class JointConfiguration:
    connector_sku_id: str
    panel_a: MaterialInstance
    panel_b: MaterialInstance

    def __post_init__(self) -> None:
        _require_prefixed_identifier(
            self.connector_sku_id,
            "connector_sku_id",
            "sku:",
        )
        if not isinstance(self.panel_a, MaterialInstance):
            raise TypeError("panel_a must be a MaterialInstance")
        if not isinstance(self.panel_b, MaterialInstance):
            raise TypeError("panel_b must be a MaterialInstance")


@dataclass(frozen=True)
class QualificationEnvelope:
    envelope_id: str
    connector_sku_id: str
    panel_a: MaterialConstraint
    panel_b: MaterialConstraint
    verdict: Verdict
    evidence_assertion_ids: tuple[str, ...]

    def __post_init__(self) -> None:
        _require_prefixed_identifier(
            self.envelope_id,
            "envelope_id",
            "envelope:",
        )
        _require_prefixed_identifier(
            self.connector_sku_id,
            "connector_sku_id",
            "sku:",
        )
        if not isinstance(self.panel_a, MaterialConstraint):
            raise TypeError("panel_a must be a MaterialConstraint")
        if not isinstance(self.panel_b, MaterialConstraint):
            raise TypeError("panel_b must be a MaterialConstraint")
        if not isinstance(self.verdict, Verdict):
            raise TypeError("verdict must be a Verdict")
        object.__setattr__(
            self,
            "evidence_assertion_ids",
            _copy_evidence_assertion_ids(
                self.evidence_assertion_ids
            ),
        )

    def matches(self, joint: JointConfiguration) -> bool:
        if not isinstance(joint, JointConfiguration):
            raise TypeError("joint must be a JointConfiguration")
        return (
            self.connector_sku_id == joint.connector_sku_id
            and self.panel_a.matches(joint.panel_a)
            and self.panel_b.matches(joint.panel_b)
        )


@dataclass(frozen=True)
class QualificationResult:
    verdict: Verdict
    envelope_id: str | None
    reason_codes: tuple[str, ...]

    def __post_init__(self) -> None:
        if not isinstance(self.verdict, Verdict):
            raise TypeError("verdict must be a Verdict")
        if self.envelope_id is not None:
            _require_prefixed_identifier(
                self.envelope_id,
                "envelope_id",
                "envelope:",
            )
        reason_codes = _copy_reason_codes(self.reason_codes)
        if self.verdict is Verdict.QUALIFIED:
            if self.envelope_id is None or reason_codes:
                raise ValueError(
                    "QUALIFIED requires an envelope_id "
                    "and no reason_codes"
                )
        elif self.verdict is Verdict.CONDITIONALLY_QUALIFIED:
            if self.envelope_id is None or not reason_codes:
                raise ValueError(
                    "CONDITIONALLY_QUALIFIED requires an envelope_id "
                    "and at least one reason_code"
                )
        elif self.envelope_id is not None or not reason_codes:
            raise ValueError(
                "refusal verdicts require no envelope_id "
                "and at least one reason_code"
            )
        object.__setattr__(
            self,
            "reason_codes",
            reason_codes,
        )


_CABINET_TOPOLOGIES = frozenset(
    ("base", "wall", "tall", "wardrobe", "custom")
)
_CABINET_MOUNTINGS = frozenset(("FLOOR", "WALL", "MOBILE"))


@dataclass(frozen=True)
class CabinetConfiguration:
    width_mm: float
    depth_mm: float
    height_mm: float
    topology: str
    joints: tuple[JointConfiguration, ...]
    load_cases: tuple[str, ...]
    mounting: str
    wall_substrate: str | None

    def __post_init__(self) -> None:
        for field_name in ("width_mm", "depth_mm", "height_mm"):
            value = getattr(self, field_name)
            _require_finite_real(value, field_name)
            if value <= 0:
                raise ValueError(f"{field_name} must be positive")

        _require_nonblank(self.topology, "topology")
        if self.topology not in _CABINET_TOPOLOGIES:
            raise ValueError(
                "topology must be one of base, wall, tall, wardrobe, custom"
            )

        if isinstance(self.joints, (str, bytes, bytearray)):
            raise TypeError(
                "joints must be an iterable of JointConfiguration values"
            )
        try:
            joints = tuple(self.joints)
        except TypeError as error:
            raise TypeError(
                "joints must be an iterable of JointConfiguration values"
            ) from error
        if not joints:
            raise ValueError("joints must contain at least one joint")
        if any(
            not isinstance(joint, JointConfiguration)
            for joint in joints
        ):
            raise TypeError(
                "joints must contain JointConfiguration values"
            )

        load_cases = _copy_nonblank_strings(
            self.load_cases,
            "load_cases",
            require_nonempty=True,
            unique=True,
        )

        _require_nonblank(self.mounting, "mounting")
        if self.mounting not in _CABINET_MOUNTINGS:
            raise ValueError(
                "mounting must be one of FLOOR, WALL, MOBILE"
            )
        if self.mounting == "WALL":
            _require_nonblank(self.wall_substrate, "wall_substrate")
        elif self.wall_substrate is not None:
            raise ValueError(
                "wall_substrate must be None unless mounting is WALL"
            )

        object.__setattr__(self, "joints", joints)
        object.__setattr__(self, "load_cases", load_cases)


@dataclass(frozen=True)
class CabinetPolicy:
    policy_id: str
    connector_sku_id: str
    topology: str
    width_min_mm: float
    width_max_mm: float
    depth_min_mm: float
    depth_max_mm: float
    height_min_mm: float
    height_max_mm: float
    spacing_axis: SpacingAxis
    max_spacing_mm: float
    min_connector_count: int
    max_connector_count: int
    required_machine_capabilities: tuple[str, ...]
    reinforcement_requirement: str | None
    anchor_requirement: str | None
    evidence_assertion_ids: tuple[str, ...]

    def __post_init__(self) -> None:
        _require_prefixed_identifier(
            self.policy_id,
            "policy_id",
            "policy:",
        )
        _require_prefixed_identifier(
            self.connector_sku_id,
            "connector_sku_id",
            "sku:",
        )
        _require_nonblank(self.topology, "topology")
        if self.topology not in _CABINET_TOPOLOGIES:
            raise ValueError(
                "topology must be one of base, wall, tall, wardrobe, custom"
            )

        dimension_fields = (
            "width_min_mm",
            "width_max_mm",
            "depth_min_mm",
            "depth_max_mm",
            "height_min_mm",
            "height_max_mm",
        )
        for field_name in dimension_fields:
            value = getattr(self, field_name)
            _require_finite_real(value, field_name)
            if value <= 0:
                raise ValueError(f"{field_name} must be positive")
        for minimum_name, maximum_name in (
            ("width_min_mm", "width_max_mm"),
            ("depth_min_mm", "depth_max_mm"),
            ("height_min_mm", "height_max_mm"),
        ):
            if getattr(self, maximum_name) < getattr(self, minimum_name):
                raise ValueError(
                    f"{maximum_name} must be greater than or equal to "
                    f"{minimum_name}"
                )

        if not isinstance(self.spacing_axis, SpacingAxis):
            raise TypeError("spacing_axis must be a SpacingAxis")
        _require_finite_real(self.max_spacing_mm, "max_spacing_mm")
        if self.max_spacing_mm <= 0:
            raise ValueError("max_spacing_mm must be positive")

        for field_name in (
            "min_connector_count",
            "max_connector_count",
        ):
            value = getattr(self, field_name)
            if isinstance(value, bool) or not isinstance(value, int):
                raise TypeError(f"{field_name} must be an integer")
            if value < 2:
                raise ValueError(
                    f"{field_name} must be at least two"
                )
        if self.max_connector_count < self.min_connector_count:
            raise ValueError(
                "max_connector_count must be greater than or equal to "
                "min_connector_count"
            )

        capabilities = _copy_nonblank_strings(
            self.required_machine_capabilities,
            "required_machine_capabilities",
            require_nonempty=False,
            unique=True,
        )
        for capability in capabilities:
            _require_canonical_identifier(
                capability,
                "required_machine_capabilities",
            )
        for field_name in (
            "reinforcement_requirement",
            "anchor_requirement",
        ):
            value = getattr(self, field_name)
            if value is not None:
                _require_nonblank(value, field_name)

        object.__setattr__(
            self,
            "required_machine_capabilities",
            capabilities,
        )
        object.__setattr__(
            self,
            "evidence_assertion_ids",
            _copy_evidence_assertion_ids(
                self.evidence_assertion_ids
            ),
        )

    def matches(self, cabinet: CabinetConfiguration, joint: JointConfiguration) -> bool:
        if not isinstance(cabinet, CabinetConfiguration):
            raise TypeError("cabinet must be a CabinetConfiguration")
        if not isinstance(joint, JointConfiguration):
            raise TypeError("joint must be a JointConfiguration")
        return (
            self.connector_sku_id == joint.connector_sku_id
            and self.topology == cabinet.topology
            and self.width_min_mm
            <= cabinet.width_mm
            <= self.width_max_mm
            and self.depth_min_mm
            <= cabinet.depth_mm
            <= self.depth_max_mm
            and self.height_min_mm
            <= cabinet.height_mm
            <= self.height_max_mm
        )


@dataclass(frozen=True)
class ConnectorPlacement:
    joint_index: int
    connector_sku_id: str
    policy_id: str
    connector_count: int | None
    spacing_mm: float | None

    def __post_init__(self) -> None:
        if (
            isinstance(self.joint_index, bool)
            or not isinstance(self.joint_index, int)
        ):
            raise TypeError("joint_index must be an integer")
        if self.joint_index < 0:
            raise ValueError("joint_index must be nonnegative")
        _require_prefixed_identifier(
            self.connector_sku_id,
            "connector_sku_id",
            "sku:",
        )
        _require_prefixed_identifier(
            self.policy_id,
            "policy_id",
            "policy:",
        )

        unresolved = (
            self.connector_count is None and self.spacing_mm is None
        )
        if unresolved:
            return
        if self.connector_count is None or self.spacing_mm is None:
            raise ValueError(
                "connector_count and spacing_mm must both be set or None"
            )
        if (
            isinstance(self.connector_count, bool)
            or not isinstance(self.connector_count, int)
        ):
            raise TypeError("connector_count must be an integer")
        if self.connector_count < 2:
            raise ValueError("connector_count must be at least two")
        _require_finite_real(self.spacing_mm, "spacing_mm")
        if self.spacing_mm <= 0:
            raise ValueError("spacing_mm must be positive")


def _copy_policy_ids(value: object) -> tuple[str, ...]:
    snapshot = _copy_nonblank_strings(
        value,
        "policy_ids",
        require_nonempty=False,
        unique=False,
    )
    for policy_id in snapshot:
        _require_prefixed_identifier(
            policy_id,
            "policy_ids",
            "policy:",
        )
    return snapshot


def _copy_placements(value: object) -> tuple[ConnectorPlacement, ...]:
    if isinstance(value, (str, bytes, bytearray)):
        raise TypeError("placements must be an iterable")
    try:
        snapshot = tuple(value)
    except TypeError as error:
        raise TypeError("placements must be an iterable") from error
    if any(
        not isinstance(placement, ConnectorPlacement)
        for placement in snapshot
    ):
        raise TypeError(
            "placements must contain ConnectorPlacement values"
        )
    joint_indices = tuple(
        placement.joint_index for placement in snapshot
    )
    if len(set(joint_indices)) != len(joint_indices):
        raise ValueError(
            "placements must not contain duplicate joint_index values"
        )
    return snapshot


@dataclass(frozen=True)
class CabinetEvaluation:
    verdict: Verdict
    policy_ids: tuple[str, ...]
    placements: tuple[ConnectorPlacement, ...]
    reinforcement_requirements: tuple[str, ...]
    anchor_requirements: tuple[str, ...]
    reason_codes: tuple[str, ...]
    evidence_assertion_ids: tuple[str, ...]

    def __post_init__(self) -> None:
        if not isinstance(self.verdict, Verdict):
            raise TypeError("verdict must be a Verdict")
        policy_ids = _copy_policy_ids(self.policy_ids)
        placements = _copy_placements(self.placements)
        reinforcements = _copy_nonblank_strings(
            self.reinforcement_requirements,
            "reinforcement_requirements",
            require_nonempty=False,
            unique=True,
        )
        anchors = _copy_nonblank_strings(
            self.anchor_requirements,
            "anchor_requirements",
            require_nonempty=False,
            unique=True,
        )
        reason_codes = _copy_reason_codes(self.reason_codes)
        if len(set(reason_codes)) != len(reason_codes):
            raise ValueError("reason_codes must not contain duplicates")
        evidence_ids = _copy_optional_evidence_assertion_ids(
            self.evidence_assertion_ids
        )

        selected_policy_ids = tuple(
            placement.policy_id for placement in placements
        )
        if self.verdict is Verdict.QUALIFIED:
            if (
                not policy_ids
                or not placements
                or not evidence_ids
                or reinforcements
                or anchors
                or reason_codes
                or any(
                    placement.connector_count is None
                    or placement.spacing_mm is None
                    for placement in placements
                )
                or selected_policy_ids != policy_ids
            ):
                raise ValueError(
                    "QUALIFIED requires complete concrete placements, "
                    "matching policies and evidence, with no conditions "
                    "or reasons"
                )
        elif self.verdict is Verdict.CONDITIONALLY_QUALIFIED:
            expected_reason_codes = (
                (
                    ("REINFORCEMENT_REQUIRED",)
                    if reinforcements
                    else ()
                )
                + (("ANCHOR_REQUIRED",) if anchors else ())
            )
            if (
                not policy_ids
                or not placements
                or not evidence_ids
                or not (reinforcements or anchors)
                or reason_codes != expected_reason_codes
                or selected_policy_ids != policy_ids
            ):
                raise ValueError(
                    "CONDITIONALLY_QUALIFIED requires matching policies, "
                    "placements, evidence, and exact requirement-category "
                    "reasons"
                )
        elif (
            policy_ids
            or placements
            or reinforcements
            or anchors
            or not reason_codes
            or evidence_ids
        ):
            raise ValueError(
                "refusal verdicts require reasons and no manufacturing "
                "authorization"
            )

        object.__setattr__(self, "policy_ids", policy_ids)
        object.__setattr__(self, "placements", placements)
        object.__setattr__(
            self,
            "reinforcement_requirements",
            reinforcements,
        )
        object.__setattr__(self, "anchor_requirements", anchors)
        object.__setattr__(self, "reason_codes", reason_codes)
        object.__setattr__(
            self,
            "evidence_assertion_ids",
            evidence_ids,
        )


def _copy_envelopes(
    envelopes: Sequence[QualificationEnvelope],
) -> tuple[QualificationEnvelope, ...]:
    if isinstance(envelopes, (str, bytes, bytearray)):
        raise TypeError("envelopes must be an iterable")
    try:
        snapshot = tuple(envelopes)
    except TypeError as error:
        raise TypeError("envelopes must be an iterable") from error
    if any(
        not isinstance(envelope, QualificationEnvelope)
        for envelope in snapshot
    ):
        raise TypeError(
            "envelopes must contain QualificationEnvelope values"
        )
    return snapshot


def qualify_joint(
    joint: JointConfiguration,
    envelopes: Sequence[QualificationEnvelope],
) -> QualificationResult:
    """Return a deterministic fail-closed verdict for one exact joint."""

    if not isinstance(joint, JointConfiguration):
        raise TypeError("joint must be a JointConfiguration")
    snapshot = _copy_envelopes(envelopes)
    matches = tuple(
        envelope
        for envelope in snapshot
        if envelope.matches(joint)
    )
    if not matches:
        return QualificationResult(
            verdict=Verdict.INSUFFICIENT_EVIDENCE,
            envelope_id=None,
            reason_codes=("NO_EXACT_CONFIGURATION_EVIDENCE",),
        )
    if (
        len(matches) != 1
        or matches[0].verdict is not Verdict.QUALIFIED
    ):
        return QualificationResult(
            verdict=Verdict.UNQUALIFIED,
            envelope_id=None,
            reason_codes=(
                "AMBIGUOUS_OR_NONQUALIFIED_ENVELOPE",
            ),
        )
    selected = matches[0]
    return QualificationResult(
        verdict=Verdict.QUALIFIED,
        envelope_id=selected.envelope_id,
        reason_codes=(),
    )


def _copy_policies(value: object) -> tuple[CabinetPolicy, ...]:
    if isinstance(value, (str, bytes, bytearray)):
        raise TypeError("policies must be an iterable")
    try:
        snapshot = tuple(value)
    except TypeError as error:
        raise TypeError("policies must be an iterable") from error
    if any(
        not isinstance(policy, CabinetPolicy)
        for policy in snapshot
    ):
        raise TypeError("policies must contain CabinetPolicy values")
    return snapshot


def _unique_in_order(values: Sequence[str]) -> tuple[str, ...]:
    return tuple(dict.fromkeys(values))


def _cabinet_refusal(
    verdict: Verdict,
    reason_codes: Sequence[str],
) -> CabinetEvaluation:
    return CabinetEvaluation(
        verdict=verdict,
        policy_ids=(),
        placements=(),
        reinforcement_requirements=(),
        anchor_requirements=(),
        reason_codes=_unique_in_order(reason_codes),
        evidence_assertion_ids=(),
    )


def _checked_connector_layout(
    axis_length: Real,
    max_spacing_mm: Real,
    min_connector_count: int,
    max_connector_count: int,
) -> tuple[int, float | None, str | None]:
    """Return count and safely representable spacing without float division.

    Accepted floats use their canonical shortest decimal spelling as the
    governed boundary. Exact decimal 0.918 / 0.102 is therefore nine, while
    the next float above 0.918 remains above nine. Integer-ratio arithmetic
    keeps the ceiling total when the finite quotient exceeds float range.
    """

    def canonical_ratio(value: Real) -> tuple[int, int]:
        try:
            decimal_value = Decimal(str(value))
            return decimal_value.as_integer_ratio()
        except (InvalidOperation, ValueError):
            ratio_method = getattr(value, "as_integer_ratio", None)
            if ratio_method is not None:
                numerator, denominator = ratio_method()
                return int(numerator), int(denominator)
            fraction = Fraction(value)
            return fraction.numerator, fraction.denominator

    axis_numerator, axis_denominator = canonical_ratio(axis_length)
    spacing_numerator, spacing_denominator = canonical_ratio(
        max_spacing_mm
    )
    quotient_numerator = axis_numerator * spacing_denominator
    quotient_denominator = axis_denominator * spacing_numerator
    quotient_ceiling = (
        quotient_numerator + quotient_denominator - 1
    ) // quotient_denominator
    connector_count = max(
        min_connector_count,
        quotient_ceiling + 1,
    )

    if connector_count > max_connector_count:
        return connector_count, None, None

    exact_spacing = Fraction(
        axis_numerator,
        axis_denominator * (connector_count - 1),
    )
    try:
        spacing_mm = float(exact_spacing)
    except (OverflowError, ValueError):
        return (
            connector_count,
            None,
            "PARAMETRIC_ARITHMETIC_UNREPRESENTABLE",
        )
    if not math.isfinite(spacing_mm) or spacing_mm <= 0:
        return (
            connector_count,
            None,
            "PARAMETRIC_ARITHMETIC_UNREPRESENTABLE",
        )
    return connector_count, spacing_mm, None


def evaluate_cabinet(
    cabinet: CabinetConfiguration,
    registry: Registry,
    machine_capabilities: frozenset[str],
    *,
    qualification_envelopes: Sequence[QualificationEnvelope] = (),
    policies: Sequence[CabinetPolicy] = (),
) -> CabinetEvaluation:
    """Perform evidence-bound rule selection and connector count/spacing.

    This scope is not full racking, overturning, center of gravity, or
    structural extrapolation analysis.
    """

    if not isinstance(cabinet, CabinetConfiguration):
        raise TypeError("cabinet must be a CabinetConfiguration")
    if type(registry) is not Registry:
        raise TypeError("registry must be a Registry")
    if type(machine_capabilities) is not frozenset:
        raise TypeError("machine_capabilities must be a frozenset")
    for capability in machine_capabilities:
        _require_canonical_identifier(
            capability,
            "machine_capabilities",
        )

    envelope_snapshot = _copy_envelopes(qualification_envelopes)
    policy_snapshot = _copy_policies(policies)

    missing_skus: list[str] = []
    pending_sku_lifecycles: list[str] = []
    unavailable_sku_lifecycles: list[str] = []
    unavailable_models: list[str] = []
    for joint in cabinet.joints:
        sku = registry.get_sku(joint.connector_sku_id)
        if sku is None:
            missing_skus.append(joint.connector_sku_id)
            continue
        sku_lifecycle = sku.verification[
            VerificationDimension.LIFECYCLE
        ]
        if sku_lifecycle is VerificationState.PENDING:
            pending_sku_lifecycles.append(joint.connector_sku_id)
        elif sku_lifecycle in (
            VerificationState.DISCONTINUED,
            VerificationState.BLOCKED,
        ):
            unavailable_sku_lifecycles.append(
                joint.connector_sku_id
            )
        model = registry.get_model(sku.model_id)
        if model is None:
            missing_skus.append(joint.connector_sku_id)
            continue
        if model.lifecycle not in (
            LifecycleState.ACTIVE,
            LifecycleState.REGION_ONLY,
        ):
            unavailable_models.append(joint.connector_sku_id)
    if missing_skus:
        return _cabinet_refusal(
            Verdict.INSUFFICIENT_EVIDENCE,
            ("EXACT_CONNECTOR_SKU_NOT_FOUND",),
        )
    if pending_sku_lifecycles:
        return _cabinet_refusal(
            Verdict.INSUFFICIENT_EVIDENCE,
            ("EXACT_CONNECTOR_SKU_LIFECYCLE_PENDING",),
        )
    if unavailable_sku_lifecycles:
        return _cabinet_refusal(
            Verdict.DISCONTINUED_OR_UNORDERABLE,
            (
                "EXACT_CONNECTOR_SKU_"
                "DISCONTINUED_OR_UNORDERABLE",
            ),
        )
    if unavailable_models:
        return _cabinet_refusal(
            Verdict.DISCONTINUED_OR_UNORDERABLE,
            ("EXACT_CONNECTOR_DISCONTINUED_OR_UNORDERABLE",),
        )

    qualification_results = tuple(
        qualify_joint(joint, envelope_snapshot)
        for joint in cabinet.joints
    )
    insufficient_results = tuple(
        result
        for result in qualification_results
        if result.verdict is Verdict.INSUFFICIENT_EVIDENCE
    )
    if insufficient_results:
        return _cabinet_refusal(
            Verdict.INSUFFICIENT_EVIDENCE,
            tuple(
                reason
                for result in insufficient_results
                for reason in result.reason_codes
            ),
        )
    nonqualified_results = tuple(
        result
        for result in qualification_results
        if result.verdict is not Verdict.QUALIFIED
    )
    if nonqualified_results:
        return _cabinet_refusal(
            Verdict.UNQUALIFIED,
            tuple(
                reason
                for result in nonqualified_results
                for reason in result.reason_codes
            ),
        )

    policy_matches = tuple(
        tuple(
            policy
            for policy in policy_snapshot
            if policy.matches(cabinet, joint)
        )
        for joint in cabinet.joints
    )
    if any(not matches for matches in policy_matches):
        return _cabinet_refusal(
            Verdict.INSUFFICIENT_EVIDENCE,
            ("NO_PARAMETRIC_POLICY",),
        )
    if any(len(matches) > 1 for matches in policy_matches):
        return _cabinet_refusal(
            Verdict.UNQUALIFIED,
            ("AMBIGUOUS_PARAMETRIC_POLICY",),
        )
    selected_policies = tuple(matches[0] for matches in policy_matches)

    if any(
        capability not in machine_capabilities
        for policy in selected_policies
        for capability in policy.required_machine_capabilities
    ):
        return _cabinet_refusal(
            Verdict.UNQUALIFIED,
            ("MISSING_REQUIRED_MACHINE_CAPABILITY",),
        )

    qualification_evidence_ids: list[str] = []
    for joint, result in zip(
        cabinet.joints,
        qualification_results,
        strict=True,
    ):
        selected_envelope = next(
            envelope
            for envelope in envelope_snapshot
            if envelope.envelope_id == result.envelope_id
            and envelope.matches(joint)
        )
        qualification_evidence_ids.extend(
            selected_envelope.evidence_assertion_ids
        )

    placements: list[ConnectorPlacement] = []
    reinforcement_requirements: list[str] = []
    anchor_requirements: list[str] = []
    conditional_reasons: list[str] = []
    for joint_index, (joint, policy) in enumerate(
        zip(cabinet.joints, selected_policies, strict=True)
    ):
        axis_length = {
            SpacingAxis.WIDTH: cabinet.width_mm,
            SpacingAxis.DEPTH: cabinet.depth_mm,
            SpacingAxis.HEIGHT: cabinet.height_mm,
        }[policy.spacing_axis]
        (
            connector_count,
            spacing_mm,
            arithmetic_reason,
        ) = _checked_connector_layout(
            axis_length,
            policy.max_spacing_mm,
            policy.min_connector_count,
            policy.max_connector_count,
        )
        if arithmetic_reason is not None:
            return _cabinet_refusal(
                Verdict.UNQUALIFIED,
                (arithmetic_reason,),
            )
        has_condition = (
            policy.reinforcement_requirement is not None
            or policy.anchor_requirement is not None
        )
        if connector_count > policy.max_connector_count:
            if not has_condition:
                return _cabinet_refusal(
                    Verdict.UNQUALIFIED,
                    ("CONNECTOR_COUNT_EXCEEDS_POLICY",),
                )
            placement = ConnectorPlacement(
                joint_index=joint_index,
                connector_sku_id=joint.connector_sku_id,
                policy_id=policy.policy_id,
                connector_count=None,
                spacing_mm=None,
            )
        else:
            placement = ConnectorPlacement(
                joint_index=joint_index,
                connector_sku_id=joint.connector_sku_id,
                policy_id=policy.policy_id,
                connector_count=connector_count,
                spacing_mm=spacing_mm,
            )
        placements.append(placement)

        if policy.reinforcement_requirement is not None:
            reinforcement_requirements.append(
                policy.reinforcement_requirement
            )
            conditional_reasons.append(
                "REINFORCEMENT_REQUIRED"
            )
        if policy.anchor_requirement is not None:
            anchor_requirements.append(policy.anchor_requirement)
            conditional_reasons.append("ANCHOR_REQUIRED")

    policy_evidence_ids = tuple(
        evidence_id
        for policy in selected_policies
        for evidence_id in policy.evidence_assertion_ids
    )
    evidence_ids = _unique_in_order(
        tuple(qualification_evidence_ids) + policy_evidence_ids
    )
    policy_ids = tuple(
        policy.policy_id for policy in selected_policies
    )
    if conditional_reasons:
        return CabinetEvaluation(
            verdict=Verdict.CONDITIONALLY_QUALIFIED,
            policy_ids=policy_ids,
            placements=tuple(placements),
            reinforcement_requirements=_unique_in_order(
                reinforcement_requirements
            ),
            anchor_requirements=_unique_in_order(
                anchor_requirements
            ),
            reason_codes=_unique_in_order(conditional_reasons),
            evidence_assertion_ids=evidence_ids,
        )
    return CabinetEvaluation(
        verdict=Verdict.QUALIFIED,
        policy_ids=policy_ids,
        placements=tuple(placements),
        reinforcement_requirements=(),
        anchor_requirements=(),
        reason_codes=(),
        evidence_assertion_ids=evidence_ids,
    )


__all__ = [
    "CabinetConfiguration",
    "CabinetEvaluation",
    "CabinetPolicy",
    "ConnectorPlacement",
    "JointConfiguration",
    "MaterialConstraint",
    "MaterialInstance",
    "QualificationEnvelope",
    "QualificationResult",
    "SpacingAxis",
    "ThicknessEvidenceKind",
    "Verdict",
    "evaluate_cabinet",
    "qualify_joint",
]
