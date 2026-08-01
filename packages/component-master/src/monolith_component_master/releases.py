"""Deterministic, byte-reproducible releases over a coverage snapshot.

A release publishes what a registry root holds at the moment it is measured. It
signs nothing, freezes nothing, and grants no manufacturing, export or
production authority. A release over an empty registry succeeds and says
plainly that it covers nothing.

Determinism rules, all of them load-bearing:

- UTF-8 JSON, sorted keys, LF line endings, no trailing whitespace.
- **No wall-clock value inside the hashed payload.** Creation metadata lives in
  the manifest, outside :attr:`RegistryRelease.payload_sha256`.
- Record order is derived from a total order over canonical IDs after
  duplicates are refused. Input order therefore cannot change the output bytes.
- Unordered collections are refused rather than sorted, in the payload and in
  every record that feeds it. A ``set`` anywhere in an output path passes a
  single-process test and changes in the field.
- Any value that cannot be canonicalized deterministically is refused. There is
  no best-effort fallback.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime, timedelta
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
from types import MappingProxyType

from .coverage import (
    SNAPSHOT_SCHEMA,
    CoverageSnapshot,
    canonical_value,
)
from .ingestion import _require_string, _require_text


RELEASE_ID_PREFIX = "release:connector-registry:"
AUTHORITY_STATE = "NOT-FOR-PRODUCTION"
REGISTRY_PAYLOAD_FILENAME = "registry.json"
RELEASE_MANIFEST_FILENAME = "release-manifest.json"

_SEMANTIC_VERSION = re.compile(r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)")
_SHA256 = re.compile(r"[0-9a-f]{64}")
_MEASURED_COUNT_PAYLOAD_KEYS = frozenset(
    {"count", "denominator", "denominator_label", "label", "measured_by"}
)


def _plain(value: object) -> object:
    """Render a canonical snapshot into the plain types ``json`` accepts."""

    if isinstance(value, Mapping):
        return {key: _plain(item) for key, item in value.items()}
    if isinstance(value, tuple):
        return [_plain(item) for item in value]
    return value


def canonical_json_bytes(payload: object) -> bytes:
    """Serialize deterministically, or refuse.

    Sorted keys, LF terminator, UTF-8. Every value passes the closed
    admitted-type allowlist first, so a ``Decimal``, ``bytearray``,
    ``frozenset`` or non-finite ``float`` is refused rather than coerced.
    """

    canonical = canonical_value(payload, "payload")
    text = json.dumps(
        _plain(canonical),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    )
    try:
        encoded = text.encode("utf-8")
    except UnicodeEncodeError as error:
        raise ValueError(
            "payload must be encodable as UTF-8 without surrogates"
        ) from error
    return encoded + b"\n"


def _require_semantic_version(value: object) -> str:
    text = _require_text(value, "version")
    if _SEMANTIC_VERSION.fullmatch(text) is None:
        raise ValueError(
            "version must be MAJOR.MINOR.PATCH with no leading zeros, "
            "no prerelease and no build metadata"
        )
    return text


def _require_created_at(value: object) -> str:
    text = _require_string(value, "created_at_utc")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError as error:
        raise ValueError(
            "created_at_utc must be an ISO-8601 timestamp with a UTC offset"
        ) from error
    if parsed.tzinfo is None or parsed.utcoffset() != timedelta(0):
        raise ValueError(
            "created_at_utc must carry an explicit UTC offset"
        )
    return text


def _require_digest(value: object, field_name: str) -> str:
    text = _require_text(value, field_name)
    if _SHA256.fullmatch(text) is None:
        raise ValueError(
            f"{field_name} must be exactly 64 lowercase hexadecimal characters"
        )
    return text


def _exact_snapshot(snapshot: object) -> CoverageSnapshot:
    """Require exact type identity, not ``isinstance``.

    A subclass can override ``__getattribute__`` and answer one way while the
    counts are read, then another way once the release is published.
    """

    if type(snapshot) is not CoverageSnapshot:
        raise TypeError("snapshot must be exactly a CoverageSnapshot")
    return snapshot


def _published_count_payloads(
    payload: object,
) -> Mapping[str, Mapping[str, object]]:
    """Collect every count object reachable in the payload, by shape.

    A count object is a mapping whose key set is exactly the five keys
    :meth:`~monolith_component_master.coverage.MeasuredCount.as_payload`
    emits. The match is on shape rather than on field name, because the
    defect this guard exists for is a count nobody remembered to look for.
    The walk descends into every container the canonical allowlist admits:
    mappings, and both sequence types, ``list`` and ``tuple``. Recognising a
    count does not make that mapping a leaf: its values are walked too, because
    ``canonical_value`` also keeps descending and therefore permits another
    count-shaped mapping inside one of the five fields. The traversal boundary
    is the canonical container set, not one arbitrary level below a count.
    ``canonical_value`` admits the two sequence types alike, so a count
    nested in either is publishable through canonical JSON; the previous
    version of this walk descended into mappings and tuples only, and a
    count nested in a ``list`` was therefore publishable while standing
    invisible to this collector. The list arm is driven by
    ``tests.component_master.registry.test_first_cohort_denominator.PublicationGuardSeamTests``.

    Two counts sharing a label are refused rather than merged, because a
    mapping keyed by label can carry only one of them, and the one silently
    dropped would be a count the comparison never saw.
    ``PublicationGuardSeamTests`` hands the collector a duplicate payload
    directly so that deleting this arm cannot stay green.

    **What this does not close, stated rather than claimed.** Each residual
    is exercised by
    ``tests.component_master.registry.test_first_cohort_denominator.PublicationGuardResidualTests``
    and asserted genuinely still open.

    - **A count-shaped mapping carrying a sixth key is a container, not a
      count.** The match is the exact five-key set, so an object holding the
      five fields plus anything else is walked for nested counts and never
      compared itself. The test helper ``payload_count_labels`` deliberately
      matches by superset — an attacker flags anything carrying the five
      fields, while this guard compares only objects that are exactly a
      published count — and the difference is stated on both walks so the
      two definitions cannot drift apart unnoticed.
    - **A payload that contains itself is not refused; it exhausts the
      stack.** A container this walk descends into that holds itself makes the
      walk recurse until ``RecursionError``, which names no field and gives no
      reason, while every refusal in this module does both. Nothing here
      detects the cycle. :func:`canonical_json_bytes` fails the same way on the
      same payload, so such a payload is unrenderable rather than merely
      uncollected — but by stack exhaustion, not by a rule.
    - This collector sees only the payload. On the record side,
      :attr:`~monolith_component_master.coverage.CoverageSnapshot.counts`
      enrols a count-bearing mapping only when it is nonempty and every value
      is a ``MeasuredCount``; :func:`snapshot_payload` publishes both of its
      count mappings unconditionally. The comparison below is what turns that
      asymmetry into a refusal rather than a silent omission.
    - This function reads whatever payload it is handed and binds nothing
      else; which callers are bound is stated on
      :func:`_require_count_publication_matches`.
    """

    collected: dict[str, Mapping[str, object]] = {}

    def walk(value: object) -> None:
        if isinstance(value, Mapping):
            if frozenset(value) == _MEASURED_COUNT_PAYLOAD_KEYS:
                label = value["label"]
                if not isinstance(label, str):
                    raise TypeError("a published count label must be a string")
                if label in collected:
                    raise ValueError(
                        "the payload publishes two counts with the same label: "
                        + label
                    )
                collected[label] = value
            for nested in value.values():
                walk(nested)
        elif isinstance(value, (list, tuple)):
            for nested in value:
                walk(nested)

    walk(payload)
    return MappingProxyType(collected)


def _require_count_publication_matches(
    snapshot: CoverageSnapshot, payload: Mapping[str, object]
) -> None:
    """Refuse a payload whose count objects diverge from the record.

    The record side is
    :attr:`~monolith_component_master.coverage.CoverageSnapshot.counts`
    rendered through ``as_payload``; the payload side is whatever
    :func:`_published_count_payloads` collects. The label is the comparison
    key; equality of the two payload mappings then compares the other four
    fields as values. Its three refusal arms are all reachable through
    publication, but by different mechanisms:

    - ``missing`` — a count the record holds and the payload does not — is the
      ordinary hand-written-list divergence. :func:`snapshot_payload` names
      its fields by hand, so a count enrolled on the record and absent from
      that list reaches this refusal through the public path.
      ``tests.component_master.registry.test_first_cohort_denominator.CountEnrollmentDerivationTests``
      drives it there.
    - ``unexpected`` is reachable through :func:`snapshot_payload` because
      its two count-bearing mappings are published unconditionally, while the
      record enrols such a mapping only when it is nonempty and homogeneous in
      ``MeasuredCount`` values. A duck-typed value with ``as_payload`` is
      therefore published but causes the whole mapping to be absent from the
      record enumeration.
    - ``changed`` is reachable because the builder and the later record
      enumeration read a descriptor at different times. A stateful descriptor
      can return the same label with different field values on those reads.

    ``tests.component_master.registry.test_first_cohort_denominator.PublicationGuardSeamTests``
    drives both construction mechanisms through :func:`snapshot_payload` and
    also drives all three arms directly at this seam with doctored payloads.
    The direct seam tests bind each refusal independently of a particular
    builder. ``PayloadCountCompletenessTests`` only re-walks the released bytes
    and asserts equality; it has never made this function refuse anything.

    **What this does not close, stated rather than claimed.** Each residual
    is exercised by
    ``tests.component_master.registry.test_first_cohort_denominator.PublicationGuardResidualTests``
    and asserted genuinely still open.

    - This guard binds :func:`snapshot_payload` and everything that calls it
      — ``build_release_from_snapshot`` and ``build_release`` — not the
      ``RegistryRelease`` constructor. A release constructed directly with
      self-consistent doctored ``payload_bytes`` carries whatever those
      bytes say, and this comparison never runs. Pre-existing at base, named
      here rather than implied closed.
    - What is a count object at all is decided by
      :func:`_published_count_payloads`, its residuals included: a
      count-shaped mapping carrying a sixth key is walked as a container and
      never compared here. An exact five-key count is not a leaf: its values
      are still walked for nested count objects.
    """

    record = {count.label: count.as_payload() for count in snapshot.counts}
    published = _published_count_payloads(payload)
    missing = sorted(set(record) - set(published))
    unexpected = sorted(set(published) - set(record))
    changed = sorted(
        label
        for label in set(record) & set(published)
        if record[label] != published[label]
    )
    if not (missing or unexpected or changed):
        return
    details = []
    if missing:
        details.append("record counts not published: " + ", ".join(missing))
    if unexpected:
        details.append(
            "published counts absent from the record: "
            + ", ".join(unexpected)
        )
    if changed:
        details.append(
            "counts whose four non-label fields differ under their shared "
            "label: " + ", ".join(changed)
        )
    raise ValueError(
        "the snapshot count enumeration and payload count objects disagree: "
        + "; ".join(details)
    )


def snapshot_payload(snapshot: CoverageSnapshot) -> Mapping[str, object]:
    """The hashed payload. It contains no wall-clock value, by construction.

    Every field is named here one by one, so a field this function does not
    name is outside :attr:`RegistryRelease.payload_sha256` and is therefore
    attested by no release at all. **Four** were missing and are named now.

    The count is four rather than three because the previous version of this
    docstring said three, having audited only the counts it had already
    decided to add. That is the shape this docstring must not repeat: a fix
    applied to the named instances while the prose generalises to the class.
    The list below is therefore a record of what happened, not the guarantee.
    The guarantee runs here on every publication: every count object reachable
    in the payload is compared against
    :attr:`~monolith_component_master.coverage.CoverageSnapshot.counts` in both
    directions: the label is the comparison key and the other four fields are
    compared as values. This builder can exhibit all three refusal arms:
    ``missing`` when a derived count property is absent from this hand-written
    payload; ``unexpected`` when one of the mappings published unconditionally
    is not enrolled because it contains a non-``MeasuredCount`` value; and
    ``changed`` when a descriptor returns different values to this builder and
    the later record enumeration. The publication-path tests exercise both
    non-missing mechanisms, while the seam tests bind each comparison arm
    independently.
    ``tests.component_master.registry.test_first_cohort_denominator.PayloadCountCompletenessTests``
    independently re-walks the record and the released bytes and asserts the
    two enumerations are identical; it makes nothing refuse, and is credited
    with nothing more. A hand-maintained key list cannot make the check,
    because it can only freeze whatever was true when it was typed.

    **The field list in this function is still written by hand, and the
    record's enumeration is not.** ``counts`` is derived by introspection over
    the record's count-bearing properties, so a count added there and
    forgotten cannot go missing from the comparison; the key names below are
    part of the published contract and are not derivable from a label, so they
    stay written out. The comparison is what stops this hand-written half
    going stale, and it is what a reviewer should re-run rather than reading
    this list for reassurance.

    - ``verified_item_count``. The module's **headline coverage number** — the
      clause ``coverage_statement`` speaks second — and the one that survived
      the wave that added the other three. It is **not** substitutable by
      ``classification_counts["VERIFIED"]``: different label, different
      ``measured_by`` (``evaluate_evidence_gate`` against
      ``discover_registry_root``), and a different number whenever a record
      claims VERIFIED without backing. Nor is "a consumer can recompute it" a
      defence, because that defence was already rejected for
      ``declared_unread_source_count``, which was equally recomputable before
      it was added.

    - ``brand_universe``. Without it two registry roots declaring **completely
      different** brands against an identical source denominator produced a
      byte-identical payload and the same digest, so no published digest could
      attest which cohort it had been measured against, and no brand name
      appeared anywhere in the released bytes. ``first_cohort_brand_count`` is
      computed from this declaration and is a load-bearing invariant of
      :class:`~monolith_component_master.coverage.CoverageSnapshot`.
    - ``declared_unread_source_count`` and ``first_cohort_brand_count``. Two of
      the three source states carried a
      :class:`~monolith_component_master.coverage.MeasuredCount` here and the
      third carried none, so a consumer enumerating the payload's count objects
      saw ``0 + 0`` against a denominator of the whole declared denominator.
      Rule 1 of the coverage module is that every count carries its denominator
      together with the function that produced it; a count dropped on the way
      to the payload does neither.

    The brand rows follow ``source_denominator``'s convention exactly: the
    record has already exact-type checked and deep-snapshotted them, and
    ``as_payload`` is what is carried through. No new serialisation convention
    is introduced.
    """

    _exact_snapshot(snapshot)
    unbacked = set(snapshot.unbacked_item_ids)
    payload = MappingProxyType(
        {
            "authority_state": AUTHORITY_STATE,
            "blocked_source_count": snapshot.blocked_source_count.as_payload(),
            "blocked_sources": tuple(
                record.as_payload() for record in snapshot.blocked_sources
            ),
            "brand_universe": tuple(
                entry.as_payload() for entry in snapshot.brand_universe
            ),
            "classification_counts": MappingProxyType(
                {
                    state: measured.as_payload()
                    for state, measured in snapshot.classification_counts.items()
                }
            ),
            "classified_item_count": snapshot.classified_item_count.as_payload(),
            "coverage_statement": snapshot.coverage_statement,
            "declared_unread_source_count": (
                snapshot.declared_unread_source_count.as_payload()
            ),
            "dimension_verified_counts": MappingProxyType(
                {
                    dimension: measured.as_payload()
                    for dimension, measured in (
                        snapshot.dimension_verified_counts.items()
                    )
                }
            ),
            "discovered_item_count": snapshot.discovered_item_count,
            "evidence_gate_findings": tuple(
                finding.as_payload()
                for finding in snapshot.evidence_gate_findings
            ),
            "first_cohort_brand_count": (
                snapshot.first_cohort_brand_count.as_payload()
            ),
            "items": tuple(
                item.as_payload(
                    evidence_backed=item.item_id not in unbacked
                )
                for item in snapshot.items
            ),
            "registered_source_count": (
                snapshot.registered_source_count.as_payload()
            ),
            "schema": SNAPSHOT_SCHEMA,
            "source_denominator": tuple(
                entry.as_payload() for entry in snapshot.source_denominator
            ),
            "unbacked_verified_item_count": (
                snapshot.unbacked_verified_item_count.as_payload()
            ),
            "unclassified": tuple(
                record.as_payload() for record in snapshot.unclassified
            ),
            "unclassified_item_count": (
                snapshot.unclassified_item_count.as_payload()
            ),
            "verified_item_count": snapshot.verified_item_count.as_payload(),
        }
    )
    _require_count_publication_matches(snapshot, payload)
    return payload


def source_denominator_digest(snapshot: CoverageSnapshot) -> str:
    """SHA-256 over the exact set of sources the snapshot measured against."""

    _exact_snapshot(snapshot)
    return hashlib.sha256(
        canonical_json_bytes(
            {
                "schema": SNAPSHOT_SCHEMA + "#source-denominator",
                "source_denominator": tuple(
                    entry.as_payload()
                    for entry in snapshot.source_denominator
                ),
            }
        )
    ).hexdigest()


@dataclass(frozen=True)
class RegistryRelease:
    """Release identity, digests, and creation metadata kept outside them."""

    release_id: str
    version: str
    payload_sha256: str
    source_denominator_sha256: str
    created_at_utc: str
    payload_bytes: bytes

    def __post_init__(self) -> None:
        version = _require_semantic_version(self.version)
        _require_text(self.release_id, "release_id")
        if self.release_id != RELEASE_ID_PREFIX + version:
            raise ValueError(
                f"release_id must be {RELEASE_ID_PREFIX}{version}"
            )
        _require_digest(self.payload_sha256, "payload_sha256")
        _require_digest(
            self.source_denominator_sha256, "source_denominator_sha256"
        )
        _require_created_at(self.created_at_utc)
        if type(self.payload_bytes) is not bytes:
            raise TypeError("payload_bytes must be exactly bytes")
        if not self.payload_bytes.endswith(b"\n"):
            raise ValueError("payload_bytes must end with a single LF")
        if b"\r" in self.payload_bytes:
            raise ValueError("payload_bytes must not contain CR")
        if (
            hashlib.sha256(self.payload_bytes).hexdigest()
            != self.payload_sha256
        ):
            raise ValueError("payload_sha256 does not match payload_bytes")

    def manifest(self) -> Mapping[str, object]:
        """Creation metadata lives here, outside the hashed payload."""

        return MappingProxyType(
            {
                "authority_state": AUTHORITY_STATE,
                "created_at_utc": self.created_at_utc,
                "payload_sha256": self.payload_sha256,
                "release_id": self.release_id,
                "source_denominator_sha256": self.source_denominator_sha256,
                "version": self.version,
            }
        )

    def manifest_bytes(self) -> bytes:
        return canonical_json_bytes(self.manifest())


def build_release_from_snapshot(
    snapshot: CoverageSnapshot,
    *,
    version: str,
    created_at_utc: str,
) -> RegistryRelease:
    """Build a release from an already-measured snapshot."""

    resolved_version = _require_semantic_version(version)
    resolved_created_at = _require_created_at(created_at_utc)
    _exact_snapshot(snapshot)
    # A release is what downstream consumes as truth. `check_coverage` is a
    # report and may be run over an unclassified item; a release may not,
    # unconditionally and with no opt-out flag, because a release containing an
    # item nobody classified overstates its own coverage.
    if snapshot.unclassified:
        raise ValueError(
            "a release cannot be built while a discovered item is "
            "unclassified: "
            + ", ".join(
                f"{record.item_id} ({record.origin}, {record.reason})"
                for record in snapshot.unclassified
            )
        )
    payload = canonical_json_bytes(snapshot_payload(snapshot))
    return RegistryRelease(
        release_id=RELEASE_ID_PREFIX + resolved_version,
        version=resolved_version,
        payload_sha256=hashlib.sha256(payload).hexdigest(),
        source_denominator_sha256=source_denominator_digest(snapshot),
        created_at_utc=resolved_created_at,
        payload_bytes=payload,
    )


def build_release(
    *,
    root: object,
    version: str,
    created_at_utc: str,
) -> RegistryRelease:
    """Produce a release from a registry root.

    Flags are validated before any filesystem work, so a malformed version
    cannot cause a root to be read — Task 7 shipped a guard that never ran when
    the input was empty, and this is the same failure shape.
    """

    resolved_version = _require_semantic_version(version)
    resolved_created_at = _require_created_at(created_at_utc)

    from .coverage import build_snapshot

    return build_release_from_snapshot(
        build_snapshot(root),
        version=resolved_version,
        created_at_utc=resolved_created_at,
    )


def write_new_files(outputs: Mapping[object, bytes]) -> None:
    """Publish every file or none of them, never overwriting anything.

    The link step is what makes the check-then-write race safe: ``os.link``
    fails if the destination appeared after the collision check, so an external
    process cannot be overwritten between the two.
    """

    if not isinstance(outputs, Mapping):
        raise TypeError("outputs must be a mapping of path to bytes")

    resolved: list[tuple[Path, bytes]] = []
    for destination, content in outputs.items():
        path = Path(destination).resolve()
        if type(content) is not bytes:
            raise TypeError(f"{path}: content must be exactly bytes")
        resolved.append((path, content))
    resolved.sort(key=lambda entry: str(entry[0]))

    seen: set[Path] = set()
    for path, _content in resolved:
        if path in seen:
            raise ValueError(f"duplicate output path: {path}")
        seen.add(path)
        if not path.parent.is_dir():
            raise FileNotFoundError(
                f"output parent directory must already exist: {path.parent}"
            )
        if path.exists():
            raise FileExistsError(f"output path already exists: {path}")

    temporary_outputs: list[tuple[Path, Path]] = []
    published: list[tuple[Path, Path]] = []
    try:
        for destination, content in resolved:
            with tempfile.NamedTemporaryFile(
                mode="wb",
                prefix=f".{destination.name}.",
                suffix=".tmp",
                dir=destination.parent,
                delete=False,
            ) as temporary:
                temporary.write(content)
                temporary.flush()
                os.fsync(temporary.fileno())
                temporary_outputs.append((Path(temporary.name), destination))
        for temporary_path, destination in temporary_outputs:
            os.link(temporary_path, destination)
            published.append((temporary_path, destination))
    except BaseException:
        for temporary_path, destination in reversed(published):
            try:
                if os.path.samefile(temporary_path, destination):
                    destination.unlink()
            except OSError:
                pass
        raise
    finally:
        for temporary_path, _destination in temporary_outputs:
            temporary_path.unlink(missing_ok=True)
