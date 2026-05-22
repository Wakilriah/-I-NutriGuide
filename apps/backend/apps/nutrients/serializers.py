from rest_framework import serializers

from .models import Nutrient, NutrientInteraction


class NutrientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Nutrient
        fields = [
            "id",
            "name",
            "slug",
            "unit",
            "description",
            "original_name_fr",
            "source_column",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class NutrientInteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = NutrientInteraction
        fields = [
            "id",
            "source_type",
            "source_key",
            "target_type",
            "target_key",
            "interaction_type",
            "mechanism",
            "evidence_level",
            "severity",
            "active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
