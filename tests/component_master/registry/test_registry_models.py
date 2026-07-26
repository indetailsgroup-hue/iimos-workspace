"""Contracts for exact commercial identity and verification registry models."""

from __future__ import annotations

from dataclasses import FrozenInstanceError, fields
from pathlib import Path
import sys
import unittest


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
PACKAGE_SOURCE = REPOSITORY_ROOT / "packages" / "component-master" / "src"
sys.path.insert(0, str(PACKAGE_SOURCE))

from monolith_component_master.registry_models import (  # noqa: E402
    CommercialSku,
    LifecycleState,
    ProductModel,
    Registry,
    VerificationDimension,
    VerificationState,
)


def verification_states(
    **overrides: VerificationState,
) -> dict[VerificationDimension, VerificationState]:
    states = {
        dimension: VerificationState.PENDING
        for dimension in VerificationDimension
    }
    for name, state in overrides.items():
        states[VerificationDimension[name]] = state
    return states


def make_model(
    model_id: str = "model:hafele:minifix-15",
) -> ProductModel:
    return ProductModel(
        model_id=model_id,
        brand_id="brand:hafele",
        name="Minifix 15",
        lifecycle=LifecycleState.ACTIVE,
    )


def make_sku(
    order_code: str = "262.26.033",
    *,
    global_id: str | None = None,
    model_id: str = "model:hafele:minifix-15",
    verification: dict[
        VerificationDimension, VerificationState
    ] | None = None,
) -> CommercialSku:
    states = verification or verification_states(
        IDENTITY=VerificationState.VERIFIED,
        GEOMETRY=VerificationState.VERIFIED,
    )
    return CommercialSku(
        global_id=global_id or f"sku:hafele:{order_code}:EU",
        brand_id="brand:hafele",
        model_id=model_id,
        oem_order_code=order_code,
        region="EU",
        pack_qty=1,
        verification=states,
    )


class EnumContractTests(unittest.TestCase):
    def test_verification_dimension_has_exact_planned_members_and_values(
        self,
    ) -> None:
        self.assertEqual(
            {
                "IDENTITY": "identity",
                "GEOMETRY": "geometry",
                "BOM": "bom",
                "TOOLING": "tooling",
                "MATERIAL_THICKNESS": "material_thickness",
                "STRUCTURAL": "structural",
                "COMMERCIAL": "commercial",
                "FIELD": "field",
                "LIFECYCLE": "lifecycle",
                "RIGHTS": "rights",
            },
            {member.name: member.value for member in VerificationDimension},
        )

    def test_verification_state_has_exact_planned_members_and_values(
        self,
    ) -> None:
        self.assertEqual(
            {
                "VERIFIED": "VERIFIED",
                "PENDING": "PENDING",
                "REGION_ONLY": "REGION_ONLY",
                "DISCONTINUED": "DISCONTINUED",
                "BLOCKED": "BLOCKED",
            },
            {member.name: member.value for member in VerificationState},
        )

    def test_lifecycle_state_has_only_living_registry_members(self) -> None:
        self.assertEqual(
            {
                "PENDING": "PENDING",
                "ACTIVE": "ACTIVE",
                "REGION_ONLY": "REGION_ONLY",
                "SUPERSEDED": "SUPERSEDED",
                "DISCONTINUED": "DISCONTINUED",
                "SOURCE_BLOCKED": "SOURCE_BLOCKED",
            },
            {member.name: member.value for member in LifecycleState},
        )


