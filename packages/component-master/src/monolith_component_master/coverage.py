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

``brand-universe.jsonl`` declares the brands whose official sources this
registry intends to review, and which source each brand answers for. Each
nonblank line holds exactly ``brand_id``, ``brand_name`` and a nonempty
``source_ids`` array, and becomes one :class:`BrandUniverseEntry`. Every
``source_ids`` entry must exist in the measured source denominator, and no two
brands may claim the same source. A zero-record file contributes nothing.

**A declared brand set is a chosen first cohort, never a market and never a
complete registry.** :attr:`CoverageSnapshot.coverage_statement` says so in
words, because a file listing brands and official URLs looks exactly like
coverage and is the opposite of it: it is a list of work not yet done.

``source-denominator.jsonl`` declares sources whose bytes this reader does not
hold. ``state`` decides the rest of the row, because the three states are three
different facts and one shared field set would blur them:

``DECLARED_UNREAD``
    Named, and nobody has read it yet. The row holds exactly ``source_id``,
    ``state`` and ``url``. It carries **no** ``sha256``: no bytes exist, so no
    digest can, and a digest supplied here is refused rather than ignored. It
    carries no ``blocked_reason`` either, because nothing has been attempted.
    It is excluded from ``registered_source_count`` **and** from
    ``blocked_source_count``, and it has its own spoken count in
    ``coverage_statement``. Exactly one brand must claim it.
``BLOCKED``
    Somebody expected these bytes and could not read them. The row holds
    exactly ``blocked_reason``, ``sha256``, ``source_id`` and ``state``, and
    becomes one :class:`SourceDenominatorEntry` and one matching
    :class:`BlockedSource`. Unchanged from Task 8.
``REGISTERED``
    Refused in this file. This reader cannot re-hash a source it never read,
    and ``coverage_statement`` publishes a ``REGISTERED`` source as "readable
    and hash-verified". A source whose bytes belong in a release is declared in
    ``evidence-manifest.jsonl`` with a ``content_path``.

Any unknown field, any field belonging to another state, any missing field, any
other state, and any source ID already named by the manifest are each refused
with the file and the line.

Why ``BLOCKED`` still requires 64 hex where ``DECLARED_UNREAD`` refuses one
--------------------------------------------------------------------------

It is intended, and it is what makes the two states differ in **shape** rather
than only in spelling. A ``BLOCKED`` row's ``sha256`` is *the digest that was
expected and could not be confirmed*: for a manifest-derived block it is
``SourceSnapshot.sha256`` exactly as the manifest asserted it, carried through
unchanged by :func:`_discover_sources`, and it is the claim that failed. A
``DECLARED_UNREAD`` row has no such claim to carry, so requiring one would
invent a fact. One limitation is recorded and **not fixed here**: for a
``BLOCKED`` row written directly into ``source-denominator.jsonl`` the digest is
a value this reader can never confirm against bytes, because it holds none.
Relaxing the requirement would weaken a check, so it stands as it is.

What ``source-denominator.jsonl`` deliberately does **not** record
-----------------------------------------------------------------

The implementation plan's prose for this file named seven further concepts.
Each is answered here rather than left silent:

- **publisher** — refused. It is a property of a document somebody has read and
  already has a home in ``SourceSnapshot.publisher`` inside
  ``evidence-manifest.jsonl``. The organisation behind a declared source is
  carried instead by ``brand-universe.jsonl``, which claims the source by ID.
- **official URL** — **admitted**, as ``url``, because a declared source with no
  locator names nothing anybody could later fetch, and it must be an
  ``https://`` URL. **Recording a URL asserts nothing about what is behind
  it**: not that it resolves, not that it is current, not that its contents may
  be used. Nothing in this module has visited one.
- **edition when printed** — refused. An edition is printed on a document nobody
  has read. It belongs in ``SourceSnapshot.edition``, recorded at fetch time.
- **region** — deferred, not admitted. The region a catalogue *covers* is a fact
  about its contents; the region in a URL path is website routing. A review
  scope is a partition of sources that have been read, and belongs to the task
  that reads them.
