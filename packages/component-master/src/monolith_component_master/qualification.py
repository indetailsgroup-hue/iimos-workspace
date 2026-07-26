"""Immutable evidence-bound material and thickness qualification contracts."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from enum import Enum
import math
from numbers import Real
import re


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
        object.__setattr__(
            self,
            "reason_codes",
            _copy_reason_codes(self.reason_codes),
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


__all__ = [
    "JointConfiguration",
    "MaterialConstraint",
    "MaterialInstance",
    "QualificationEnvelope",
    "QualificationResult",
    "ThicknessEvidenceKind",
    "Verdict",
    "qualify_joint",
]
