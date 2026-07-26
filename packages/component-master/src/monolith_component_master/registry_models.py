"""Immutable exact-SKU identity and verification registry models."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from enum import Enum
from types import MappingProxyType


class VerificationDimension(str, Enum):
    IDENTITY = "identity"
    GEOMETRY = "geometry"
    BOM = "bom"
    TOOLING = "tooling"
    MATERIAL_THICKNESS = "material_thickness"
    STRUCTURAL = "structural"
    COMMERCIAL = "commercial"
    FIELD = "field"
    LIFECYCLE = "lifecycle"
    RIGHTS = "rights"


class VerificationState(str, Enum):
    VERIFIED = "VERIFIED"
    PENDING = "PENDING"
    REGION_ONLY = "REGION_ONLY"
    DISCONTINUED = "DISCONTINUED"
    BLOCKED = "BLOCKED"


class LifecycleState(str, Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    REGION_ONLY = "REGION_ONLY"
    SUPERSEDED = "SUPERSEDED"
    DISCONTINUED = "DISCONTINUED"
    SOURCE_BLOCKED = "SOURCE_BLOCKED"


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


@dataclass(frozen=True)
class CommercialSku:
    global_id: str
    brand_id: str
    model_id: str
    oem_order_code: str
    region: str
    pack_qty: int
    verification: Mapping[VerificationDimension, VerificationState]

    def __post_init__(self) -> None:
        _require_prefixed(self.global_id, "global_id", "sku:")
        _require_prefixed(self.brand_id, "brand_id", "brand:")
        _require_prefixed(self.model_id, "model_id", "model:")
        _require_nonblank(self.oem_order_code, "oem_order_code")
        _require_nonblank(self.region, "region")
        if isinstance(self.pack_qty, bool) or not isinstance(self.pack_qty, int):
            raise TypeError("pack_qty must be an integer")
        if self.pack_qty <= 0:
            raise ValueError("pack_qty must be positive")
        if not isinstance(self.verification, Mapping):
            raise TypeError("verification must be a mapping")

        dimensions = tuple(self.verification)
        required = frozenset(VerificationDimension)
        if len(dimensions) != len(required):
            raise ValueError(
                "verification must contain every verification dimension exactly once"
            )
        if any(
            not isinstance(dimension, VerificationDimension)
            for dimension in dimensions
        ):
            raise TypeError(
                "verification keys must be VerificationDimension values"
            )
        if frozenset(dimensions) != required:
            raise ValueError(
                "verification must contain every verification dimension exactly once"
            )
        if any(
            not isinstance(state, VerificationState)
            for state in self.verification.values()
        ):
            raise TypeError(
                "verification values must be VerificationState values"
            )

        object.__setattr__(
            self,
            "verification",
            MappingProxyType(dict(self.verification)),
        )

    def is_verified(self, dimension: VerificationDimension) -> bool:
        return self.verification.get(dimension) is VerificationState.VERIFIED


@dataclass(frozen=True)
class ProductModel:
    model_id: str
    brand_id: str
    name: str
    lifecycle: LifecycleState

    def __post_init__(self) -> None:
        _require_prefixed(self.model_id, "model_id", "model:")
        _require_prefixed(self.brand_id, "brand_id", "brand:")
        _require_nonblank(self.name, "name")
        if not isinstance(self.lifecycle, LifecycleState):
            raise TypeError("lifecycle must be a LifecycleState")


@dataclass(frozen=True, init=False)
class Registry:
    models: Mapping[str, ProductModel]
    skus: Mapping[str, CommercialSku]

    def __init__(
        self,
        models: Iterable[ProductModel],
        skus: Iterable[CommercialSku],
    ) -> None:
        model_by_id: dict[str, ProductModel] = {}
        for model in models:
            if not isinstance(model, ProductModel):
                raise TypeError("models must contain ProductModel values")
            if model.model_id in model_by_id:
                raise ValueError(f"duplicate model_id: {model.model_id}")
            model_by_id[model.model_id] = model

        sku_by_id: dict[str, CommercialSku] = {}
        for sku in skus:
            if not isinstance(sku, CommercialSku):
                raise TypeError("skus must contain CommercialSku values")
            if sku.global_id in sku_by_id:
                raise ValueError(f"duplicate global_id: {sku.global_id}")
            sku_by_id[sku.global_id] = sku

        unknown_model_ids = sorted(
            {
                sku.model_id
                for sku in sku_by_id.values()
                if sku.model_id not in model_by_id
            }
        )
        if unknown_model_ids:
            raise ValueError(
                "SKU references unknown model_id: "
                + ", ".join(unknown_model_ids)
            )

        object.__setattr__(
            self,
            "models",
            MappingProxyType(model_by_id),
        )
        object.__setattr__(
            self,
            "skus",
            MappingProxyType(sku_by_id),
        )

    def get_model(self, model_id: str) -> ProductModel | None:
        return self.models.get(model_id)

    def get_sku(self, global_id: str) -> CommercialSku | None:
        return self.skus.get(global_id)
