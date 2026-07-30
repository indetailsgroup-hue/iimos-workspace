"""Measured coverage ledger over a connector-registry root.

This module publishes what a registry root currently holds. It does not decide
what belongs in the registry and it does not populate it. It grants no
manufacturing, freeze, export or production authority.

Three rules shape every record here, and each one exists because omitting it
would let a release read as more than it is.

1. **Every count carries its denominator.** :class:`MeasuredCount` cannot be
   constructed without one, together with the function or field that produced
   it. "12 verified" is not a coverage claim; "12 of 331, measured by X" is.
2. **Silence is never a classification.** A discovered item that no rule
   classifies is recorded in :class:`UnclassifiedItem` and named, never
   dropped. A source that could not be read is recorded in
   :class:`BlockedSource` and named, never dropped.
3. **Evidence dimensions stay separate.** The ten
   :class:`~monolith_component_master.registry_models.VerificationDimension`
   values are counted independently. No blended score exists, because a single
   number would misrepresent all ten.

Documented local input contract for a registry root
---------------------------------------------------

``evidence-manifest.jsonl`` is the source manifest. Each nonblank line is a
:class:`~monolith_component_master.evidence.SourceSnapshot` object, optionally
carrying ``content_path`` (a path relative to the root holding the exact stored
bytes) and ``blocked_reason`` (free text naming why the source is unavailable).

Two further filenames are **denominator input, not coverage items**, and are
recognized **at the registry root only**: ``brand-universe.jsonl`` and
``source-denominator.jsonl`` (:data:`DENOMINATOR_INPUT_FILENAMES`). They are
matched by exact filename, never by pattern — a pattern such as
``*-denominator.jsonl`` would silently swallow files that do not exist yet.
Either name in a subdirectory is refused as ambiguous, exactly as a nested
``evidence-manifest.jsonl`` is. Neither contributes to
``discovered_item_count``.

``source-denominator.jsonl`` declares sources whose bytes this reader does not
hold. Each nonblank line holds exactly ``source_id``, ``sha256``, ``state`` and
``blocked_reason``; it becomes one :class:`SourceDenominatorEntry` and one
matching :class:`BlockedSource`. ``state`` must be ``BLOCKED``: this reader
cannot re-hash a source it never read, and
:attr:`CoverageSnapshot.coverage_statement` publishes a ``REGISTERED`` source
as "readable and hash-verified". A source whose bytes belong in a release is
declared in ``evidence-manifest.jsonl`` with a ``content_path``. Any other
field, any missing field, any other state, and any source ID already named by
the manifest are each refused with the file and line.

``brand-universe.jsonl`` is recognized so it is never read as item data, and a
zero-record file contributes nothing. A **nonblank** row is refused: this
package holds no brand record type to validate one against and
:class:`CoverageSnapshot` has no field to carry one, so an accepted row could
only be discarded — and discarding is silence. Defining that row schema, and
the field that would carry it, is Task 9's decision, not a shape this reader
guesses.

Every other ``*.jsonl`` file under the root, **at any depth**, is a
coverage-item file. Each nonblank line is an object with ``item_id``,
``classification``, ``dimension_states`` and ``assertions`` — the last being
:class:`~monolith_component_master.evidence.FieldAssertion` objects in the same
shape Task 7's ingestion CLI already reads. An unrecognized ``*.jsonl``
therefore still fails loudly, at the root and at any depth; nothing is skipped
silently.

Discovery recurses. There is exactly one excluded directory, ``_source-cache``,
which holds the stored source bytes ``content_path`` points at and is declared
in the registry root's own ``.gitignore``. Nothing else is skipped, so a file
added in a subdirectory later is measured rather than silently omitted — an
unmeasured file would be silence, and silence is not a classification. An
``evidence-manifest.jsonl`` anywhere other than the root is refused as
ambiguous rather than guessed at.

One recorded boundary of that recursion: ``Path.rglob`` does not follow
directory symlinks on this Python, so item files reachable only through a
symlinked subdirectory would go unmeasured. That case is unexplored, not
handled.

All five seed files in ``data/component-master/registry/v1`` are zero-record
today, so this contract reinterprets no existing data.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
import json
import math
from pathlib import Path
from types import MappingProxyType

from .evidence import (
    EvidenceVault,
    FieldAssertion,
    SourceSnapshot,
    verify_source_hash,
)
from .ingestion import (
    _require_canonical_id,
    _require_string,
    _require_text,
    _snapshot_assertion,
    _snapshot_iterable,
)
from .registry_models import VerificationDimension, VerificationState


# Sourced from the approved design, section 14 "Coverage contract": every
# discovered item must be assigned one of these seven states.
CLASSIFICATION_STATES: tuple[str, ...] = (
    "DISCONTINUED",
    "OUT_OF_SCOPE_WITH_REASON",
    "PENDING",
    "REGION_ONLY",
    "SOURCE_BLOCKED",
    "SUPERSEDED",
    "VERIFIED",
)

# Sourced from registry_models.VerificationDimension, itself sourced from the
# approved design section 8. Counted separately, never merged.
VERIFICATION_DIMENSIONS: tuple[str, ...] = tuple(
    dimension.value for dimension in VerificationDimension
)

VERIFICATION_STATES: tuple[str, ...] = tuple(
    state.value for state in VerificationState
)

SOURCE_MANIFEST_FILENAME = "evidence-manifest.jsonl"
# Declared in data/component-master/registry/v1/.gitignore as `/_source-cache/`.
SOURCE_CACHE_DIRNAME = "_source-cache"
SNAPSHOT_SCHEMA = "monolith.connector-registry.coverage-snapshot/1"

BRAND_UNIVERSE_FILENAME = "brand-universe.jsonl"
SOURCE_DENOMINATOR_FILENAME = "source-denominator.jsonl"

# Denominator input, not coverage items. Exact filenames, never a pattern: a
# pattern would exempt files that do not exist yet, and an unrecognized
# `.jsonl` must keep failing loudly rather than vanishing. Recognized at the
# registry root only — the same rule that refuses a nested manifest.
DENOMINATOR_INPUT_FILENAMES: tuple[str, ...] = (
    BRAND_UNIVERSE_FILENAME,
    SOURCE_DENOMINATOR_FILENAME,
)

# The complete row contract for `source-denominator.jsonl`. `blocked_reason` is
# reused verbatim from `evidence-manifest.jsonl`, where it already names why a
# source is unavailable; the other three are exactly SourceDenominatorEntry.
DECLARED_DENOMINATOR_REQUIRED_FIELDS: tuple[str, ...] = (
    "sha256",
    "source_id",
    "state",
)
DECLARED_DENOMINATOR_FIELDS: tuple[str, ...] = tuple(
    sorted(DECLARED_DENOMINATOR_REQUIRED_FIELDS + ("blocked_reason",))
)

UNCLASSIFIED_REASONS: tuple[str, ...] = (
    "CLASSIFICATION_ABSENT",
    "CLASSIFICATION_UNRECOGNIZED",
)

SOURCE_DENOMINATOR_STATES: tuple[str, ...] = ("BLOCKED", "REGISTERED")

# Closed allowlist of reasons a claim of VERIFIED could not be traced back to a
# registered source with a verified hash.
#
# Which surface can produce which reason is **derived, not asserted here**. The
# two tuples below are checked by
# ``tests.component_master.registry.test_release.GateReasonReachabilityTests``,
# which drives every reason and asserts which surface produced it. An earlier
# hand-maintained version of this comment was wrong twice; the derivation
# exists so it cannot drift from the code again.
EVIDENCE_GATE_REASONS: tuple[str, ...] = (
    "ASSERTION_DOES_NOT_MATCH_VAULT",
    "ASSERTION_NOT_REGISTERED",
    "ASSERTION_NOT_VERIFIED",
    "ASSERTION_VALUE_NOT_CANONICALIZABLE",
    "MISSING_ASSERTION",
    "SOURCE_BLOCKED_IN_MANIFEST",
    "SOURCE_BYTES_UNAVAILABLE",
    "SOURCE_HASH_MISMATCH",
    "SOURCE_NOT_REGISTERED",
)

# Derived by GateReasonReachabilityTests, which constructs a registry root or a
# gate call for each entry and collects the reason it produced.
#
# Read these as **demonstrated** sets, not as possibility sets. Membership is
# measured. Absence is not a proof of impossibility: it means no case in that
# test produced the reason on that surface. In particular
# ``ASSERTION_NOT_REGISTERED`` is listed as direct-call-only because no
# discovery case has produced it — the denominator branch runs first, so
# reaching the vault lookup needs a REGISTERED source, and with one registered
# ``EvidenceVault.register`` refuses only a duplicate ``assertion_id``, which
# discovery refuses earlier. That is a reasoned argument, not a proof.
GATE_REASONS_DEMONSTRATED_THROUGH_DISCOVERY: tuple[str, ...] = (
    "ASSERTION_NOT_VERIFIED",
    "MISSING_ASSERTION",
    "SOURCE_BLOCKED_IN_MANIFEST",
    "SOURCE_BYTES_UNAVAILABLE",
    "SOURCE_HASH_MISMATCH",
    "SOURCE_NOT_REGISTERED",
)
GATE_REASONS_DEMONSTRATED_ONLY_BY_DIRECT_GATE_CALL: tuple[str, ...] = (
    "ASSERTION_DOES_NOT_MATCH_VAULT",
    "ASSERTION_NOT_REGISTERED",
    "ASSERTION_VALUE_NOT_CANONICALIZABLE",
)

# A blocked source states why it is blocked. Mapping it here keeps the gate
# reason specific instead of collapsing every source failure into the vault's
# single refusal.
_BLOCKED_REASON_TO_GATE_REASON: Mapping[str, str] = MappingProxyType(
    {
        "SOURCE_CONTENT_ABSENT": "SOURCE_BYTES_UNAVAILABLE",
        "SOURCE_CONTENT_UNREADABLE": "SOURCE_BYTES_UNAVAILABLE",
        "SOURCE_HASH_MISMATCH": "SOURCE_HASH_MISMATCH",
    }
)

_ADMITTED_VALUE_TYPES = frozenset({type(None), bool, int, float, str})
_MEASURED_BY_DISCOVERY = "coverage.discover_registry_root"
_MEASURED_BY_GATE = "coverage.evaluate_evidence_gate"


def canonical_value(value: object, field_name: str) -> object:
    """Return an immutable snapshot, or refuse the value outright.

    The admitted set is exactly what the documented JSON/JSONL contract can
    represent: null, boolean, finite number, string, object with string keys,
    and array. Containers are rebuilt into immutable equivalents so a container
    subclass cannot smuggle its own behaviour into a published record. Scalars
    are admitted by exact type, because a subclass can override ``__str__`` or
    ``__eq__`` and make the value a rule inspected disagree with the value the
    release publishes.

    Unordered collections are refused rather than sorted. Record order is
    observable in the released bytes, and a best-effort ordering would pass a
    single-process test and change in the field.
    """

    if isinstance(value, Mapping):
        snapshot: dict[str, object] = {}
        for key, item in value.items():
            if type(key) is not str:
                raise TypeError(f"{field_name} keys must be strings")
            snapshot[key] = canonical_value(item, f"{field_name}.{key}")
        return MappingProxyType(snapshot)
    if isinstance(value, (set, frozenset)):
        raise TypeError(f"{field_name} must not be an unordered collection")
    if isinstance(value, (list, tuple)):
        return tuple(
            canonical_value(item, f"{field_name}[{index}]")
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


def _require_exact_int(value: object, field_name: str) -> int:
    if isinstance(value, bool) or type(value) is not int:
        raise TypeError(f"{field_name} must be an integer")
    if value < 0:
        raise ValueError(f"{field_name} must not be negative")
    return value


def _require_member(value: object, field_name: str, allowed: tuple[str, ...]) -> str:
    text = _require_string(value, field_name)
    if text not in allowed:
        raise ValueError(
            f"{field_name} must be one of: " + ", ".join(allowed)
        )
    return text


def _require_enum_text(
    value: object,
    field_name: str,
    allowed: tuple[str, ...],
    enum_type: type,
) -> str:
    if isinstance(value, enum_type):
        normalized = value.value
        if type(normalized) is not str:
            raise TypeError(f"{field_name} must be a string")
        return _require_member(normalized, field_name, allowed)
    return _require_member(value, field_name, allowed)


def _require_sha256(value: object, field_name: str) -> str:
    text = _require_string(value, field_name)
    if len(text) != 64 or any(
        character not in "0123456789abcdef" for character in text
    ):
        raise ValueError(
            f"{field_name} must be exactly 64 lowercase hexadecimal characters"
        )
    return text


@dataclass(frozen=True)
class MeasuredCount:
    """A count that cannot exist without its denominator and its derivation."""

    label: str
    count: int
    denominator: int
    denominator_label: str
    measured_by: str

    def __post_init__(self) -> None:
        _require_string(self.label, "label")
        _require_string(self.denominator_label, "denominator_label")
        _require_string(self.measured_by, "measured_by")
        _require_exact_int(self.count, "count")
        _require_exact_int(self.denominator, "denominator")
        if self.count > self.denominator:
            raise ValueError(
                f"{self.label} count {self.count} exceeds denominator "
                f"{self.denominator}"
            )

    def as_payload(self) -> Mapping[str, object]:
        return MappingProxyType(
            {
                "count": self.count,
                "denominator": self.denominator,
                "denominator_label": self.denominator_label,
                "label": self.label,
                "measured_by": self.measured_by,
            }
        )


@dataclass(frozen=True)
class BlockedSource:
    """A source that could not be read. A visible gap, never an absence."""

    source_id: str
    reason: str

    def __post_init__(self) -> None:
        _require_canonical_id(self.source_id, "source_id")
        _require_string(self.reason, "reason")

    def as_payload(self) -> Mapping[str, object]:
        return MappingProxyType(
            {"reason": self.reason, "source_id": self.source_id}
        )


@dataclass(frozen=True)
class UnclassifiedItem:
    """A discovered item that no rule classified. Named, never dropped."""

    item_id: str
    origin: str
    reason: str

    def __post_init__(self) -> None:
        _require_string(self.item_id, "item_id")
        _require_string(self.origin, "origin")
        _require_member(self.reason, "reason", UNCLASSIFIED_REASONS)

    def as_payload(self) -> Mapping[str, object]:
        return MappingProxyType(
            {
                "item_id": self.item_id,
                "origin": self.origin,
                "reason": self.reason,
            }
        )


@dataclass(frozen=True)
class SourceDenominatorEntry:
    """One source in the measured denominator, with its registered digest."""

    source_id: str
    sha256: str
    state: str

    def __post_init__(self) -> None:
        _require_canonical_id(self.source_id, "source_id")
        _require_sha256(self.sha256, "sha256")
        _require_member(self.state, "state", SOURCE_DENOMINATOR_STATES)

    def as_payload(self) -> Mapping[str, object]:
        return MappingProxyType(
            {
                "sha256": self.sha256,
                "source_id": self.source_id,
                "state": self.state,
            }
        )


@dataclass(frozen=True)
class EvidenceGateFinding:
    """One reason a claim of VERIFIED could not reach a release."""

    item_id: str
    assertion_id: str
    reason: str

    def __post_init__(self) -> None:
        _require_canonical_id(self.item_id, "item_id")
        _require_member(self.reason, "reason", EVIDENCE_GATE_REASONS)
        assertion_id = _require_text(self.assertion_id, "assertion_id")
        # Both directions, because the backing floor keys its two exemption
        # sets on these fields. Without the converse, one finding would land in
        # the by-item set through its reason and in the by-assertion set
        # through its ID, covering both refusal shapes at once.
        if self.reason == "MISSING_ASSERTION":
            if assertion_id.strip():
                raise ValueError(
                    "MISSING_ASSERTION must carry a blank assertion_id: it "
                    "names an item that has no assertion to name"
                )
        else:
            _require_canonical_id(assertion_id, "assertion_id")

    def as_payload(self) -> Mapping[str, object]:
        return MappingProxyType(
            {
                "assertion_id": self.assertion_id,
                "item_id": self.item_id,
                "reason": self.reason,
            }
        )

    def _order(self) -> tuple[str, str, str]:
        return (self.item_id, self.assertion_id, self.reason)


def _snapshot_dimension_states(value: object) -> Mapping[str, str]:
    if not isinstance(value, Mapping):
        raise TypeError("dimension_states must be a mapping")
    states: dict[str, str] = {}
    for key, state in value.items():
        dimension = _require_enum_text(
            key,
            "dimension_states key",
            VERIFICATION_DIMENSIONS,
            VerificationDimension,
        )
        if dimension in states:
            raise ValueError(f"duplicate dimension_states key: {dimension}")
        states[dimension] = _require_enum_text(
            state,
            f"dimension_states[{dimension}]",
            VERIFICATION_STATES,
            VerificationState,
        )
    missing = tuple(
        dimension
        for dimension in VERIFICATION_DIMENSIONS
        if dimension not in states
    )
    if missing:
        raise ValueError(
            "dimension_states must state every verification dimension "
            "explicitly; missing: " + ", ".join(missing)
        )
    return MappingProxyType({key: states[key] for key in sorted(states)})


@dataclass(frozen=True)
class CoverageItem:
    """One classified registry item and the assertions that back it."""

    item_id: str
    classification: str
    dimension_states: Mapping[str, str]
    assertions: tuple[FieldAssertion, ...]

    def __post_init__(self) -> None:
        _require_canonical_id(self.item_id, "item_id")
        _require_member(
            self.classification, "classification", CLASSIFICATION_STATES
        )
        object.__setattr__(
            self,
            "dimension_states",
            _snapshot_dimension_states(self.dimension_states),
        )

        supplied = _snapshot_iterable(self.assertions, "assertions")
        # Rebuild from library-built types: an exact-type snapshot decouples
        # the published record from a caller instance that could answer one way
        # during inspection and another way afterwards.
        snapshots = tuple(
            _snapshot_assertion(assertion) for assertion in supplied
        )
        identifiers = tuple(
            assertion.assertion_id for assertion in snapshots
        )
        if len(identifiers) != len(set(identifiers)):
            raise ValueError("duplicate assertion_id")
        for assertion in snapshots:
            if assertion.entity_id != self.item_id:
                raise ValueError(
                    "assertion entity_id must match item_id"
                )
        object.__setattr__(
            self,
            "assertions",
            tuple(
                sorted(snapshots, key=lambda item: item.assertion_id)
            ),
        )

    @property
    def assertion_ids(self) -> tuple[str, ...]:
        return tuple(assertion.assertion_id for assertion in self.assertions)

    @property
    def source_ids(self) -> tuple[str, ...]:
        return tuple(
            sorted({assertion.source_id for assertion in self.assertions})
        )

    @property
    def claims_verified(self) -> bool:
        return self.classification == "VERIFIED" or any(
            state == VerificationState.VERIFIED.value
            for state in self.dimension_states.values()
        )

    def as_payload(self, *, evidence_backed: bool) -> Mapping[str, object]:
        return MappingProxyType(
            {
                "assertion_ids": tuple(self.assertion_ids),
                "classification": self.classification,
                "dimension_states": MappingProxyType(
                    dict(self.dimension_states)
                ),
                "evidence_backed": bool(evidence_backed),
                "item_id": self.item_id,
                "source_ids": tuple(self.source_ids),
            }
        )


def _snapshot_exact(value: object, expected: type, field_name: str) -> object:
    if type(value) is not expected:
        raise TypeError(
            f"{field_name} must be exactly a {expected.__name__}"
        )
    return value


def evaluate_evidence_gate(
    items: object,
    vault: EvidenceVault,
    source_bytes: Mapping[str, bytes],
    *,
    source_denominator: object = None,
    blocked_sources: object = (),
) -> tuple[EvidenceGateFinding, ...]:
    """Refuse every claim of VERIFIED that is not traceable to a source.

    This is the Task 7 carry-forward. ``FieldAssertion.review_state`` is a state
    check, not a provenance check: a caller can declare ``VERIFIED`` against a
    ``source_id`` that exists nowhere. This gate resolves each claim through
    :class:`~monolith_component_master.evidence.EvidenceVault` and re-verifies
    the digest through
    :func:`~monolith_component_master.evidence.verify_source_hash`, so an
    unbacked claim cannot be counted as verified in a release.

    ``evidence.py`` is consumed, never modified. It admits ``Decimal``,
    ``bytearray``, ``frozenset`` and non-finite ``float`` assertion values that
    ``CandidateRecord`` refuses. Task 8 does not reconcile that. It states its
    own behaviour instead: such a value is not canonicalizable, so the claim is
    refused as ``ASSERTION_VALUE_NOT_CANONICALIZABLE`` and cannot be counted.

    When ``source_denominator`` is supplied, source-side failures are diagnosed
    from the measured denominator before the vault is consulted, so a blocked,
    unreadable, hash-mismatched or entirely unnamed source each names itself.
    Without it the gate falls back to vault-only resolution, which is sound but
    reports every source-side failure as ``ASSERTION_NOT_REGISTERED``, because
    ``EvidenceVault`` refuses to store a ``VERIFIED`` assertion whose source is
    not already registered.
    """

    if not isinstance(vault, EvidenceVault):
        raise TypeError("vault must be an EvidenceVault")
    if not isinstance(source_bytes, Mapping):
        raise TypeError("source_bytes must be a mapping")

    source_states: dict[str, str] | None = None
    if source_denominator is not None:
        source_states = {}
        for entry in _snapshot_iterable(
            source_denominator, "source_denominator"
        ):
            _snapshot_exact(entry, SourceDenominatorEntry, "source_denominator")
            source_states[entry.source_id] = entry.state
    blocked_reasons: dict[str, str] = {}
    for record in _snapshot_iterable(blocked_sources, "blocked_sources"):
        _snapshot_exact(record, BlockedSource, "blocked_sources")
        blocked_reasons[record.source_id] = record.reason

    findings: list[EvidenceGateFinding] = []
    for item in _snapshot_iterable(items, "items"):
        _snapshot_exact(item, CoverageItem, "items")
        if not item.claims_verified:
            continue
        if not item.assertions:
            findings.append(
                EvidenceGateFinding(
                    item_id=item.item_id,
                    assertion_id="",
                    reason="MISSING_ASSERTION",
                )
            )
            continue
        for claimed in item.assertions:
            reason = _gate_assertion(
                claimed, vault, source_bytes, source_states, blocked_reasons
            )
            if reason is not None:
                findings.append(
                    EvidenceGateFinding(
                        item_id=item.item_id,
                        assertion_id=claimed.assertion_id,
                        reason=reason,
                    )
                )
    unique = {finding._order(): finding for finding in findings}
    return tuple(unique[key] for key in sorted(unique))


def _gate_assertion(
    claimed: FieldAssertion,
    vault: EvidenceVault,
    source_bytes: Mapping[str, bytes],
    source_states: Mapping[str, str] | None,
    blocked_reasons: Mapping[str, str],
) -> str | None:
    if source_states is not None:
        # Diagnosed from the measured denominator first. The vault's own
        # refusal carries no reason, so resolving the source here is what keeps
        # a blocked source distinguishable from a hash mismatch.
        state = source_states.get(claimed.source_id)
        if state is None:
            return "SOURCE_NOT_REGISTERED"
        if state != "REGISTERED":
            return _BLOCKED_REASON_TO_GATE_REASON.get(
                blocked_reasons.get(claimed.source_id, ""),
                "SOURCE_BLOCKED_IN_MANIFEST",
            )

    registered = vault.get_assertion(claimed.assertion_id)
    if registered is None:
        return "ASSERTION_NOT_REGISTERED"
    if registered.review_state != "VERIFIED":
        return "ASSERTION_NOT_VERIFIED"
    try:
        registered_value = canonical_value(registered.value, "value")
    except (TypeError, ValueError):
        return "ASSERTION_VALUE_NOT_CANONICALIZABLE"
    if (
        registered.entity_id != claimed.entity_id
        or registered.field_path != claimed.field_path
        or registered.source_id != claimed.source_id
        or registered.locator != claimed.locator
        or registered.reviewer != claimed.reviewer
        or registered_value != claimed.value
    ):
        return "ASSERTION_DOES_NOT_MATCH_VAULT"
    # Defence in depth. Unreachable while `EvidenceVault` keeps its own
    # invariant (evidence.py:148-154 refuses to store a VERIFIED assertion
    # whose source is not registered), and kept because the gate must not
    # depend on another module's invariant holding.
    source = vault.get_source(registered.source_id)
    if source is None:
        return "SOURCE_NOT_REGISTERED"
    content = source_bytes.get(registered.source_id)
    if content is None:
        return "SOURCE_BYTES_UNAVAILABLE"
    if not verify_source_hash(source, content):
        return "SOURCE_HASH_MISMATCH"
    return None


def _require_backed_verified_claims(
    items: tuple[CoverageItem, ...],
    denominator: tuple[SourceDenominatorEntry, ...],
    findings: tuple[EvidenceGateFinding, ...],
) -> None:
    """Refuse a snapshot in which a claim of VERIFIED is not backed.

    Calling :func:`evaluate_evidence_gate` is what ``build_snapshot`` does; a
    convention is not a gate. The snapshot already holds the items and the
    measured source denominator, so it enforces the floor itself and an
    unbacked claim cannot reach a release through any caller.

    Three shapes are refused: a record claiming VERIFIED with no assertion at
    all; a record carrying an assertion that is not itself ``VERIFIED``; and a
    record whose assertion names a source the denominator does not hold in a
    ``REGISTERED`` state. Each mirrors a refusal
    :func:`evaluate_evidence_gate` already makes, so the two enforcement points
    in this module answer the same question the same way.

    The exemption is deliberately narrow. A finding permits a claim only when
    it names **that** item, and for the per-assertion shapes only when it also
    names **that** assertion. ``EvidenceGateFinding`` enforces that a
    ``MISSING_ASSERTION`` finding carries a blank assertion ID and that every
    other reason carries a canonical one, so a single finding cannot land in
    both exemption sets and cover both shapes at once.

    Stated limits, none of which this floor can close on its own:

    - It holds no source bytes, so it cannot re-verify a digest. A caller who
      hand-builds a denominator entry claiming ``REGISTERED`` for a source that
      was never read will pass it. Full verification is
      :func:`evaluate_evidence_gate`, which re-hashes through
      :func:`~monolith_component_master.evidence.verify_source_hash`.
    - It does not cross-check ``blocked_sources`` against
      ``source_denominator``: a hand-built denominator claiming ``REGISTERED``
      for a source the blocked list also names is accepted. Unreachable through
      :func:`discover_registry_root`, where a blocked source is always written
      with state ``BLOCKED``.
    - ``CoverageItem`` carries no mapping from an assertion to the dimension it
      backs, so "every assertion of a record claiming VERIFIED must itself be
      VERIFIED" is as fine-grained as this contract can express. A future task
      that wants per-dimension backing must add that mapping first.
    """

    registered = frozenset(
        entry.source_id
        for entry in denominator
        if entry.state == "REGISTERED"
    )
    exempt_items = frozenset(
        finding.item_id
        for finding in findings
        if finding.reason == "MISSING_ASSERTION"
    )
    exempt_assertions = frozenset(
        (finding.item_id, finding.assertion_id)
        for finding in findings
        if finding.assertion_id.strip()
    )

    unbacked: list[str] = []
    for item in items:
        if not item.claims_verified:
            continue
        if not item.assertions:
            if item.item_id not in exempt_items:
                unbacked.append(
                    f"{item.item_id} claims VERIFIED with no assertion"
                )
            continue
        for assertion in item.assertions:
            if (item.item_id, assertion.assertion_id) in exempt_assertions:
                continue
            # An assertion nobody has reviewed is not backing. The gate already
            # refuses this shape as ASSERTION_NOT_VERIFIED, and two enforcement
            # points in one module must not answer the same question
            # differently. Unlike the digest, `review_state` is an attribute of
            # the assertions this floor is already iterating.
            if assertion.review_state != "VERIFIED":
                unbacked.append(
                    f"{item.item_id} assertion {assertion.assertion_id} is "
                    f"{assertion.review_state}, not VERIFIED"
                )
                continue
            if assertion.source_id in registered:
                continue
            unbacked.append(
                f"{item.item_id} assertion {assertion.assertion_id} names "
                f"source {assertion.source_id}, which the source denominator "
                f"does not hold as REGISTERED"
            )
    if unbacked:
        raise ValueError(
            "a record counted as verified must resolve to a registered "
            "source or be named by an evidence gate finding: "
            + "; ".join(sorted(unbacked))
        )


@dataclass(frozen=True)
class CoverageSnapshot:
    """The measured denominator and what is classified against it."""

    discovered_item_count: int
    items: tuple[CoverageItem, ...]
    unclassified: tuple[UnclassifiedItem, ...]
    blocked_sources: tuple[BlockedSource, ...]
    source_denominator: tuple[SourceDenominatorEntry, ...]
    evidence_gate_findings: tuple[EvidenceGateFinding, ...]

    def __post_init__(self) -> None:
        items = tuple(
            _snapshot_exact(item, CoverageItem, "items")
            for item in _snapshot_iterable(self.items, "items")
        )
        unclassified = tuple(
            _snapshot_exact(record, UnclassifiedItem, "unclassified")
            for record in _snapshot_iterable(self.unclassified, "unclassified")
        )
        blocked = tuple(
            _snapshot_exact(record, BlockedSource, "blocked_sources")
            for record in _snapshot_iterable(
                self.blocked_sources, "blocked_sources"
            )
        )
        denominator = tuple(
            _snapshot_exact(
                record, SourceDenominatorEntry, "source_denominator"
            )
            for record in _snapshot_iterable(
                self.source_denominator, "source_denominator"
            )
        )
        findings = tuple(
            _snapshot_exact(
                record, EvidenceGateFinding, "evidence_gate_findings"
            )
            for record in _snapshot_iterable(
                self.evidence_gate_findings, "evidence_gate_findings"
            )
        )
        _require_exact_int(
            self.discovered_item_count, "discovered_item_count"
        )

        item_ids = tuple(item.item_id for item in items)
        if len(item_ids) != len(set(item_ids)):
            raise ValueError("duplicate item_id")
        source_ids = tuple(entry.source_id for entry in denominator)
        if len(source_ids) != len(set(source_ids)):
            raise ValueError("duplicate source_denominator source_id")
        blocked_ids = tuple(record.source_id for record in blocked)
        if len(blocked_ids) != len(set(blocked_ids)):
            raise ValueError("duplicate blocked source_id")
        unknown = sorted(
            {
                finding.item_id
                for finding in findings
                if finding.item_id not in set(item_ids)
            }
        )
        if unknown:
            raise ValueError(
                "evidence gate finding names an unknown item: "
                + ", ".join(unknown)
            )
        if self.discovered_item_count != len(items) + len(unclassified):
            raise ValueError(
                "discovered_item_count must equal classified plus "
                "unclassified items"
            )
        _require_backed_verified_claims(items, denominator, findings)

        object.__setattr__(
            self,
            "items",
            tuple(sorted(items, key=lambda item: item.item_id)),
        )
        object.__setattr__(
            self,
            "unclassified",
            tuple(
                sorted(
                    unclassified,
                    key=lambda record: (
                        record.item_id,
                        record.origin,
                        record.reason,
                    ),
                )
            ),
        )
        object.__setattr__(
            self,
            "blocked_sources",
            tuple(sorted(blocked, key=lambda record: record.source_id)),
        )
        object.__setattr__(
            self,
            "source_denominator",
            tuple(sorted(denominator, key=lambda entry: entry.source_id)),
        )
        object.__setattr__(
            self,
            "evidence_gate_findings",
            tuple(sorted(findings, key=lambda finding: finding._order())),
        )

    # -- derived counts ---------------------------------------------------

    @property
    def unbacked_item_ids(self) -> tuple[str, ...]:
        return tuple(
            sorted({finding.item_id for finding in self.evidence_gate_findings})
        )

    def _count(
        self,
        label: str,
        count: int,
        *,
        denominator: int,
        denominator_label: str,
        measured_by: str,
    ) -> MeasuredCount:
        return MeasuredCount(
            label=label,
            count=count,
            denominator=denominator,
            denominator_label=denominator_label,
            measured_by=measured_by,
        )

    @property
    def classified_item_count(self) -> MeasuredCount:
        return self._count(
            "classified_items",
            len(self.items),
            denominator=self.discovered_item_count,
            denominator_label="discovered_items",
            measured_by=_MEASURED_BY_DISCOVERY,
        )

    @property
    def unclassified_item_count(self) -> MeasuredCount:
        return self._count(
            "unclassified_items",
            len(self.unclassified),
            denominator=self.discovered_item_count,
            denominator_label="discovered_items",
            measured_by=_MEASURED_BY_DISCOVERY,
        )

    @property
    def verified_item_count(self) -> MeasuredCount:
        unbacked = set(self.unbacked_item_ids)
        return self._count(
            "verified_items_with_backing_evidence",
            sum(
                1
                for item in self.items
                if item.classification == "VERIFIED"
                and item.item_id not in unbacked
            ),
            denominator=self.discovered_item_count,
            denominator_label="discovered_items",
            measured_by=_MEASURED_BY_GATE,
        )

    @property
    def unbacked_verified_item_count(self) -> MeasuredCount:
        return self._count(
            "verified_claims_refused_by_the_evidence_gate",
            len(self.unbacked_item_ids),
            denominator=self.discovered_item_count,
            denominator_label="discovered_items",
            measured_by=_MEASURED_BY_GATE,
        )

    @property
    def blocked_source_count(self) -> MeasuredCount:
        return self._count(
            "blocked_sources",
            len(self.blocked_sources),
            denominator=len(self.source_denominator),
            denominator_label="sources_in_denominator",
            measured_by=_MEASURED_BY_DISCOVERY,
        )

    @property
    def registered_source_count(self) -> MeasuredCount:
        return self._count(
            "registered_sources",
            sum(
                1
                for entry in self.source_denominator
                if entry.state == "REGISTERED"
            ),
            denominator=len(self.source_denominator),
            denominator_label="sources_in_denominator",
            measured_by=_MEASURED_BY_DISCOVERY,
        )

    @property
    def classification_counts(self) -> Mapping[str, MeasuredCount]:
        """One entry per state, always present, so zero is never an omission."""

        return MappingProxyType(
            {
                state: self._count(
                    f"classification.{state}",
                    sum(
                        1
                        for item in self.items
                        if item.classification == state
                    ),
                    denominator=self.discovered_item_count,
                    denominator_label="discovered_items",
                    measured_by=_MEASURED_BY_DISCOVERY,
                )
                for state in CLASSIFICATION_STATES
            }
        )

    @property
    def dimension_verified_counts(self) -> Mapping[str, MeasuredCount]:
        """Ten independent counts. No blended score exists, by construction."""

        unbacked = set(self.unbacked_item_ids)
        return MappingProxyType(
            {
                dimension: self._count(
                    f"dimension_verified.{dimension}",
                    sum(
                        1
                        for item in self.items
                        if item.dimension_states[dimension]
                        == VerificationState.VERIFIED.value
                        and item.item_id not in unbacked
                    ),
                    denominator=self.discovered_item_count,
                    denominator_label="discovered_items",
                    measured_by=_MEASURED_BY_GATE,
                )
                for dimension in VERIFICATION_DIMENSIONS
            }
        )

    @property
    def counts(self) -> tuple[MeasuredCount, ...]:
        collected = [
            self.classified_item_count,
            self.unclassified_item_count,
            self.verified_item_count,
            self.unbacked_verified_item_count,
            self.blocked_source_count,
            self.registered_source_count,
            *self.classification_counts.values(),
            *self.dimension_verified_counts.values(),
        ]
        return tuple(sorted(collected, key=lambda item: item.label))

    @property
    def coverage_statement(self) -> str:
        """State what is true, with every denominator attached."""

        classified = self.classified_item_count
        verified = self.verified_item_count
        unbacked = self.unbacked_verified_item_count
        blocked = self.blocked_source_count
        registered = self.registered_source_count
        parts = [
            f"{classified.count} of {classified.denominator} discovered "
            f"registry items classified",
            f"{verified.count} of {verified.denominator} counted as verified "
            f"with backing evidence",
            f"{unbacked.count} of {unbacked.denominator} verified claims "
            f"refused by the evidence gate",
            f"{registered.count} of {registered.denominator} named sources "
            f"readable and hash-verified",
            f"{blocked.count} of {blocked.denominator} named sources blocked",
        ]
        statement = "; ".join(parts) + "."
        if self.discovered_item_count == 0:
            statement += (
                " The registry root holds zero records, so this release "
                "covers nothing."
            )
        if self.unclassified:
            statement += " Unclassified discovered items: " + ", ".join(
                f"{record.item_id} ({record.origin}, {record.reason})"
                for record in self.unclassified
            ) + "."
        if self.blocked_sources:
            statement += " Blocked sources: " + ", ".join(
                f"{record.source_id} ({record.reason})"
                for record in self.blocked_sources
            ) + "."
        statement += (
            " Measured by " + _MEASURED_BY_DISCOVERY + " over the named "
            "registry root; no figure here is a market-wide claim."
        )
        return statement


@dataclass(frozen=True)
class DiscoveryResult:
    """What one pass over a registry root found, before counting."""

    items: tuple[CoverageItem, ...]
    unclassified: tuple[UnclassifiedItem, ...]
    blocked_sources: tuple[BlockedSource, ...]
    source_denominator: tuple[SourceDenominatorEntry, ...]
    vault: EvidenceVault
    source_bytes: Mapping[str, bytes]


def _read_jsonl(
    path: Path,
    label: str | None = None,
) -> tuple[tuple[int, Mapping[str, object]], ...]:
    name = path.name if label is None else label
    try:
        # newline=None gives universal-newline translation, so CRLF and CR
        # inputs arrive as LF and a checkout-time EOL rewrite cannot change
        # what is read.
        text = path.read_text(encoding="utf-8")
    except OSError as error:
        raise ValueError(f"{name}: {error}") from error
    except UnicodeDecodeError as error:
        raise ValueError(f"{name}: not valid UTF-8") from error
    records: list[tuple[int, Mapping[str, object]]] = []
    # Split on LF only. `str.splitlines()` also breaks on U+2028, U+2029 and
    # U+0085, all three of which this package's own serializer emits raw
    # because it uses ensure_ascii=False. Splitting on them would tear a valid
    # single-line record in half.
    for line_number, raw_line in enumerate(text.split("\n"), start=1):
        if not raw_line.strip():
            continue
        try:
            payload = json.loads(raw_line)
        except json.JSONDecodeError as error:
            raise ValueError(
                f"{name}:{line_number}: malformed JSON ({error.msg})"
            ) from error
        if not isinstance(payload, dict):
            raise ValueError(
                f"{name}:{line_number}: each line must be a JSON object"
            )
        records.append((line_number, payload))
    return tuple(records)


def _resolve_inside(root: Path, relative: object, origin: str) -> Path:
    if type(relative) is not str or not relative.strip():
        raise ValueError(f"{origin}: content_path must be a nonblank string")
    resolved = (root / relative).resolve()
    if not resolved.is_relative_to(root.resolve()):
        raise ValueError(
            f"{origin}: content_path must stay inside the registry root"
        )
    return resolved


def _discover_sources(
    root: Path,
) -> tuple[
    EvidenceVault,
    tuple[BlockedSource, ...],
    tuple[SourceDenominatorEntry, ...],
    Mapping[str, bytes],
]:
    manifest_path = root / SOURCE_MANIFEST_FILENAME
    if not manifest_path.is_file():
        raise FileNotFoundError(
            f"source manifest not found: {manifest_path}"
        )

    vault = EvidenceVault()
    blocked: list[BlockedSource] = []
    denominator: list[SourceDenominatorEntry] = []
    stored: dict[str, bytes] = {}
    seen: set[str] = set()

    for line_number, payload in _read_jsonl(manifest_path):
        origin = f"{SOURCE_MANIFEST_FILENAME}:{line_number}"
        fields = dict(payload)
        blocked_reason = fields.pop("blocked_reason", None)
        content_path = fields.pop("content_path", None)
        try:
            snapshot = SourceSnapshot(**fields)
        except TypeError as error:
            raise ValueError(f"{origin}: {error}") from error
        if snapshot.source_id in seen:
            raise ValueError(f"{origin}: duplicate source_id")
        seen.add(snapshot.source_id)
        _require_canonical_id(snapshot.source_id, f"{origin} source_id")

        def record_blocked(reason: str) -> None:
            blocked.append(
                BlockedSource(source_id=snapshot.source_id, reason=reason)
            )
            denominator.append(
                SourceDenominatorEntry(
                    source_id=snapshot.source_id,
                    sha256=snapshot.sha256,
                    state="BLOCKED",
                )
            )

        if blocked_reason is not None:
            record_blocked(_require_string(blocked_reason, "blocked_reason"))
            continue
        if content_path is None:
            record_blocked("SOURCE_CONTENT_ABSENT")
            continue
        resolved = _resolve_inside(root, content_path, origin)
        try:
            content = resolved.read_bytes()
        except OSError:
            record_blocked("SOURCE_CONTENT_UNREADABLE")
            continue
        if not verify_source_hash(snapshot, content):
            record_blocked("SOURCE_HASH_MISMATCH")
            continue
        vault.register(snapshot, content)
        stored[snapshot.source_id] = content
        denominator.append(
            SourceDenominatorEntry(
                source_id=snapshot.source_id,
                sha256=snapshot.sha256,
                state="REGISTERED",
            )
        )

    return (
        vault,
        tuple(blocked),
        tuple(denominator),
        MappingProxyType(stored),
    )


def _read_declared_denominator(
    path: Path,
    relative: str,
    seen_sources: set[str],
) -> tuple[tuple[BlockedSource, ...], tuple[SourceDenominatorEntry, ...]]:
    """Read ``source-denominator.jsonl`` into denominator input.

    Every refusal names the file, the line, and the exact field or value that
    is wrong, because the alternative is guessing a shape Task 9 has not
    agreed. Nothing here is inferred from a filename pattern or defaulted.
    """

    blocked: list[BlockedSource] = []
    denominator: list[SourceDenominatorEntry] = []
    for line_number, payload in _read_jsonl(path, relative):
        origin = f"{relative}:{line_number}"
        unknown = sorted(set(payload) - set(DECLARED_DENOMINATOR_FIELDS))
        if unknown:
            raise ValueError(
                f"{origin}: unrecognized field(s) "
                + ", ".join(unknown)
                + "; a declared denominator row holds exactly "
                + ", ".join(DECLARED_DENOMINATOR_FIELDS)
                + ". Extending that row schema is Task 9's decision, not a "
                "shape this reader guesses."
            )
        missing = sorted(
            name
            for name in DECLARED_DENOMINATOR_REQUIRED_FIELDS
            if name not in payload
        )
        if missing:
            raise ValueError(
                f"{origin}: missing required field(s) "
                + ", ".join(missing)
                + "; a declared denominator row must state "
                + ", ".join(DECLARED_DENOMINATOR_REQUIRED_FIELDS)
            )

        try:
            state = _require_member(
                payload["state"], "state", SOURCE_DENOMINATOR_STATES
            )
        except (TypeError, ValueError) as error:
            raise ValueError(f"{origin}: {error}") from error
        if state != "BLOCKED":
            raise ValueError(
                f"{origin}: state REGISTERED cannot be declared in "
                f"{SOURCE_DENOMINATOR_FILENAME}. This reader holds no bytes "
                "for a source declared here, so it cannot re-verify the "
                "digest, and the coverage statement publishes REGISTERED as "
                "\"readable and hash-verified\". Declare such a source in "
                f"{SOURCE_MANIFEST_FILENAME} with a content_path instead."
            )
        reason = payload.get("blocked_reason")
        if reason is None:
            raise ValueError(
                f"{origin}: a BLOCKED source must state blocked_reason. A "
                "source that could not be read is a visible gap, never an "
                "absence."
            )

        try:
            entry = SourceDenominatorEntry(
                source_id=payload["source_id"],
                sha256=payload["sha256"],
                state=state,
            )
            record = BlockedSource(
                source_id=payload["source_id"], reason=reason
            )
        except (TypeError, ValueError) as error:
            raise ValueError(f"{origin}: {error}") from error

        if entry.source_id in seen_sources:
            raise ValueError(
                f"{origin}: duplicate source_id {entry.source_id}"
            )
        seen_sources.add(entry.source_id)
        denominator.append(entry)
        blocked.append(record)
    return tuple(blocked), tuple(denominator)


def _refuse_undefined_brand_records(path: Path, relative: str) -> None:
    """Recognize ``brand-universe.jsonl``; refuse a row with no schema.

    The file is recognized so it is never misread as item data, and a
    zero-record file contributes nothing. A nonblank row is refused rather
    than accepted-and-discarded: this package holds no brand record type to
    validate one against, and :class:`CoverageSnapshot` has no field to carry
    one, so accepting a row could only drop it — and a dropped record is the
    silence this module exists to refuse.
    """

    records = _read_jsonl(path, relative)
    if not records:
        return
    line_number = records[0][0]
    raise ValueError(
        f"{relative}:{line_number}: {BRAND_UNIVERSE_FILENAME} is recognized "
        "as denominator input, but no row schema for it is defined. This "
        "package holds no brand record type to validate a row against and "
        "CoverageSnapshot has no field to carry one, so an accepted row "
        "could only be discarded. Task 9 must define the brand-universe row "
        "schema and the field that carries it. A zero-record file is read "
        "and contributes nothing."
    )


def _build_assertions(
    payload: Mapping[str, object],
    origin: str,
) -> tuple[FieldAssertion, ...]:
    raw = payload.get("assertions", [])
    if not isinstance(raw, list):
        raise ValueError(f"{origin}: assertions must be an array")
    assertions: list[FieldAssertion] = []
    for entry in raw:
        if not isinstance(entry, dict):
            raise ValueError(f"{origin}: each assertion must be an object")
        try:
            assertions.append(FieldAssertion(**entry))
        except TypeError as error:
            raise ValueError(f"{origin}: {error}") from error
    return tuple(assertions)


def discover_registry_root(root: object) -> DiscoveryResult:
    """Read one registry root and classify everything it contains."""

    root_path = Path(root)
    if not root_path.is_dir():
        raise FileNotFoundError(f"registry root not found: {root_path}")

    vault, blocked, denominator, stored = _discover_sources(root_path)

    items: list[CoverageItem] = []
    unclassified: list[UnclassifiedItem] = []
    seen_items: set[str] = set()
    seen_assertions: set[str] = set()

    manifest_path = root_path / SOURCE_MANIFEST_FILENAME
    item_files: list[tuple[str, Path]] = []
    denominator_files: list[tuple[str, Path]] = []
    for path in root_path.rglob("*.jsonl"):
        relative = path.relative_to(root_path).as_posix()
        if path == manifest_path:
            continue
        if relative.split("/")[0] == SOURCE_CACHE_DIRNAME:
            # The one documented exclusion: this directory holds the stored
            # source bytes `content_path` points at, and is declared in the
            # registry root's own .gitignore.
            continue
        if path.name == SOURCE_MANIFEST_FILENAME:
            raise ValueError(
                f"{relative}: a source manifest is only recognized at the "
                "registry root; a nested one is ambiguous"
            )
        if path.name in DENOMINATOR_INPUT_FILENAMES:
            # Exact filename, and location is part of the contract: at the
            # root `relative` is the bare filename. A nested copy is refused,
            # not exempted, so the allowlist cannot be used to hide a file.
            if relative != path.name:
                raise ValueError(
                    f"{relative}: {path.name} is only recognized at the "
                    "registry root; a nested one is ambiguous"
                )
            denominator_files.append((relative, path))
            continue
        item_files.append((relative, path))
    item_files.sort(key=lambda entry: entry[0])
    denominator_files.sort(key=lambda entry: entry[0])

    # Denominator input, read after the manifest so a source cannot be named
    # twice, and never counted toward `discovered_item_count`.
    declared_blocked: list[BlockedSource] = []
    declared_denominator: list[SourceDenominatorEntry] = []
    seen_sources = {entry.source_id for entry in denominator}
    for relative, path in denominator_files:
        if relative == BRAND_UNIVERSE_FILENAME:
            _refuse_undefined_brand_records(path, relative)
            continue
        extra_blocked, extra_entries = _read_declared_denominator(
            path, relative, seen_sources
        )
        declared_blocked.extend(extra_blocked)
        declared_denominator.extend(extra_entries)

    for relative, path in item_files:
        for line_number, payload in _read_jsonl(path, relative):
            origin = f"{relative}:{line_number}"
            item_id = payload.get("item_id")
            if type(item_id) is not str or not item_id.strip():
                raise ValueError(
                    f"{origin}: item_id must be a nonblank string"
                )
            if item_id in seen_items:
                raise ValueError(f"{origin}: duplicate item_id {item_id}")
            seen_items.add(item_id)

            classification = payload.get("classification")
            if classification is None:
                unclassified.append(
                    UnclassifiedItem(
                        item_id=item_id,
                        origin=origin,
                        reason="CLASSIFICATION_ABSENT",
                    )
                )
                continue
            if (
                type(classification) is not str
                or classification not in CLASSIFICATION_STATES
            ):
                unclassified.append(
                    UnclassifiedItem(
                        item_id=item_id,
                        origin=origin,
                        reason="CLASSIFICATION_UNRECOGNIZED",
                    )
                )
                continue

            assertions = _build_assertions(payload, origin)
            try:
                item = CoverageItem(
                    item_id=item_id,
                    classification=classification,
                    dimension_states=payload.get("dimension_states", {}),
                    assertions=assertions,
                )
            except (TypeError, ValueError) as error:
                raise ValueError(f"{origin}: {error}") from error

            for assertion in item.assertions:
                if assertion.assertion_id in seen_assertions:
                    raise ValueError(
                        f"{origin}: duplicate assertion_id "
                        f"{assertion.assertion_id}"
                    )
                seen_assertions.add(assertion.assertion_id)
                # `EvidenceVault.register` raises a bare ValueError with no
                # machine-readable reason, so the reason is not taken from here
                # at all: the gate is handed the measured source denominator
                # and the blocked-source reasons, and re-derives the specific
                # code itself. A refusal therefore becomes a named finding, not
                # a silent omission and not a single collapsed code.
                try:
                    vault.register(assertion)
                except (TypeError, ValueError):
                    pass
            items.append(item)

    return DiscoveryResult(
        items=tuple(items),
        unclassified=tuple(unclassified),
        blocked_sources=blocked + tuple(declared_blocked),
        source_denominator=denominator + tuple(declared_denominator),
        vault=vault,
        source_bytes=stored,
    )


def build_snapshot(root: object) -> CoverageSnapshot:
    """Measure one registry root into an immutable coverage snapshot."""

    discovered = discover_registry_root(root)
    findings = evaluate_evidence_gate(
        discovered.items,
        discovered.vault,
        discovered.source_bytes,
        source_denominator=discovered.source_denominator,
        blocked_sources=discovered.blocked_sources,
    )
    return CoverageSnapshot(
        discovered_item_count=len(discovered.items)
        + len(discovered.unclassified),
        items=discovered.items,
        unclassified=discovered.unclassified,
        blocked_sources=discovered.blocked_sources,
        source_denominator=discovered.source_denominator,
        evidence_gate_findings=findings,
    )
