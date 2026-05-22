from rest_framework import serializers

from .models import Nutrient


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
