"""Immutable exact-SKU BOM and compatibility graph contracts."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from enum import Enum
import math
from numbers import Real
import re

from .registry_models import (
    CommercialSku,
    LifecycleState,
    Registry,
)


class EdgeType(str, Enum):
    REQUIRES = "REQUIRES"
    OPTIONAL = "OPTIONALLY_USES"
    COMPATIBLE = "COMPATIBLE_WITH"
    INCOMPATIBLE = "INCOMPATIBLE_WITH"
    REPLACES = "REPLACES"
    SUPERSEDES = "SUPERSEDES"
    REGION_VARIANT = "REGION_VARIANT_OF"
    GEOMETRY_VARIANT = "GEOMETRY_VARIANT_OF"
    TOOLED_BY = "TOOLED_BY"
    MACHINED_BY = "MACHINED_BY"
    INSTALLED_WITH = "INSTALLED_WITH"
    QUALIFIED_WITH = "QUALIFIED_WITH"
    REQUIRES_MATERIAL_CONDITION = "REQUIRES_MATERIAL_CONDITION"


_BOM_EDGE_TYPES = frozenset(
    {
        EdgeType.REQUIRES,
        EdgeType.OPTIONAL,
        EdgeType.TOOLED_BY,
        EdgeType.MACHINED_BY,
        EdgeType.INSTALLED_WITH,
        EdgeType.QUALIFIED_WITH,
        EdgeType.REQUIRES_MATERIAL_CONDITION,
    }
)
_COMPATIBILITY_EDGE_TYPES = frozenset(
    {
        EdgeType.COMPATIBLE,
        EdgeType.INCOMPATIBLE,
        EdgeType.REPLACES,
        EdgeType.SUPERSEDES,
        EdgeType.REGION_VARIANT,
        EdgeType.GEOMETRY_VARIANT,
    }
)
_REQUIRED_TARGET_EDGE_TYPES = frozenset(
    {
        EdgeType.REQUIRES,
        EdgeType.TOOLED_BY,
        EdgeType.MACHINED_BY,
        EdgeType.INSTALLED_WITH,
        EdgeType.QUALIFIED_WITH,
        EdgeType.REQUIRES_MATERIAL_CONDITION,
    }
)
_REGISTERED_EXTRA_NAMESPACES = frozenset(
    {"tool", "machine", "material", "qualification"}
)
_CANONICAL_IDENTIFIER = re.compile(
    r"^[a-z][a-z0-9_-]*(?::[A-Za-z0-9][A-Za-z0-9._-]*)+$"
)


def _require_nonblank(
    value: object,
    field_name: str,
) -> None:
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


def _require_sku_identifier(
    value: object,
    field_name: str,
) -> None:
    _require_canonical_identifier(value, field_name)
    if not value.startswith("sku:") or not value[4:].strip():
        raise ValueError(
            f"{field_name} must start with 'sku:' "
            "and contain an identifier"
        )


def _copy_evidence_assertion_ids(
    value: object,
) -> tuple[str, ...]:
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
        _require_canonical_identifier(
            assertion_id,
            "evidence_assertion_ids",
        )
        if not assertion_id.startswith("assertion:"):
            raise ValueError(
                "evidence_assertion_ids must contain assertion: IDs"
            )
    if len(set(assertion_ids)) != len(assertion_ids):
        raise ValueError(
            "evidence_assertion_ids must not contain duplicates"
        )
    return assertion_ids


def _require_edge_type(
    value: object,
    allowed: frozenset[EdgeType],
    record_name: str,
) -> None:
    if not isinstance(value, EdgeType):
        raise TypeError("edge_type must be an EdgeType")
    if value not in allowed:
        raise ValueError(
            f"edge_type is not allowed for {record_name}"
        )


@dataclass(frozen=True)
class BomEdge:
    assembly_sku_id: str
    component_id: str
    edge_type: EdgeType
    quantity: float
    region: str
    evidence_assertion_ids: tuple[str, ...]

    def __post_init__(self) -> None:
        _require_sku_identifier(
            self.assembly_sku_id,
            "assembly_sku_id",
        )
        _require_canonical_identifier(
            self.component_id,
            "component_id",
        )
        _require_edge_type(
            self.edge_type,
            _BOM_EDGE_TYPES,
            "BomEdge",
        )
        if isinstance(self.quantity, bool) or not isinstance(
            self.quantity,
            Real,
        ):
            raise TypeError("quantity must be a real number")
        if not math.isfinite(self.quantity):
            raise ValueError("quantity must be finite")
        if self.quantity <= 0:
            raise ValueError("quantity must be positive")
        _require_nonblank(self.region, "region")
        object.__setattr__(
            self,
            "evidence_assertion_ids",
            _copy_evidence_assertion_ids(
                self.evidence_assertion_ids
            ),
        )


@dataclass(frozen=True)
class CompatibilityEdge:
    source_id: str
    target_id: str
    edge_type: EdgeType
    region: str
    evidence_assertion_ids: tuple[str, ...]

    def __post_init__(self) -> None:
        _require_canonical_identifier(self.source_id, "source_id")
        _require_canonical_identifier(self.target_id, "target_id")
        _require_edge_type(
            self.edge_type,
            _COMPATIBILITY_EDGE_TYPES,
            "CompatibilityEdge",
        )
        _require_nonblank(self.region, "region")
        object.__setattr__(
            self,
            "evidence_assertion_ids",
            _copy_evidence_assertion_ids(
                self.evidence_assertion_ids
            ),
        )


@dataclass(frozen=True)
class GraphIssue:
    code: str
    entity_id: str
    related_id: str
    message: str


def _copy_bom_edges(
    values: Iterable[BomEdge],
) -> tuple[BomEdge, ...]:
    try:
        edges = tuple(values)
    except TypeError as error:
        raise TypeError("bom_edges must be an iterable") from error
    if any(not isinstance(edge, BomEdge) for edge in edges):
        raise TypeError("bom_edges must contain BomEdge values")
    if len(set(edges)) != len(edges):
        raise ValueError("duplicate BomEdge record")
    return edges


def _copy_compatibility_edges(
    values: Iterable[CompatibilityEdge],
) -> tuple[CompatibilityEdge, ...]:
    try:
        edges = tuple(values)
    except TypeError as error:
        raise TypeError(
            "compatibility_edges must be an iterable"
        ) from error
    if any(
        not isinstance(edge, CompatibilityEdge)
        for edge in edges
    ):
        raise TypeError(
            "compatibility_edges must contain CompatibilityEdge values"
        )
    if len(set(edges)) != len(edges):
        raise ValueError("duplicate CompatibilityEdge record")
    return edges


def _copy_registered_extra_ids(
    values: Iterable[str],
) -> frozenset[str]:
    try:
        entity_ids = tuple(values)
    except TypeError as error:
        raise TypeError(
            "registered_entity_ids must be an iterable"
        ) from error
    for entity_id in entity_ids:
        _require_canonical_identifier(
            entity_id,
            "registered_entity_ids",
        )
        namespace = entity_id.partition(":")[0]
        if namespace not in _REGISTERED_EXTRA_NAMESPACES:
            raise ValueError(
                "registered_entity_ids may contain only non-SKU "
                "tool, machine, material, or qualification IDs"
            )
    return frozenset(entity_ids)


def _issue_sort_key(
    issue: GraphIssue,
) -> tuple[str, str, str, str]:
    return (
        issue.code,
        issue.entity_id,
        issue.related_id,
        issue.message,
    )


def _model_is_releasable(
    sku: CommercialSku,
    registry: Registry,
    region: str,
) -> bool:
    model = registry.get_model(sku.model_id)
    if model is None:
        return False
    if model.lifecycle is LifecycleState.ACTIVE:
        return True
    return (
        model.lifecycle is LifecycleState.REGION_ONLY
        and sku.region == region
    )


@dataclass(frozen=True, init=False)
class CompatibilityGraph:
    registry: Registry
    bom_edges: tuple[BomEdge, ...]
    compatibility_edges: tuple[CompatibilityEdge, ...]
    registered_entity_ids: frozenset[str]

    def __init__(
        self,
        registry: Registry,
        bom_edges: Iterable[BomEdge],
        compatibility_edges: Iterable[CompatibilityEdge],
        registered_entity_ids: Iterable[str] = (),
    ) -> None:
        if not isinstance(registry, Registry):
            raise TypeError("registry must be a Registry")
        bom_snapshot = _copy_bom_edges(bom_edges)
        compatibility_snapshot = _copy_compatibility_edges(
            compatibility_edges
        )
        extras = _copy_registered_extra_ids(
            registered_entity_ids
        )

        object.__setattr__(self, "registry", registry)
        object.__setattr__(self, "bom_edges", bom_snapshot)
        object.__setattr__(
            self,
            "compatibility_edges",
            compatibility_snapshot,
        )
        object.__setattr__(
            self,
            "registered_entity_ids",
            frozenset(registry.skus) | extras,
        )

    def validate_release_bom(
        self,
        assembly_sku_id: str,
        region: str,
    ) -> tuple[GraphIssue, ...]:
        """Return deterministic refusal issues for one exact release BOM."""

        _require_sku_identifier(
            assembly_sku_id,
            "assembly_sku_id",
        )
        _require_nonblank(region, "region")

        assembly = self.registry.get_sku(assembly_sku_id)
        if assembly is None:
            return (
                GraphIssue(
                    code="UNKNOWN_ASSEMBLY",
                    entity_id=assembly_sku_id,
                    related_id="",
                    message="assembly SKU is not registered",
                ),
            )

        issues: set[GraphIssue] = set()
        if assembly.region != region:
            issues.add(
                GraphIssue(
                    code="ASSEMBLY_REGION_MISMATCH",
                    entity_id=assembly_sku_id,
                    related_id=assembly.region,
                    message=(
                        "assembly SKU region does not match "
                        "the requested release region"
                    ),
                )
            )
        if not _model_is_releasable(
            assembly,
            self.registry,
            region,
        ):
            issues.add(
                GraphIssue(
                    code="ASSEMBLY_LIFECYCLE_INVALID",
                    entity_id=assembly_sku_id,
                    related_id=assembly.model_id,
                    message=(
                        "assembly model lifecycle is not releasable "
                        "in the requested region"
                    ),
                )
            )

        release_edges = tuple(
            edge
            for edge in self.bom_edges
            if edge.assembly_sku_id == assembly_sku_id
            and edge.region == region
            and edge.edge_type is not EdgeType.OPTIONAL
        )
        if not release_edges:
            issues.add(
                GraphIssue(
                    code="EMPTY_RELEASE_BOM",
                    entity_id=assembly_sku_id,
                    related_id=region,
                    message=(
                        "release BOM contains no exact-region edges"
                    ),
                )
            )

        relevant_entity_ids = {assembly_sku_id}

        for edge in release_edges:
            target_id = edge.component_id
            relevant_entity_ids.add(target_id)
            if (
                edge.edge_type in _REQUIRED_TARGET_EDGE_TYPES
                and target_id not in self.registered_entity_ids
            ):
                issues.add(
                    GraphIssue(
                        code="UNREGISTERED_REQUIRED_TARGET",
                        entity_id=assembly_sku_id,
                        related_id=target_id,
                        message=(
                            "required BOM target is not registered "
                            "by its exact identifier"
                        ),
                    )
                )

            target_sku = self.registry.get_sku(target_id)
            if target_sku is not None:
                if target_sku.region != region:
                    issues.add(
                        GraphIssue(
                            code="TARGET_REGION_MISMATCH",
                            entity_id=assembly_sku_id,
                            related_id=target_id,
                            message=(
                                "referenced SKU region does not match "
                                "the requested release region"
                            ),
                        )
                    )
                if not _model_is_releasable(
                    target_sku,
                    self.registry,
                    region,
                ):
                    issues.add(
                        GraphIssue(
                            code="TARGET_LIFECYCLE_INVALID",
                            entity_id=assembly_sku_id,
                            related_id=target_id,
                            message=(
                                "referenced SKU model lifecycle is "
                                "not releasable in the requested region"
                            ),
                        )
                    )

        for edge in self.compatibility_edges:
            if (
                edge.region != region
                or edge.edge_type is not EdgeType.INCOMPATIBLE
                or edge.source_id not in relevant_entity_ids
                or edge.target_id not in relevant_entity_ids
            ):
                continue
            if assembly_sku_id in {
                edge.source_id,
                edge.target_id,
            }:
                entity_id = assembly_sku_id
                related_id = (
                    edge.target_id
                    if edge.source_id == assembly_sku_id
                    else edge.source_id
                )
            else:
                entity_id, related_id = sorted(
                    (edge.source_id, edge.target_id)
                )
            issues.add(
                GraphIssue(
                    code="INCOMPATIBLE_BOM_TARGET",
                    entity_id=entity_id,
                    related_id=related_id,
                    message=(
                        "BOM entities are explicitly incompatible"
                    ),
                )
            )

        relationship_types: dict[
            tuple[str, str], set[EdgeType]
        ] = {}
        for edge in self.compatibility_edges:
            if edge.region != region:
                continue
            pair = (edge.source_id, edge.target_id)
            relationship_types.setdefault(pair, set()).add(
                edge.edge_type
            )

        for (source_id, target_id), edge_types in (
            relationship_types.items()
        ):
            if (
                source_id not in relevant_entity_ids
                or target_id not in relevant_entity_ids
            ):
                continue
            if {
                EdgeType.COMPATIBLE,
                EdgeType.INCOMPATIBLE,
            }.issubset(edge_types):
                issues.add(
                    GraphIssue(
                        code="COMPATIBILITY_CONTRADICTION",
                        entity_id=source_id,
                        related_id=target_id,
                        message=(
                            "directed pair is both compatible and "
                            "incompatible in the release region"
                        ),
                    )
                )

        return tuple(sorted(issues, key=_issue_sort_key))


__all__ = [
    "BomEdge",
    "CompatibilityEdge",
    "CompatibilityGraph",
    "EdgeType",
    "GraphIssue",
]
