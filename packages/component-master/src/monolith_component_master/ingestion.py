"""Immutable records for reviewed candidate ingestion and quarantine."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
import math
import re
from types import MappingProxyType

from .evidence import FieldAssertion


_CANONICAL_ID_PATTERN = re.compile(
    r"[a-z][a-z0-9_-]*(?::[A-Za-z0-9][A-Za-z0-9._-]*)+"
)
_FIELD_PATH_PATTERN = re.compile(r"[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+")
_DIMENSIONAL_PREFIXES = ("dimensions.", "geometry.")
_MATING_REQUIRED_FIELD = "compatibility.requires_mating_part"
_EXACT_MATING_PART_FIELD = "compatibility.exact_mating_part_id"
_QUARANTINE_OWNER_BY_REASON = {
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


def _require_string(value: object, field_name: str) -> str:
    if not isinstance(value, str):
        raise TypeError(f"{field_name} must be a string")
    if not value.strip():
        raise ValueError(f"{field_name} must not be blank")
    return value


def _require_canonical_id(value: object, field_name: str) -> str:
    identifier = _require_string(value, field_name)
    if _CANONICAL_ID_PATTERN.fullmatch(identifier) is None:
        raise ValueError(f"{field_name} must be a canonical colon-delimited ID")
    return identifier


def _snapshot_value(value: object) -> object:
    if isinstance(value, Mapping):
        return MappingProxyType(
            {
                _snapshot_value(key): _snapshot_value(item)
                for key, item in value.items()
            }
        )
    if isinstance(value, (list, tuple)):
        return tuple(_snapshot_value(item) for item in value)
    if isinstance(value, (set, frozenset)):
        return frozenset(_snapshot_value(item) for item in value)
    if isinstance(value, bytearray):
        return bytes(value)
    return value


def _snapshot_iterable(
    value: object,
    field_name: str,
) -> tuple[object, ...]:
    if isinstance(value, (str, bytes, bytearray, Mapping)):
        raise TypeError(f"{field_name} must be an iterable of records")
    try:
        return tuple(value)  # type: ignore[arg-type]
    except TypeError as error:
        raise TypeError(f"{field_name} must be an iterable of records") from error


def _validate_numeric(value: object, field_name: str) -> None:
    if isinstance(value, bool):
        raise TypeError(f"{field_name} must be numeric, not boolean")
    if not isinstance(value, (int, float, Decimal)):
        raise TypeError(f"{field_name} must be numeric")
    if isinstance(value, float) and not math.isfinite(value):
        raise ValueError(f"{field_name} must be finite")
    try:
        if not Decimal(str(value)).is_finite():
            raise ValueError(f"{field_name} must be finite")
    except InvalidOperation as error:
        raise ValueError(f"{field_name} must be finite") from error


def _validate_assertion_value(assertion: FieldAssertion) -> None:
    if assertion.field_path.startswith(_DIMENSIONAL_PREFIXES):
        if not isinstance(assertion.value, Mapping):
            raise TypeError(
                f"{assertion.field_path} must be an object with value and unit"
            )
        if "value" not in assertion.value:
            raise ValueError(f"{assertion.field_path} must contain value")
        _validate_numeric(
            assertion.value["value"],
            f"{assertion.field_path}.value",
        )
        if "unit" in assertion.value and not isinstance(
            assertion.value["unit"], str
        ):
            raise TypeError(f"{assertion.field_path}.unit must be a string")
        return

    if assertion.field_path.startswith("identity."):
        if isinstance(assertion.value, bool) or not isinstance(
            assertion.value, (str, int, float, Decimal)
        ):
            raise TypeError(f"{assertion.field_path} must be a scalar value")
        if isinstance(assertion.value, str) and not assertion.value.strip():
            raise ValueError(f"{assertion.field_path} must not be blank")
        if isinstance(assertion.value, (int, float, Decimal)):
            _validate_numeric(assertion.value, assertion.field_path)
        return

    if assertion.field_path == _MATING_REQUIRED_FIELD:
        if not isinstance(assertion.value, bool):
            raise TypeError(f"{_MATING_REQUIRED_FIELD} must be a boolean")
        return

    if assertion.field_path == _EXACT_MATING_PART_FIELD:
        if not isinstance(assertion.value, str):
            raise TypeError(f"{_EXACT_MATING_PART_FIELD} must be a string")


def _snapshot_assertion(assertion: object) -> FieldAssertion:
    if not isinstance(assertion, FieldAssertion):
        raise TypeError("assertions must contain only FieldAssertion records")
    _require_canonical_id(assertion.assertion_id, "assertion_id")
    _require_canonical_id(assertion.source_id, "source_id")
    if _FIELD_PATH_PATTERN.fullmatch(assertion.field_path) is None:
        raise ValueError("field_path must use normalized lower-case dotted segments")
    _validate_assertion_value(assertion)
    return FieldAssertion(
        assertion_id=assertion.assertion_id,
        entity_id=assertion.entity_id,
        field_path=assertion.field_path,
        value=_snapshot_value(assertion.value),
        source_id=assertion.source_id,
        locator=assertion.locator,
        reviewer=assertion.reviewer,
        review_state=assertion.review_state,
    )


@dataclass(frozen=True)
class CandidateRecord:
    candidate_id: str
    brand_id: str
    entity_kind: str
    assertions: tuple[FieldAssertion, ...]
    extraction_method: str

    def __post_init__(self) -> None:
        _require_canonical_id(self.candidate_id, "candidate_id")
        _require_canonical_id(self.brand_id, "brand_id")
        _require_string(self.entity_kind, "entity_kind")
        _require_string(self.extraction_method, "extraction_method")

        supplied_assertions = _snapshot_iterable(self.assertions, "assertions")
        if not supplied_assertions:
            raise ValueError("assertions must not be empty")
        snapshots = tuple(
            _snapshot_assertion(assertion)
            for assertion in supplied_assertions
        )
        assertion_ids = tuple(
            assertion.assertion_id for assertion in snapshots
        )
        if len(assertion_ids) != len(set(assertion_ids)):
            raise ValueError("duplicate assertion_id")
        if any(
            assertion.entity_id != self.candidate_id
            for assertion in snapshots
        ):
            raise ValueError("assertion entity_id must match candidate_id")
        object.__setattr__(self, "assertions", snapshots)


@dataclass(frozen=True)
class QuarantineRecord:
    candidate_id: str
    reason_code: str
    evidence_ids: tuple[str, ...]
    owner_role: str

    def __post_init__(self) -> None:
        _require_canonical_id(self.candidate_id, "candidate_id")
        _require_string(self.reason_code, "reason_code")
        _require_string(self.owner_role, "owner_role")
        expected_owner = _QUARANTINE_OWNER_BY_REASON.get(self.reason_code)
        if expected_owner is None:
            raise ValueError(f"unsupported quarantine reason: {self.reason_code}")
        if self.owner_role != expected_owner:
            raise ValueError(
                f"{self.reason_code} must be owned by {expected_owner}"
            )
        supplied_evidence = _snapshot_iterable(
            self.evidence_ids,
            "evidence_ids",
        )
        if not supplied_evidence:
            raise ValueError("evidence_ids must not be empty")
        canonical_ids = tuple(
            _require_canonical_id(identifier, "evidence_id")
            for identifier in supplied_evidence
        )
        object.__setattr__(
            self,
            "evidence_ids",
            tuple(sorted(set(canonical_ids))),
        )


@dataclass(frozen=True)
class IngestionResult:
    promoted: tuple[CandidateRecord, ...]
    quarantined: tuple[QuarantineRecord, ...]

    def __post_init__(self) -> None:
        promoted = _snapshot_iterable(self.promoted, "promoted")
        quarantined = _snapshot_iterable(self.quarantined, "quarantined")
        if any(not isinstance(item, CandidateRecord) for item in promoted):
            raise TypeError("promoted must contain only CandidateRecord records")
        if any(
            not isinstance(item, QuarantineRecord)
            for item in quarantined
        ):
            raise TypeError(
                "quarantined must contain only QuarantineRecord records"
            )
        if promoted and quarantined:
            raise ValueError("promoted and quarantined are mutually exclusive")
        if not promoted and not quarantined:
            raise ValueError("ingestion result must contain one disposition")
        if len(promoted) > 1:
            raise ValueError(
                "ingestion result can promote only one candidate"
            )
        if quarantined:
            candidate_ids = {
                record.candidate_id for record in quarantined
            }
            if len(candidate_ids) != 1:
                raise ValueError(
                    "quarantine records must describe one candidate"
                )
            reason_codes = tuple(
                record.reason_code for record in quarantined
            )
            if len(reason_codes) != len(set(reason_codes)):
                raise ValueError("quarantine reason codes must be unique")
        object.__setattr__(self, "promoted", tuple(promoted))
        object.__setattr__(self, "quarantined", tuple(quarantined))
