from rest_framework import serializers

from .models import (
    AssociationRule,
    AssociationTransaction,
    AssociationTransactionItem,
    FoodSupplementSynergyRule,
    MinedAssociationRule,
    SafetyConstraint,
    SupplementCategory,
    SupplementNormalization,
)


class AssociationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssociationRule
        fields = [
            "id",
            "antecedent_type",
            "antecedent_slug",
            "consequent_type",
            "consequent_slug",
            "support",
            "confidence",
            "lift",
            "score",
            "explanation",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        for field in ["support", "confidence", "score"]:
            value = attrs.get(field, getattr(self.instance, field, None))
            if value is not None and not 0 <= value <= 1:
                raise serializers.ValidationError({field: "Must be between 0 and 1."})

        lift = attrs.get("lift", getattr(self.instance, "lift", None))
        if lift is not None and lift < 0:
            raise serializers.ValidationError({"lift": "Must be greater than or equal to 0."})
        return attrs


class SupplementCategorySerializer(serializers.ModelSerializer):
    association_item = serializers.CharField(read_only=True)

    class Meta:
        model = SupplementCategory
        fields = [
            "id",
            "category",
            "canonical_item",
            "association_item",
            "keywords",
            "main_nutrient",
            "source_url",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "association_item", "created_at", "updated_at"]


class SupplementNormalizationSerializer(serializers.ModelSerializer):
    canonical_item = serializers.CharField(source="category.canonical_item", read_only=True)

    class Meta:
        model = SupplementNormalization
        fields = [
            "id",
            "original_supplement_name",
            "original_supplement_slug",
            "normalized_category",
            "canonical_item",
            "primary_keyword",
            "main_nutrient",
            "notes",
            "source_url",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "original_supplement_slug", "canonical_item", "created_at", "updated_at"]


class FoodSupplementSynergyRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodSupplementSynergyRule
        fields = [
            "id",
            "rule_seed_id",
            "supplement_category_name",
            "supplement_item",
            "food",
            "food_item",
            "nutrient_relation",
            "association_type",
            "reason",
            "seed_weight",
            "source_url",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SafetyConstraintSerializer(serializers.ModelSerializer):
    class Meta:
        model = SafetyConstraint
        fields = [
            "id",
            "supplement_category_name",
            "avoid_or_review_item",
            "constraint_type",
            "safety_level",
            "reason",
            "how_to_use",
            "source_url",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class MinedAssociationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = MinedAssociationRule
        fields = [
            "id",
            "rule_key",
            "antecedent_items",
            "consequent_items",
            "support",
            "confidence",
            "lift",
            "score",
            "rule_type",
            "review_status",
            "admin_note",
            "safety_conflict_status",
            "safety_conflict_details",
            "source",
            "explanation",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "rule_key", "safety_conflict_status", "safety_conflict_details", "created_at", "updated_at"]


class AssociationTransactionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssociationTransactionItem
        fields = ["id", "item_type", "item_value", "item"]
        read_only_fields = ["id"]


class AssociationTransactionSerializer(serializers.ModelSerializer):
    items = AssociationTransactionItemSerializer(many=True, read_only=True)
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = AssociationTransaction
        fields = [
            "id",
            "transaction_id",
            "source",
            "raw_payload",
            "one_hot_items",
            "item_count",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