class CommercialSkuTests(unittest.TestCase):
    def test_approved_field_shape_is_exact(self) -> None:
        self.assertEqual(
            [
                "global_id",
                "brand_id",
                "model_id",
                "oem_order_code",
                "region",
                "pack_qty",
                "verification",
            ],
            [field.name for field in fields(CommercialSku)],
        )

    def test_same_geometry_does_not_collapse_distinct_order_codes(self) -> None:
        first = make_sku("262.26.033")
        second = make_sku("262.26.533")

        self.assertNotEqual(first.oem_order_code, second.oem_order_code)
        self.assertNotEqual(first.global_id, second.global_id)
        self.assertEqual(first.verification, second.verification)

    def test_verified_is_dimension_specific(self) -> None:
        sku = make_sku(
            verification=verification_states(
                IDENTITY=VerificationState.VERIFIED,
                GEOMETRY=VerificationState.PENDING,
            )
        )

        self.assertTrue(sku.is_verified(VerificationDimension.IDENTITY))
        self.assertFalse(sku.is_verified(VerificationDimension.GEOMETRY))
        self.assertFalse(sku.is_verified(VerificationDimension.BOM))

    def test_id_fields_require_prefix_and_nonblank_content(self) -> None:
        valid = {
            "global_id": "sku:hafele:262.26.033:EU",
            "brand_id": "brand:hafele",
            "model_id": "model:hafele:minifix-15",
        }
        invalid_values = {
            "global_id": ("262.26.033", "sku:   "),
            "brand_id": ("hafele", "brand:   "),
            "model_id": ("minifix-15", "model:   "),
        }
        for field_name, values in invalid_values.items():
            for invalid in values:
                with self.subTest(field=field_name, value=invalid):
                    arguments = {**valid, field_name: invalid}
                    with self.assertRaises(ValueError):
                        CommercialSku(
                            **arguments,
                            oem_order_code="262.26.033",
                            region="EU",
                            pack_qty=1,
                            verification=verification_states(),
                        )

    def test_order_code_and_region_must_be_nonblank(self) -> None:
        for field_name in ("oem_order_code", "region"):
            with self.subTest(field=field_name):
                arguments = {
                    "global_id": "sku:hafele:262.26.033:EU",
                    "brand_id": "brand:hafele",
                    "model_id": "model:hafele:minifix-15",
                    "oem_order_code": "262.26.033",
                    "region": "EU",
                    "pack_qty": 1,
                    "verification": verification_states(),
                }
                arguments[field_name] = "   "
                with self.assertRaises(ValueError):
                    CommercialSku(**arguments)

    def test_pack_quantity_requires_positive_non_boolean_integer(self) -> None:
        for invalid in (0, -1, True, False, 1.5, "1"):
            with self.subTest(pack_qty=invalid):
                with self.assertRaises((TypeError, ValueError)):
                    CommercialSku(
                        global_id="sku:hafele:262.26.033:EU",
                        brand_id="brand:hafele",
                        model_id="model:hafele:minifix-15",
                        oem_order_code="262.26.033",
                        region="EU",
                        pack_qty=invalid,
                        verification=verification_states(),
                    )

    def test_verification_requires_every_dimension_exactly_once(self) -> None:
        missing = verification_states()
        del missing[VerificationDimension.RIGHTS]
        extra = verification_states()
        extra["rights-review"] = VerificationState.PENDING

        for label, invalid in (("missing", missing), ("extra", extra)):
            with self.subTest(case=label):
                with self.assertRaises(ValueError):
                    make_sku(verification=invalid)

    def test_verification_rejects_untyped_keys_and_states(self) -> None:
        untyped_key = verification_states()
        del untyped_key[VerificationDimension.RIGHTS]
        untyped_key["rights"] = VerificationState.PENDING
        untyped_state = verification_states()
        untyped_state[VerificationDimension.RIGHTS] = "PENDING"

        with self.assertRaises(TypeError):
            make_sku(verification=untyped_key)
        with self.assertRaises(TypeError):
            make_sku(verification=untyped_state)

    def test_verification_is_defensively_copied_and_read_only(self) -> None:
        caller_states = verification_states(
            IDENTITY=VerificationState.VERIFIED
        )
        sku = make_sku(verification=caller_states)

        caller_states[VerificationDimension.IDENTITY] = (
            VerificationState.BLOCKED
        )

        self.assertTrue(sku.is_verified(VerificationDimension.IDENTITY))
        with self.assertRaises(TypeError):
            sku.verification[VerificationDimension.IDENTITY] = (
                VerificationState.BLOCKED
            )

    def test_sku_fields_are_frozen(self) -> None:
        sku = make_sku()

        with self.assertRaises(FrozenInstanceError):
            sku.region = "TH"