- **language** — refused. The same argument as ``region``, and it has no
  downstream home at all: ``SourceSnapshot`` carries no language field, so a
  task that needs one must add it there first.
- **access date** — refused. Nobody accessed these. An access date for an
  unfetched URL is a fabricated fact.
- **rights state** — refused. **Recording a URL is not asserting a right to use
  what is behind it.** Rights review of these publishers has not happened. It
  belongs in ``SourceSnapshot.rights_state``, set after that review.

``releases.snapshot_payload`` names the fields it publishes one by one, so a
field it does not name is outside the hashed payload and is attested by no
release. It previously omitted :attr:`CoverageSnapshot.brand_universe`,
:attr:`CoverageSnapshot.declared_unread_source_count` and
:attr:`CoverageSnapshot.first_cohort_brand_count`, which meant two roots
declaring completely different brands over one denominator produced the same
digest. All three are inside the payload now.

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

Every file this reader opens must **resolve inside the registry root**. The
source manifest, both denominator input files and every item file are anchored
by :func:`_require_inside_root`, alongside the ``content_path`` anchoring
:func:`_resolve_inside` has done since Task 8. A *file* symlink pointing out of
the root is refused by name; one that stays inside the root is still read,
because a root is defined by the bytes it holds.

One recorded boundary of that recursion remains: ``Path.rglob`` does not follow
directory symlinks on this Python, so item files reachable only through a
symlinked subdirectory still go unmeasured. That case is unexplored, not
handled, and the anchor above does not close it — the anchor refuses files that
are listed and lead outward, while an unfollowed directory is never listed at
all.

The four item seeds and the source manifest in
``data/component-master/registry/v1`` are zero-record, so the registry root
still holds no coverage item at all and every release built from it says in
words that it covers nothing.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
import json
import math
from pathlib import Path
from types import MappingProxyType
import unicodedata

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

UNCLASSIFIED_REASONS: tuple[str, ...] = (
    "CLASSIFICATION_ABSENT",
    "CLASSIFICATION_UNRECOGNIZED",
)

# A source named in the denominator that nobody has read yet. Named for what it
# is — declared by somebody, unread by everybody — so that a reader who has
# never seen this module cannot mistake it for a weaker form of REGISTERED,
# and so that it can never be confused with BLOCKED, which means somebody tried
# to read a source and could not.
DECLARED_UNREAD_STATE = "DECLARED_UNREAD"

SOURCE_DENOMINATOR_STATES: tuple[str, ...] = (
    "BLOCKED",
    DECLARED_UNREAD_STATE,
    "REGISTERED",
)

# The complete row contract for `source-denominator.jsonl`, decided by `state`.
# Every listed field is required and no unlisted field is admitted: an optional
# `sha256` is how a registered source silently loses its digest, and an optional
# `blocked_reason` is how "nobody has tried" quietly becomes "could not read".
# `blocked_reason` is reused verbatim from `evidence-manifest.jsonl`, where it
# already names why a source is unavailable.
DECLARED_DENOMINATOR_FIELDS_BY_STATE: Mapping[str, tuple[str, ...]] = (
    MappingProxyType(
        {
            "BLOCKED": ("blocked_reason", "sha256", "source_id", "state"),
            DECLARED_UNREAD_STATE: ("source_id", "state", "url"),
        }
    )
)

# The complete row contract for `brand-universe.jsonl`. `source_ids` is not
# optional: a brand that claims no source declares no work, and a name with no
# work behind it measures nothing.
BRAND_UNIVERSE_FIELDS: tuple[str, ...] = (
    "brand_id",
    "brand_name",
    "source_ids",
)

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
    # Named after the state, and deliberately not collapsed into
    # SOURCE_NOT_REGISTERED: "the denominator does not hold this source at all"
    # is a different and less alarming fact than "the denominator holds it, and
    # nobody has read it yet".
    "SOURCE_DECLARED_UNREAD",
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
    "SOURCE_DECLARED_UNREAD",
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


_DECLARED_URL_SCHEME = "https://"

