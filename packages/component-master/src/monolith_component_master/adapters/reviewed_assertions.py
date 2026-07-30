"""Fail-closed adapter for explicitly reviewed assertion candidates."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from decimal import Decimal
from enum import Enum

from ..evidence import FieldAssertion
from ..ingestion import (
    CandidateRecord,
    IngestionResult,
    QuarantineRecord,
    _QUARANTINE_OWNER_BY_REASON,
    _require_canonical_id,
    _snapshot_candidate,
    _snapshot_iterable,
)


class SourceAuthority(str, Enum):
    OEM = "OEM"
    AUTHORIZED_DISTRIBUTOR = "AUTHORIZED_DISTRIBUTOR"
    OTHER = "OTHER"


class DocumentKind(str, Enum):
    PDF = "PDF"
    CAD = "CAD"
    WEB = "WEB"
    API = "API"
    FEED = "FEED"
    MANUAL = "MANUAL"


class RightsState(str, Enum):
    FACTUAL_INDEXING_ALLOWED = "FACTUAL_INDEXING_ALLOWED"
    UNKNOWN = "UNKNOWN"
    RESTRICTED = "RESTRICTED"
    CONFLICTING = "CONFLICTING"


def _require_enum_value(
    value: object,
    field_name: str,
    enum_type: type[Enum],
) -> str:
    # These enums are exported in adapters.__all__, so a caller is meant to
    # use their members. Normalize a member to its canonical value rather than
    # refusing it, and return the normalized text so the field stores an exact
    # primitive: these are str-subclass enums, and a str subclass could
    # otherwise satisfy this lookup and the later authority/rights comparisons
    # while holding different text.
    if isinstance(value, enum_type):
        normalized = enum_type(value).value
        if type(normalized) is not str:
            raise TypeError(f"{field_name} must be a string")
        return normalized
    if type(value) is not str:
        raise TypeError(f"{field_name} must be a string")
    try:
        enum_type(value)
    except ValueError as error:
        supported = ", ".join(item.value for item in enum_type)
        raise ValueError(
            f"{field_name} must be one of: {supported}"
        ) from error
    return value


@dataclass(frozen=True)
class SourceContext:
    source_id: str
    authority: str
    document_kind: str
    rights_state: str

    def __post_init__(self) -> None:
        _require_canonical_id(self.source_id, "source_id")
        # Store the normalized text, so an accepted enum member never survives
        # as a str subclass inside the record.
        for field_name, enum_type in (
            ("authority", SourceAuthority),
            ("document_kind", DocumentKind),
            ("rights_state", RightsState),
        ):
            object.__setattr__(
                self,
                field_name,
                _require_enum_value(
                    getattr(self, field_name),
                    field_name,
                    enum_type,
                ),
            )


_REASON_ORDER = (
    "REVIEW_REQUIRED",
    "ASSERTION_NOT_VERIFIED",
    "SOURCE_CONTEXT_MISSING",
    "RIGHTS_UNCERTAIN",
    "UNITS_AMBIGUOUS",
    "UNIT_CONFLICT",
    "OEM_DISTRIBUTOR_IDENTITY_CONFLICT",
    "PDF_CAD_GEOMETRY_CONFLICT",
    "REQUIRED_MATING_PART_MISSING",
)
_DIMENSIONAL_PREFIXES = ("dimensions.", "geometry.")
_MATING_REQUIRED_FIELD = "compatibility.requires_mating_part"
_EXACT_MATING_PART_FIELD = "compatibility.exact_mating_part_id"


def _dimension_parts(
    assertion: FieldAssertion,
) -> tuple[str | None, Decimal | None]:
    value = assertion.value
    if not isinstance(value, Mapping):
        return None, None
    unit = value.get("unit")
    if unit not in {"mm", "in"}:
        return None, None
    number = Decimal(str(value["value"]))
    millimetres = number if unit == "mm" else number * Decimal("25.4")
    return unit, millimetres


def _normalized_scalar(value: object) -> object:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (int, float, Decimal)) and not isinstance(value, bool):
        return Decimal(str(value))
    return value


def _group_by_field(
    assertions: Iterable[FieldAssertion],
) -> dict[str, list[FieldAssertion]]:
    grouped: dict[str, list[FieldAssertion]] = {}
    for assertion in assertions:
        grouped.setdefault(assertion.field_path, []).append(assertion)
    return grouped


class ReviewedAssertionAdapter:
    """Evaluate immutable reviewed candidates without publishing or mutation."""

    def __init__(self, source_contexts: Iterable[SourceContext]) -> None:
        supplied = _snapshot_iterable(source_contexts, "source_contexts")
        snapshots: list[SourceContext] = []
        for context in supplied:
            # Exact type plus rebuild, for the same reason as the record
            # snapshots: a subclass could answer the rebuild honestly and a
            # later authority/rights read differently.
            if type(context) is not SourceContext:
                raise TypeError(
                    "source_contexts must contain only SourceContext records"
                )
            snapshots.append(
                SourceContext(
                    source_id=context.source_id,
                    authority=context.authority,
                    document_kind=context.document_kind,
                    rights_state=context.rights_state,
                )
            )
        source_ids = tuple(context.source_id for context in snapshots)
        if len(source_ids) != len(set(source_ids)):
            raise ValueError("duplicate source context")
        self._source_contexts = tuple(snapshots)
        self._contexts_by_source = {
            context.source_id: context for context in snapshots
        }

    def ingest(self, candidate: CandidateRecord) -> IngestionResult:
        # Refuse subclasses and rebuild, so every rule below and the promoted
        # record itself read one immutable record this library constructed.
        candidate = _snapshot_candidate(candidate, "candidate")

        evidence_by_reason: dict[str, set[str]] = {}

        def add_reason(
            reason_code: str,
            evidence: Iterable[str],
        ) -> None:
            evidence_by_reason.setdefault(reason_code, set()).update(evidence)

        all_evidence = tuple(
            assertion.assertion_id
            for assertion in candidate.assertions
        )
        if candidate.extraction_method != "HUMAN_REVIEWED":
            add_reason("REVIEW_REQUIRED", all_evidence)

        pending = tuple(
            assertion.assertion_id
            for assertion in candidate.assertions
            if assertion.review_state != "VERIFIED"
        )
        if pending:
            add_reason("ASSERTION_NOT_VERIFIED", pending)

        missing_context = tuple(
            assertion.assertion_id
            for assertion in candidate.assertions
            if assertion.source_id not in self._contexts_by_source
        )
        if missing_context:
            add_reason("SOURCE_CONTEXT_MISSING", missing_context)

        uncertain_rights = tuple(
            assertion.assertion_id
            for assertion in candidate.assertions
            if (
                (context := self._contexts_by_source.get(assertion.source_id))
                is not None
                and context.rights_state
                != RightsState.FACTUAL_INDEXING_ALLOWED.value
            )
        )
        if uncertain_rights:
            add_reason("RIGHTS_UNCERTAIN", uncertain_rights)

        dimensional = tuple(
            assertion
            for assertion in candidate.assertions
            if assertion.field_path.startswith(_DIMENSIONAL_PREFIXES)
        )
        ambiguous_units = tuple(
            assertion.assertion_id
            for assertion in dimensional
            if _dimension_parts(assertion)[0] is None
        )
        if ambiguous_units:
            add_reason("UNITS_AMBIGUOUS", ambiguous_units)

        for field_assertions in _group_by_field(dimensional).values():
            metric = [
                assertion
                for assertion in field_assertions
                if _dimension_parts(assertion)[0] == "mm"
            ]
            imperial = [
                assertion
                for assertion in field_assertions
                if _dimension_parts(assertion)[0] == "in"
            ]
            if metric and imperial and any(
                _dimension_parts(metric_assertion)[1]
                != _dimension_parts(imperial_assertion)[1]
                for metric_assertion in metric
                for imperial_assertion in imperial
            ):
                add_reason(
                    "UNIT_CONFLICT",
                    (
                        assertion.assertion_id
                        for assertion in (*metric, *imperial)
                    ),
                )

        identity_assertions = tuple(
            assertion
            for assertion in candidate.assertions
            if assertion.field_path.startswith("identity.")
        )
        for field_assertions in _group_by_field(identity_assertions).values():
            oem = [
                assertion
                for assertion in field_assertions
                if (
                    (context := self._contexts_by_source.get(
                        assertion.source_id
                    ))
                    is not None
                    and context.authority == SourceAuthority.OEM.value
                )
            ]
            distributor = [
                assertion
                for assertion in field_assertions
                if (
                    (context := self._contexts_by_source.get(
                        assertion.source_id
                    ))
                    is not None
                    and context.authority
                    == SourceAuthority.AUTHORIZED_DISTRIBUTOR.value
                )
            ]
            if oem and distributor and any(
                _normalized_scalar(oem_assertion.value)
                != _normalized_scalar(distributor_assertion.value)
                for oem_assertion in oem
                for distributor_assertion in distributor
            ):
                add_reason(
                    "OEM_DISTRIBUTOR_IDENTITY_CONFLICT",
                    (
                        assertion.assertion_id
                        for assertion in (*oem, *distributor)
                    ),
                )

        geometry_assertions = tuple(
            assertion
            for assertion in candidate.assertions
            if assertion.field_path.startswith("geometry.")
            and _dimension_parts(assertion)[0] is not None
        )
        for field_assertions in _group_by_field(geometry_assertions).values():
            pdf = [
                assertion
                for assertion in field_assertions
                if (
                    (context := self._contexts_by_source.get(
                        assertion.source_id
                    ))
                    is not None
                    and context.document_kind == DocumentKind.PDF.value
                )
            ]
            cad = [
                assertion
                for assertion in field_assertions
                if (
                    (context := self._contexts_by_source.get(
                        assertion.source_id
                    ))
                    is not None
                    and context.document_kind == DocumentKind.CAD.value
                )
            ]
            if pdf and cad and any(
                _dimension_parts(pdf_assertion)[1]
                != _dimension_parts(cad_assertion)[1]
                for pdf_assertion in pdf
                for cad_assertion in cad
            ):
                add_reason(
                    "PDF_CAD_GEOMETRY_CONFLICT",
                    (
                        assertion.assertion_id
                        for assertion in (*pdf, *cad)
                    ),
                )

        # The requirement follows the normalized marker, never a hardcoded
        # entity_kind literal: entity_kind is deliberately open in Task 7, so a
        # literal gate silently promotes every unlisted spelling. Entity kinds
        # that cannot need a mating part simply do not carry the marker.
        required_markers = tuple(
            assertion
            for assertion in candidate.assertions
            if assertion.field_path == _MATING_REQUIRED_FIELD
            and assertion.value is True
        )
        mating_ids = tuple(
            assertion
            for assertion in candidate.assertions
            if assertion.field_path == _EXACT_MATING_PART_FIELD
            and isinstance(assertion.value, str)
            and assertion.value.strip()
        )
        if required_markers and not mating_ids:
            add_reason(
                "REQUIRED_MATING_PART_MISSING",
                (
                    assertion.assertion_id
                    for assertion in required_markers
                ),
            )

        if evidence_by_reason:
            quarantined = tuple(
                QuarantineRecord(
                    candidate_id=candidate.candidate_id,
                    reason_code=reason_code,
                    evidence_ids=tuple(evidence_by_reason[reason_code]),
                    owner_role=_QUARANTINE_OWNER_BY_REASON[reason_code],
                )
                for reason_code in _REASON_ORDER
                if reason_code in evidence_by_reason
            )
            return IngestionResult(promoted=(), quarantined=quarantined)

        return IngestionResult(promoted=(candidate,), quarantined=())
