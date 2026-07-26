"""Immutable OEM source snapshots and field-level evidence assertions."""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import re


_SHA256_PATTERN = re.compile(r"[0-9a-f]{64}")
_REVIEW_STATES = frozenset({"PENDING", "VERIFIED"})


def _require_prefixed(value: object, field_name: str, prefix: str) -> None:
    if not isinstance(value, str):
        raise TypeError(f"{field_name} must be a string")
    if not value.startswith(prefix) or not value[len(prefix) :].strip():
        raise ValueError(
            f"{field_name} must start with {prefix!r} and contain an identifier"
        )


def _require_nonblank(value: object, field_name: str) -> None:
    if not isinstance(value, str):
        raise TypeError(f"{field_name} must be a string")
    if not value.strip():
        raise ValueError(f"{field_name} must not be blank")


def _require_string(value: object, field_name: str) -> None:
    if not isinstance(value, str):
        raise TypeError(f"{field_name} must be a string")


def _copy_bytes(stored_bytes: object) -> bytes:
    try:
        return memoryview(stored_bytes).tobytes()
    except TypeError as error:
        raise TypeError("stored_bytes must be bytes-like") from error


@dataclass(frozen=True)
class SourceSnapshot:
    source_id: str
    publisher: str
    url: str
    edition: str
    region: str
    accessed_at: str
    sha256: str
    rights_state: str

    def __post_init__(self) -> None:
        _require_prefixed(self.source_id, "source_id", "source:")
        for field_name in (
            "publisher",
            "url",
            "edition",
            "region",
            "accessed_at",
            "rights_state",
        ):
            _require_nonblank(getattr(self, field_name), field_name)
        if not isinstance(self.sha256, str):
            raise TypeError("sha256 must be a string")
        if _SHA256_PATTERN.fullmatch(self.sha256) is None:
            raise ValueError(
                "sha256 must be exactly 64 lowercase hexadecimal characters"
            )


@dataclass(frozen=True)
class FieldAssertion:
    assertion_id: str
    entity_id: str
    field_path: str
    value: object
    source_id: str
    locator: str
    reviewer: str
    review_state: str

    def __post_init__(self) -> None:
        _require_prefixed(self.assertion_id, "assertion_id", "assertion:")
        _require_nonblank(self.entity_id, "entity_id")
        _require_nonblank(self.field_path, "field_path")
        _require_prefixed(self.source_id, "source_id", "source:")
        if not isinstance(self.review_state, str):
            raise TypeError("review_state must be a string")
        if self.review_state not in _REVIEW_STATES:
            raise ValueError("review_state must be PENDING or VERIFIED")
        if self.review_state == "VERIFIED":
            _require_nonblank(self.locator, "locator")
            _require_nonblank(self.reviewer, "reviewer")
        else:
            _require_string(self.locator, "locator")
            _require_string(self.reviewer, "reviewer")


def verify_source_hash(
    source: SourceSnapshot,
    stored_bytes: bytes | bytearray | memoryview,
) -> bool:
    """Compare a snapshot digest with the SHA-256 of the exact stored bytes."""

    if not isinstance(source, SourceSnapshot):
        raise TypeError("source must be a SourceSnapshot")
    content = _copy_bytes(stored_bytes)
    return hashlib.sha256(content).hexdigest() == source.sha256


class EvidenceVault:
    """Minimal fail-closed registration boundary for evidence metadata."""

    def __init__(self) -> None:
        self._sources: dict[str, SourceSnapshot] = {}
        self._stored_source_bytes: dict[str, bytes] = {}
        self._assertions: dict[str, FieldAssertion] = {}

    def register(
        self,
        item: SourceSnapshot | FieldAssertion,
        stored_bytes: bytes | bytearray | memoryview | None = None,
    ) -> None:
        if isinstance(item, SourceSnapshot):
            if stored_bytes is None:
                raise TypeError(
                    "stored_bytes are required for SourceSnapshot registration"
                )
            if item.source_id in self._sources:
                raise ValueError(f"duplicate source_id: {item.source_id}")
            content = _copy_bytes(stored_bytes)
            if not verify_source_hash(item, content):
                raise ValueError("stored source bytes do not match sha256")
            self._sources[item.source_id] = item
            self._stored_source_bytes[item.source_id] = content
            return

        if isinstance(item, FieldAssertion):
            if stored_bytes is not None:
                raise TypeError(
                    "stored_bytes are not accepted for FieldAssertion registration"
                )
            if item.assertion_id in self._assertions:
                raise ValueError(
                    f"duplicate assertion_id: {item.assertion_id}"
                )
            if item.review_state == "VERIFIED":
                source = self._sources.get(item.source_id)
                content = self._stored_source_bytes.get(item.source_id)
                if source is None or content is None:
                    raise ValueError(
                        "VERIFIED assertion requires a registered source"
                    )
                if not verify_source_hash(source, content):
                    raise ValueError(
                        "registered source bytes do not match sha256"
                    )
            self._assertions[item.assertion_id] = item
            return

        raise TypeError(
            "item must be a SourceSnapshot or FieldAssertion"
        )

    def get_source(self, source_id: str) -> SourceSnapshot | None:
        return self._sources.get(source_id)

    def get_assertion(self, assertion_id: str) -> FieldAssertion | None:
        return self._assertions.get(assertion_id)