# RFC 3986 section 2: a URI is built from this ASCII repertoire and nothing
# else. Written as the four named groups rather than one opaque string, so a
# reviewer can check each group against the RFC instead of against a blob.
_URI_UNRESERVED = (
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789"
    "-._~"
)
_URI_GEN_DELIMS = ":/?#[]@"
_URI_SUB_DELIMS = "!$&'()*+,;="
_URI_PERCENT = "%"
_DECLARED_URL_PERMITTED = frozenset(
    _URI_UNRESERVED + _URI_GEN_DELIMS + _URI_SUB_DELIMS + _URI_PERCENT
)


def _character_name(character: str) -> str:
    """Name a character for a refusal message, or say plainly that it has none."""

    try:
        return unicodedata.name(character)
    except ValueError:
        return "no Unicode name"


def _require_declared_url(value: object, field_name: str) -> str:
    """Require an ``https://`` URL built only from RFC 3986 URI characters.

    This is a **declared location, not a visited one.** Nothing in this module
    fetches it, and recording it asserts no right to what is behind it. The
    shape rules exist so that the string is a locator somebody could act on,
    not so that it is a claim about reachability.

    The character rule is load-bearing rather than cosmetic. The whole point of
    a ``DECLARED_UNREAD`` row is that a later task fetches **exactly** what is
    written here, and the only thing standing between the transcription and
    that fetch is a human reading the committed line. A character that human
    cannot see makes the committed bytes differ from the URL they approved, and
    it survives a character-for-character transcription check. ``str.isspace()``
    is what this function used to rely on, and it is false for every zero-width
    and format character: U+200B, U+FEFF, U+2060, U+200E and U+00AD were all
    admitted, and so was U+0000.

    **The decision taken here, and the one not taken.** The admitted set is the
    explicit RFC 3986 URI repertoire — unreserved, gen-delims, sub-delims and
    the ``%`` that introduces an escape — which is ASCII and nothing else. The
    alternative was to refuse the ``Cf`` and ``Cc`` categories plus
    non-printables and to record the homograph case as a standing exposure. The
    explicit set was chosen because a Cyrillic ``a`` (U+0430) in an otherwise
    Latin host name is the *same* defect as a zero-width space — the committed
    bytes differ from what every reviewer read — and refusing one spelling of a
    single failure while merely recording the other would treat half of it as
    acceptable.

    **What this excludes, stated rather than left implicit:**

    - An internationalised domain name written as a U-label — the host spelled
      in its own script, the way a browser displays it. The **IDN itself is not
      excluded**: its A-label form, ``https://xn--hfele-vqa.example``, is
      admitted, is what DNS actually resolves, and is what RFC 3986 already
      requires of a URI rather than an IRI. The cost is real — an A-label is
      harder for a human to read than a U-label — and it is paid deliberately,
      because a U-label is precisely the string a homograph hides in.
    - A non-ASCII byte written literally in a path or query. It must be
      percent-encoded, which RFC 3986 also requires.

    **What this does not close, stated rather than claimed.** Confusables that
    are *inside* the admitted set remain: ``1`` against ``l``, ``0`` against
    ``O``, ``rn`` against ``m``. All are ASCII, all are admitted, and all can
    still make a reviewer read one host while a fetcher reaches another. This
    rule bounds the class where the character is invisible or has no ASCII
    glyph at all. It does not bound the class where two admitted glyphs look
    alike in some font, and nothing here should be read as if it did.
    """

    text = _require_string(value, field_name)
    # Checked before the scheme, so an invisible character is named even when
    # the scheme is wrong too. This subsumes the previous whitespace refusal:
    # U+0020 and U+00A0 are both outside the permitted set.
    for index, character in enumerate(text):
        if character in _DECLARED_URL_PERMITTED:
            continue
        raise ValueError(
            f"{field_name} must be built from the RFC 3986 URI character set; "
            f"position {index} holds U+{ord(character):04X} "
            f"({_character_name(character)}), which is not in it. A declared "
            "source is fetched later by exactly the bytes written here, so a "
            "character a reviewer cannot see, or one that reads as a Latin "
            "letter and is not, would make the committed URL differ from the "
            "URL every human approved. Write an internationalised host as its "
            "xn-- A-label and any other non-ASCII byte percent-encoded"
        )
    if not text.startswith(_DECLARED_URL_SCHEME) or len(text) <= len(
        _DECLARED_URL_SCHEME
    ):
        raise ValueError(
            f"{field_name} must be an {_DECLARED_URL_SCHEME} URL naming a "
            "declared source root. It records where a source would be read "
            "from; it asserts nothing about whether it resolves, is current, "
            "or may be used"
        )
    return text


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
class BrandUniverseEntry:
    """One brand this registry intends to review, and the sources it answers for.

    A declared brand is **work not yet done**, never coverage. It carries no
    count of its own beyond the two this snapshot publishes, and nothing here
    says how many brands the connector market has.
    """

    brand_id: str
    brand_name: str
    source_ids: tuple[str, ...]

    def __post_init__(self) -> None:
        _require_canonical_id(self.brand_id, "brand_id")
        _require_string(self.brand_name, "brand_name")
        supplied = _snapshot_iterable(self.source_ids, "source_ids")
        if not supplied:
            raise ValueError(
                "source_ids must name at least one source: a brand that "
                "claims no source declares no work and measures nothing"
            )
        identifiers = tuple(
            _require_canonical_id(value, "source_ids") for value in supplied
        )
        if len(identifiers) != len(set(identifiers)):
            raise ValueError("duplicate source_ids entry")
        object.__setattr__(self, "source_ids", tuple(sorted(identifiers)))

    def as_payload(self) -> Mapping[str, object]:
        return MappingProxyType(
            {
                "brand_id": self.brand_id,
                "brand_name": self.brand_name,
                "source_ids": tuple(self.source_ids),
            }
        )