class ProductModelTests(unittest.TestCase):
    def test_approved_field_shape_is_exact(self) -> None:
        self.assertEqual(
            ["model_id", "brand_id", "name", "lifecycle"],
            [field.name for field in fields(ProductModel)],
        )

    def test_model_is_frozen(self) -> None:
        model = make_model()

        with self.assertRaises(FrozenInstanceError):
            model.name = "Changed"

    def test_model_ids_require_prefix_and_nonblank_content(self) -> None:
        invalid_values = {
            "model_id": ("minifix-15", "model:   "),
            "brand_id": ("hafele", "brand:   "),
        }
        for field_name, values in invalid_values.items():
            for invalid in values:
                with self.subTest(field=field_name, value=invalid):
                    arguments = {
                        "model_id": "model:hafele:minifix-15",
                        "brand_id": "brand:hafele",
                        "name": "Minifix 15",
                        "lifecycle": LifecycleState.ACTIVE,
                    }
                    arguments[field_name] = invalid
                    with self.assertRaises(ValueError):
                        ProductModel(**arguments)

    def test_model_name_must_be_nonblank(self) -> None:
        with self.assertRaises(ValueError):
            ProductModel(
                model_id="model:hafele:minifix-15",
                brand_id="brand:hafele",
                name="   ",
                lifecycle=LifecycleState.ACTIVE,
            )

    def test_model_lifecycle_must_be_typed(self) -> None:
        with self.assertRaises(TypeError):
            ProductModel(
                model_id="model:hafele:minifix-15",
                brand_id="brand:hafele",
                name="Minifix 15",
                lifecycle="ACTIVE",
            )


class RegistryTests(unittest.TestCase):
    def test_exact_id_lookups_are_deterministic(self) -> None:
        model = make_model()
        sku = make_sku()
        registry = Registry(models=[model], skus=[sku])

        self.assertIs(model, registry.get_model(model.model_id))
        self.assertIs(sku, registry.get_sku(sku.global_id))
        self.assertIsNone(registry.get_model("model:hafele:unknown"))
        self.assertIsNone(registry.get_sku("sku:hafele:unknown:EU"))
        self.assertEqual({model.model_id: model}, registry.models)
        self.assertEqual({sku.global_id: sku}, registry.skus)

    def test_registry_defensively_copies_and_freezes_public_mappings(
        self,
    ) -> None:
        model = make_model()
        sku = make_sku()
        caller_models = [model]
        caller_skus = [sku]
        registry = Registry(models=caller_models, skus=caller_skus)

        caller_models.clear()
        caller_skus.clear()

        self.assertIs(model, registry.get_model(model.model_id))
        self.assertIs(sku, registry.get_sku(sku.global_id))
        with self.assertRaises(TypeError):
            registry.models[model.model_id] = model
        with self.assertRaises(TypeError):
            registry.skus[sku.global_id] = sku
        with self.assertRaises(FrozenInstanceError):
            registry.models = {}

    def test_duplicate_model_ids_are_rejected_before_mapping_collapse(
        self,
    ) -> None:
        first = make_model()
        second = ProductModel(
            model_id=first.model_id,
            brand_id="brand:hafele",
            name="Different display name",
            lifecycle=LifecycleState.PENDING,
        )

        with self.assertRaises(ValueError):
            Registry(models=[first, second], skus=[])

    def test_duplicate_global_ids_cannot_collapse_distinct_order_codes(
        self,
    ) -> None:
        first = make_sku(
            "262.26.033",
            global_id="sku:hafele:commercial-record:EU",
        )
        second = make_sku(
            "262.26.533",
            global_id="sku:hafele:commercial-record:EU",
        )

        with self.assertRaises(ValueError):
            Registry(models=[make_model()], skus=[first, second])

    def test_unknown_model_reference_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            Registry(
                models=[make_model()],
                skus=[make_sku(model_id="model:hafele:unknown")],
            )


class PublicApiTests(unittest.TestCase):
    def test_package_exports_all_registry_interfaces(self) -> None:
        import monolith_component_master

        expected = {
            "CommercialSku",
            "ProductModel",
            "VerificationDimension",
            "VerificationState",
            "LifecycleState",
            "Registry",
        }
        self.assertTrue(expected.issubset(set(monolith_component_master.__all__)))
        for name in expected:
            with self.subTest(name=name):
                self.assertIsNotNone(getattr(monolith_component_master, name))


if __name__ == "__main__":
    unittest.main()
