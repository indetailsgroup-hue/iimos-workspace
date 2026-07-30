"""Immutable records for reviewed candidate ingestion and quarantine."""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Set as AbstractSet
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
_ADMITTED_VALUE_TYPES = frozenset({type(None), bool, int, float, str})
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


def _require_text(value: object, field_name: str) -> str:
    """Require an exact ``str``, allowing blank.

    A ``str`` subclass is rejected because every text field here is later
    compared: a subclass can override ``__eq__``/``__ne__`` and make a stored
    review state, field path, brand, or owner role answer a comparison
    differently from the text the record actually holds.
    """

    if type(value) is not str:
        raise TypeError(f"{field_name} must be a string")
    return value


def _require_string(value: object, field_name: str) -> str:
    text = _require_text(value, field_name)
    if not text.strip():
        raise ValueError(f"{field_name} must not be blank")
    return text


def _require_canonical_id(value: object, field_name: str) -> str:
    identifier = _require_string(value, field_name)
    if _CANONICAL_ID_PATTERN.fullmatch(identifier) is None:
        raise ValueError(f"{field_name} must be a canonical colon-delimited ID")
    return identifier


def _snapshot_value(value: object, field_name: str) -> object:
    """Return an immutable primitive snapshot, or refuse the value outright.

    Assertion values are carried by the documented JSON/JSONL contract, so the
    admitted set is exactly the value types that contract can represent: null,
    boolean, finite number, string, object with string keys, and array.

    Containers are rebuilt into immutable equivalents, so a container subclass
    cannot smuggle its own behaviour into a stored record. Scalars are kept by
    value, so they are admitted by exact type only: a subclass can carry mutable
    state, and it can override ``__str__``, which would let the magnitude a
    conflict rule normalizes disagree with the magnitude the record stores.
    """

    if isinstance(value, Mapping):
        snapshot: dict[str, object] = {}
        for key, item in value.items():
            if type(key) is not str:
                raise TypeError(f"{field_name} keys must be strings")
            snapshot[key] = _snapshot_value(item, f"{field_name}.{key}")
        return MappingProxyType(snapshot)
    if isinstance(value, AbstractSet):
        raise TypeError(
            f"{field_name} must not be an unordered collection"
        )
    if isinstance(value, (list, tuple)):
        return tuple(
            _snapshot_value(item, f"{field_name}[{index}]")
            for index, item in enumerate(value)
        )
    if type(value) not in _ADMITTED_VALUE_TYPES:
        raise TypeError(
            f"{field_name} must be exactly None, bool, int, float, str, an "
            f"object with string keys, or an array, "
            f"not {type(value).__name__}"
        )
    if isinstance(value, float) and not math.isfinite(value):
        raise ValueError(f"{field_name} must be finite")
    return value


def _snapshot_iterable(
    value: object,
    field_name: str,
) -> tuple[object, ...]:
    if isinstance(value, (str, bytes, bytearray, Mapping)):
        raise TypeError(f"{field_name} must be an iterable of records")
    if isinstance(value, AbstractSet):
        raise TypeError(
            f"{field_name} must be an ordered iterable, not an unordered "
            "collection: stored record order is observable output"
        )
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


def _validate_assertion_value(field_path: str, value: object) -> None:
    if field_path.startswith(_DIMENSIONAL_PREFIXES):
        if not isinstance(value, Mapping):
            raise TypeError(
                f"{field_path} must be an object with value and unit"
            )
        if "value" not in value:
            raise ValueError(f"{field_path} must contain value")
        _validate_numeric(value["value"], f"{field_path}.value")
        if "unit" in value and not isinstance(value["unit"], str):
            raise TypeError(f"{field_path}.unit must be a string")
        return

    if field_path.startswith("identity."):
        if isinstance(value, bool) or not isinstance(
            value, (str, int, float, Decimal)
        ):
            raise TypeError(f"{field_path} must be a scalar value")
        if isinstance(value, str) and not value.strip():
            raise ValueError(f"{field_path} must not be blank")
        if isinstance(value, (int, float, Decimal)):
            _validate_numeric(value, field_path)
        return

    if field_path == _MATING_REQUIRED_FIELD:
        if not isinstance(value, bool):
            raise TypeError(f"{_MATING_REQUIRED_FIELD} must be a boolean")
        return

    if field_path == _EXACT_MATING_PART_FIELD:
        if not isinstance(value, str):
            raise TypeError(f"{_EXACT_MATING_PART_FIELD} must be a string")


def _snapshot_assertion(assertion: object) -> FieldAssertion:
    if not isinstance(assertion, FieldAssertion):
        raise TypeError("assertions must contain only FieldAssertion records")
    _require_canonical_id(assertion.assertion_id, "assertion_id")
    _require_canonical_id(assertion.source_id, "source_id")
    _require_string(assertion.entity_id, "entity_id")
    _require_string(assertion.field_path, "field_path")
    _require_string(assertion.review_state, "review_state")
    _require_text(assertion.locator, "locator")
    _require_text(assertion.reviewer, "reviewer")
    if _FIELD_PATH_PATTERN.fullmatch(assertion.field_path) is None:
        raise ValueError("field_path must use normalized lower-case dotted segments")
    # Snapshot before validating so every rule inspects the exact value the
    # record stores, never a caller object that could answer differently later.
    value = _snapshot_value(assertion.value, assertion.field_path)
    _validate_assertion_value(assertion.field_path, value)
    return FieldAssertion(
        assertion_id=assertion.assertion_id,
        entity_id=assertion.entity_id,
        field_path=assertion.field_path,
        value=value,
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


def _snapshot_candidate(value: object, field_name: str) -> CandidateRecord:
    """Rebuild a candidate from an exact instance of this library's own class.

    ``isinstance`` is not enough. A subclass can override ``__getattribute__``
    and answer one way while a rule inspects it, then another way once a
    consumer reads the stored record, which would make the review-state,
    brand, and mating-part checks bypassable one level up. Requiring exact type
    identity and rebuilding gives the consumer a record this library
    constructed and validated, decoupled from the caller's instance.
    """

    if type(value) is not CandidateRecord:
        raise TypeError(f"{field_name} must be exactly a CandidateRecord")
    return CandidateRecord(
        candidate_id=value.candidate_id,
        brand_id=value.brand_id,
        entity_kind=value.entity_kind,
        assertions=value.assertions,
        extraction_method=value.extraction_method,
    )


def _snapshot_quarantine(value: object, field_name: str) -> QuarantineRecord:
    """Rebuild a quarantine record, refusing subclasses. See above."""

    if type(value) is not QuarantineRecord:
        raise TypeError(f"{field_name} must be exactly a QuarantineRecord")
    return QuarantineRecord(
        candidate_id=value.candidate_id,
        reason_code=value.reason_code,
        evidence_ids=value.evidence_ids,
        owner_role=value.owner_role,
    )


@dataclass(frozen=True)
class IngestionResult:
    promoted: tuple[CandidateRecord, ...]
    quarantined: tuple[QuarantineRecord, ...]

    def __post_init__(self) -> None:
        promoted = tuple(
            _snapshot_candidate(item, "promoted")
            for item in _snapshot_iterable(self.promoted, "promoted")
        )
        quarantined = tuple(
            _snapshot_quarantine(item, "quarantined")
            for item in _snapshot_iterable(self.quarantined, "quarantined")
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