@dataclass(frozen=True)
class SourceDenominatorEntry:
    """One source in the measured denominator, in one of three states.

    The field contract is decided by ``state`` rather than shared across
    states. A digest is **required** where bytes were expected and **refused**
    where none can exist, because a digest that is merely optional is how a
    registered source quietly loses its hash and how a source nobody has read
    quietly acquires one.
    """

    source_id: str
    sha256: str | None
    state: str
    url: str | None = None

    def __post_init__(self) -> None:
        _require_canonical_id(self.source_id, "source_id")
        state = _require_member(self.state, "state", SOURCE_DENOMINATOR_STATES)
        if state == DECLARED_UNREAD_STATE:
            if self.sha256 is not None:
                raise ValueError(
                    f"sha256 must be absent for state {DECLARED_UNREAD_STATE}: "
                    "nobody has read these bytes, so no digest exists and "
                    "supplying one would publish a claim nobody can check"
                )
            _require_declared_url(self.url, "url")
            return
        _require_sha256(self.sha256, "sha256")
        if self.url is not None:
            raise ValueError(
                f"url is carried only by state {DECLARED_UNREAD_STATE}; a "
                "source that has been read or attempted records its location "
                "in evidence-manifest.jsonl"
            )

    def as_payload(self) -> Mapping[str, object]:
        if self.state == DECLARED_UNREAD_STATE:
            # No ``sha256`` key at all, rather than a null one. A null would
            # read as "digest unknown"; the truth is that no digest can exist
            # for bytes nobody holds, and the absent key says exactly that.
            return MappingProxyType(
                {
                    "source_id": self.source_id,
                    "state": self.state,
                    "url": self.url,
                }
            )
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
        if state == DECLARED_UNREAD_STATE:
            # Named distinctly, before the blocked mapping below. A declared
            # source has no `blocked_reason` to map, and collapsing it into
            # SOURCE_BLOCKED_IN_MANIFEST would report a read that failed where
            # no read was ever attempted.
            return "SOURCE_DECLARED_UNREAD"
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


def _require_brand_source_agreement(
    brands: tuple["BrandUniverseEntry", ...],
    denominator: tuple["SourceDenominatorEntry", ...],
) -> None:
    """Refuse any disagreement between the two declaration files.

    Called from :func:`discover_registry_root` **and** from
    :class:`CoverageSnapshot`, so the two enforcement points answer the same
    question the same way. Task 8's wave 1 lesson was that an invariant living
    inside one caller is a convention, not an invariant of the record.

    Three shapes are refused, each in both directions where a direction exists:
    a brand claiming a source the denominator does not hold; two brands
    claiming the same source; and a ``DECLARED_UNREAD`` source no brand claims.
    The last is scoped to that state on purpose — a ``BLOCKED`` source reaches
    the denominator from ``evidence-manifest.jsonl``, where no brand is
    involved at all, so requiring a claim for it would refuse a shape this
    reader produces itself.
    """

    known_sources = {entry.source_id for entry in denominator}
    claimed_by: dict[str, str] = {}
    problems: list[str] = []
    for brand in brands:
        for source_id in brand.source_ids:
            owner = claimed_by.get(source_id)
            if owner is not None:
                problems.append(
                    f"{source_id} is claimed by both {owner} and "
                    f"{brand.brand_id}; a source answers to one brand"
                )
                continue
            claimed_by[source_id] = brand.brand_id
            if source_id not in known_sources:
                problems.append(
                    f"{brand.brand_id} claims {source_id}, which "
                    f"{SOURCE_DENOMINATOR_FILENAME} does not declare and "
                    f"{SOURCE_MANIFEST_FILENAME} does not name"
                )
    for entry in denominator:
        if entry.state != DECLARED_UNREAD_STATE:
            continue
        if entry.source_id not in claimed_by:
            problems.append(
                f"{entry.source_id} is declared {DECLARED_UNREAD_STATE} but no "
                f"row of {BRAND_UNIVERSE_FILENAME} claims it; a source nobody "
                "answers for names no work"
            )
    if problems:
        raise ValueError(
            f"{BRAND_UNIVERSE_FILENAME} and {SOURCE_DENOMINATOR_FILENAME} "
            "disagree: " + "; ".join(sorted(problems))
        )


def _require_blocked_source_agreement(
    blocked: tuple["BlockedSource", ...],
    denominator: tuple["SourceDenominatorEntry", ...],
) -> None:
    """Refuse a record that publishes one source as blocked and as something else.

    ``BLOCKED`` means somebody tried to read a source and could not.
    ``DECLARED_UNREAD`` means nobody has tried. ``REGISTERED`` means the bytes
    were read and hash-verified. A record naming a source in
    ``blocked_sources`` while its denominator row calls it ``DECLARED_UNREAD``
    publishes *we tried and failed* and *we have not tried* about the same
    source, which is exactly the collapse OR-9.1 forbids in either direction.

    Task 9 added the third state and thereby widened the pair
    :func:`_require_backed_verified_claims` had recorded as uncross-checked —
    a record naming a source as both blocked and ``REGISTERED``. That record
    named only the ``REGISTERED`` variant, so the exposure grew while the
    limitation did not. Extending the recorded limit was the alternative;
    cross-checking was chosen because this module's own principle is that an
    invariant living in one caller is a convention, and both variants are
    cheap to refuse in one place.

    A blocked source the denominator does not name at all is refused too:
    ``blocked_source_count`` publishes its count against
    ``len(source_denominator)``, so such a source would be counted against a
    denominator it is not a member of.

    This is enforced on :class:`CoverageSnapshot` and nowhere else, on purpose.
    :func:`discover_registry_root` writes a ``BLOCKED`` denominator row for
    every blocked source it records, so the disagreement is unreachable
    through it and a second call there would be a check that can never fire. A
    hand-built record is the only way in, and the record is where the check
    belongs.
    """

    states = {entry.source_id: entry.state for entry in denominator}
    problems: list[str] = []
    for record in blocked:
        state = states.get(record.source_id)
        if state is None:
            problems.append(
                f"{record.source_id} is named in blocked_sources but the "
                "source denominator does not hold it, so blocked_source_count "
                "would count it against a denominator it is not in"
            )
        elif state != "BLOCKED":
            problems.append(
                f"{record.source_id} is named in blocked_sources but the "
                f"source denominator holds it as {state}; BLOCKED means "
                "somebody tried to read a source and could not, and nothing "
                "may collapse that with another state in either direction"
            )
    if problems:
        raise ValueError(
            "blocked_sources and source_denominator disagree: "
            + "; ".join(sorted(problems))
        )


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
      ``source_denominator`` itself. That is no longer a gap in the record:
      :func:`_require_blocked_source_agreement` now refuses the disagreement
      on :class:`CoverageSnapshot`, for every state and not only for
      ``REGISTERED``, and it runs before this floor does.
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
    # Declared work, not coverage. Defaulted so that a snapshot over a root
    # with no `brand-universe.jsonl` is a legitimate measurement of "no brand
    # declared", rather than a construction error.
    brand_universe: tuple[BrandUniverseEntry, ...] = ()

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
        brands = tuple(
            _snapshot_exact(record, BrandUniverseEntry, "brand_universe")
            for record in _snapshot_iterable(
                self.brand_universe, "brand_universe"
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
        brand_ids = tuple(entry.brand_id for entry in brands)
        if len(brand_ids) != len(set(brand_ids)):
            raise ValueError("duplicate brand_id")
        brand_names = tuple(entry.brand_name for entry in brands)
        if len(brand_names) != len(set(brand_names)):
            # Two IDs sharing one display name make the published cohort
            # unreadable: a reader counting names would count fewer brands
            # than the denominator states.
            raise ValueError("duplicate brand_name")
        _require_brand_source_agreement(brands, denominator)
        _require_blocked_source_agreement(blocked, denominator)
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
        object.__setattr__(
            self,
            "brand_universe",
            tuple(sorted(brands, key=lambda entry: entry.brand_id)),
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
    def declared_unread_source_count(self) -> MeasuredCount:
        """Sources named in the denominator that nobody has read yet.

        Its own count with its own denominator, carried so that
        :attr:`coverage_statement` can speak it. A third state excluded from
        ``registered_source_count`` but never spoken is exactly the coverage
        inflation this module exists to prevent.
        """

        return self._count(
            "sources_declared_but_not_yet_read",
            sum(
                1
                for entry in self.source_denominator
                if entry.state == DECLARED_UNREAD_STATE
            ),
            denominator=len(self.source_denominator),
            denominator_label="sources_in_denominator",
            measured_by=_MEASURED_BY_DISCOVERY,
        )

    @property
    def first_cohort_brand_count(self) -> MeasuredCount:
        """Declared brands with at least one source read and hash-verified.

        The denominator is the declared cohort, which is a **chosen list, not
        a market**. No count here has the number of connector brands in the
        world as a denominator, because this module does not know it and will
        not invent it.
        """

        registered = {
            entry.source_id
            for entry in self.source_denominator
            if entry.state == "REGISTERED"
        }
        return self._count(
            "first_cohort_brands_with_a_source_read",
            sum(
                1
                for brand in self.brand_universe
                if registered.intersection(brand.source_ids)
            ),
            denominator=len(self.brand_universe),
            denominator_label="declared_first_cohort_brands",
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
            self.declared_unread_source_count,
            self.first_cohort_brand_count,
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
        declared = self.declared_unread_source_count
        cohort = self.first_cohort_brand_count
        parts = [
            f"{classified.count} of {classified.denominator} discovered "
            f"registry items classified",
            f"{verified.count} of {verified.denominator} counted as verified "
            f"with backing evidence",
            f"{unbacked.count} of {unbacked.denominator} verified claims "
            f"refused by the evidence gate",
            f"{registered.count} of {registered.denominator} named sources "
            f"readable and hash-verified",
            # The owner's binding constraint on OR-9.1, rendered in words with
            # its own denominator so the published sentence cannot be read as
            # coverage.
            f"{declared.count} of {declared.denominator} named sources "
            f"declared but not yet read",
            f"{blocked.count} of {blocked.denominator} named sources blocked",
            f"{cohort.count} of {cohort.denominator} declared first-cohort "
            f"brands with at least one source read",
        ]
        statement = "; ".join(parts) + "."
        if self.discovered_item_count == 0:
            statement += (
                " The registry root holds zero records, so this release "
                "covers nothing."
            )
        if self.brand_universe:
            statement += (
                " The declared brands are a first cohort selected for review, "
                "not the connector market; a source named here has not been "
                "fetched, read, or rights-reviewed by this measurement."
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
    brand_universe: tuple[BrandUniverseEntry, ...] = ()


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


def _require_inside_root(root: Path, path: Path, origin: str) -> Path:
    """Refuse a file this reader would open that resolves outside the root.

    ``content_path`` has been root-anchored since Task 8 by
    :func:`_resolve_inside`, and correctly refuses ``../../escape.bin``. The
    JSONL entry points were not anchored at all, and a **file** symlink is what
    separates the two cases. ``Path.rglob`` declines to descend into a
    symlinked *directory*, which is why the boundary recorded in this module
    named directories only; it lists a symlinked *file* like any other entry,
    and this reader then followed it straight out of the root. Task 9 added two
    contract-bearing entry points at that root — ``brand-universe.jsonl`` and
    ``source-denominator.jsonl`` — so the exposure grew while the record did
    not.

    The rule is *anchored*, not *no symlinks*: a link that stays inside the
    root is still read, because a registry root is defined by the bytes it
    holds and such a link does not leave them.

    Directory symlinks are still not followed, and that remains unhandled
    rather than fixed: a subdirectory reached only through one goes unmeasured.
    """

    resolved = path.resolve()
    resolved_root = root.resolve()
    if not resolved.is_relative_to(resolved_root):
        raise ValueError(
            f"{origin}: this file resolves to {resolved}, outside the "
            f"registry root {resolved_root}. A release measures the bytes its "
            "root holds; following a link out of the root would let a release "
            "publish content the root does not contain and a reader cannot "
            "find"
        )
    return resolved


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
    _require_inside_root(root, manifest_path, SOURCE_MANIFEST_FILENAME)

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
        # `state` is read first, because it decides which fields the row may
        # hold. Validating a shared field union first would have to admit both
        # `sha256` and `url` for every state, and an admitted-then-ignored
        # field is the silence this module refuses.
        if "state" not in payload:
            raise ValueError(
                f"{origin}: missing required field state; state decides which "
                "fields a declared denominator row may hold, so it cannot be "
                "inferred"
            )
        try:
            state = _require_member(
                payload["state"], "state", SOURCE_DENOMINATOR_STATES
            )
        except (TypeError, ValueError) as error:
            raise ValueError(f"{origin}: {error}") from error
        if state == "REGISTERED":
            raise ValueError(
                f"{origin}: state REGISTERED cannot be declared in "
                f"{SOURCE_DENOMINATOR_FILENAME}. This reader holds no bytes "
                "for a source declared here, so it cannot re-verify the "
                "digest, and the coverage statement publishes REGISTERED as "
                "\"readable and hash-verified\". Declare such a source in "
                f"{SOURCE_MANIFEST_FILENAME} with a content_path instead."
            )

        admitted = DECLARED_DENOMINATOR_FIELDS_BY_STATE[state]
        unknown = sorted(set(payload) - set(admitted))
        if unknown:
            raise ValueError(
                f"{origin}: unrecognized field(s) "
                + ", ".join(unknown)
                + f"; a row in state {state} holds exactly "
                + ", ".join(admitted)
                + ". A field belonging to another state is refused here rather "
                "than accepted and dropped."
            )
        missing = sorted(name for name in admitted if name not in payload)
        if missing:
            raise ValueError(
                f"{origin}: missing required field(s) "
                + ", ".join(missing)
                + f"; a row in state {state} must state "
                + ", ".join(admitted)
            )

        try:
            entry = SourceDenominatorEntry(
                source_id=payload["source_id"],
                sha256=(
                    None
                    if state == DECLARED_UNREAD_STATE
                    else payload["sha256"]
                ),
                state=state,
                url=(
                    payload["url"]
                    if state == DECLARED_UNREAD_STATE
                    else None
                ),
            )
            record = (
                None
                if state == DECLARED_UNREAD_STATE
                else BlockedSource(
                    source_id=payload["source_id"],
                    reason=payload["blocked_reason"],
                )
            )
        except (TypeError, ValueError) as error:
            raise ValueError(f"{origin}: {error}") from error

        if entry.source_id in seen_sources:
            raise ValueError(
                f"{origin}: duplicate source_id {entry.source_id}"
            )
        seen_sources.add(entry.source_id)
        denominator.append(entry)
        if record is not None:
            blocked.append(record)
    return tuple(blocked), tuple(denominator)


def _read_brand_universe(
    path: Path,
    relative: str,
) -> tuple[BrandUniverseEntry, ...]:
    """Read ``brand-universe.jsonl`` into the declared first cohort.

    Every refusal names the file, the line, and the exact field or value that
    is wrong. Duplicate IDs and duplicate display names are both refused here,
    so a refusal can name the offending line; :class:`CoverageSnapshot`
    enforces the same two invariants over the record, for callers that never
    went through a file.
    """

    brands: list[BrandUniverseEntry] = []
    seen_ids: set[str] = set()
    seen_names: set[str] = set()
    for line_number, payload in _read_jsonl(path, relative):
        origin = f"{relative}:{line_number}"
        unknown = sorted(set(payload) - set(BRAND_UNIVERSE_FIELDS))
        if unknown:
            raise ValueError(
                f"{origin}: unrecognized field(s) "
                + ", ".join(unknown)
                + "; a brand row holds exactly "
                + ", ".join(BRAND_UNIVERSE_FIELDS)
                + ". A brand row is a declaration of intended work, not a "
                "record of a source that has been read; what a source turns "
                f"out to hold belongs in {SOURCE_MANIFEST_FILENAME}."
            )
        missing = sorted(
            name for name in BRAND_UNIVERSE_FIELDS if name not in payload
        )
        if missing:
            raise ValueError(
                f"{origin}: missing required field(s) "
                + ", ".join(missing)
                + "; a brand row must state "
                + ", ".join(BRAND_UNIVERSE_FIELDS)
            )
        try:
            entry = BrandUniverseEntry(
                brand_id=payload["brand_id"],
                brand_name=payload["brand_name"],
                source_ids=payload["source_ids"],
            )
        except (TypeError, ValueError) as error:
            raise ValueError(f"{origin}: {error}") from error
        if entry.brand_id in seen_ids:
            raise ValueError(f"{origin}: duplicate brand_id {entry.brand_id}")
        if entry.brand_name in seen_names:
            raise ValueError(
                f"{origin}: duplicate brand_name {entry.brand_name}; two IDs "
                "sharing one display name make the published cohort count "
                "disagree with the names a reader can see"
            )
        seen_ids.add(entry.brand_id)
        seen_names.add(entry.brand_name)
        brands.append(entry)
    return tuple(brands)


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
        # Anchored here, after the two skips, so the rule covers exactly the
        # files this reader goes on to open. The same anchor guards the source
        # manifest inside `_discover_sources`, and `_resolve_inside` has
        # guarded `content_path` since Task 8.
        _require_inside_root(root_path, path, relative)
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
    brand_universe: tuple[BrandUniverseEntry, ...] = ()
    seen_sources = {entry.source_id for entry in denominator}
    for relative, path in denominator_files:
        if relative == BRAND_UNIVERSE_FILENAME:
            brand_universe = _read_brand_universe(path, relative)
            continue
        extra_blocked, extra_entries = _read_declared_denominator(
            path, relative, seen_sources
        )
        declared_blocked.extend(extra_blocked)
        declared_denominator.extend(extra_entries)
    # Cross-file, so it runs once both files have been read. The same rule is
    # an invariant of `CoverageSnapshot`; this call is what lets the refusal
    # name the two files a reader has to edit.
    _require_brand_source_agreement(
        brand_universe, denominator + tuple(declared_denominator)
    )

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
        brand_universe=brand_universe,
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
        brand_universe=discovered.brand_universe,
    )
