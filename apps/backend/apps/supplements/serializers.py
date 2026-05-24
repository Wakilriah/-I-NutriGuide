from django.utils.text import slugify
from rest_framework import serializers

from apps.nutrients.models import Nutrient

from .models import Supplement, SupplementNutrient, UserSupplement


class SupplementNutrientSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="nutrient.name", read_only=True)
    slug = serializers.CharField(source="nutrient.slug", read_only=True)

    class Meta:
        model = SupplementNutrient
        fields = ["name", "slug", "amount", "unit"]


class SupplementNutrientInputSerializer(serializers.Serializer):
    nutrient_slug = serializers.SlugField()
    amount = serializers.DecimalField(
        max_digits=10, decimal_places=3, required=False, allow_null=True
    )
    unit = serializers.CharField(max_length=20, required=False, allow_blank=True)


class SupplementSerializer(serializers.ModelSerializer):
    nutrients = SupplementNutrientSerializer(many=True, read_only=True)
    nutrient_items = SupplementNutrientInputSerializer(
        many=True, required=False, write_only=True
    )

    class Meta:
        model = Supplement
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "common_dose",
            "source",
            "source_id",
            "brand_name",
            "manufacturer",
            "product_type",
            "upc",
            "physical_state",
            "off_market",
            "target_groups",
            "is_active",
            "nutrients",
            "nutrient_items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        nutrient_items = validated_data.pop("nutrient_items", [])
        supplement = Supplement.objects.create(**validated_data)
        self._replace_nutrients(supplement, nutrient_items)
        return supplement

    def update(self, instance, validated_data):
        nutrient_items = validated_data.pop("nutrient_items", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if nutrient_items is not None:
            self._replace_nutrients(instance, nutrient_items)
        return instance

    def validate_slug(self, value):
        return slugify(value)

    def validate_nutrient_items(self, value):
        missing = [
            item["nutrient_slug"]
            for item in value
            if not Nutrient.objects.filter(slug=item["nutrient_slug"]).exists()
        ]
        if missing:
            raise serializers.ValidationError(
                f"Unknown nutrient slug(s): {', '.join(missing)}"
            )
        return value

    def _replace_nutrients(self, supplement, nutrient_items):
        supplement.nutrients.all().delete()
        rows = []
        for item in nutrient_items:
            nutrient = Nutrient.objects.get(slug=item["nutrient_slug"])
            rows.append(
                SupplementNutrient(
                    supplement=supplement,
                    nutrient=nutrient,
                    amount=item.get("amount"),
                    unit=item.get("unit") or nutrient.unit,
                )
            )
        SupplementNutrient.objects.bulk_create(rows)


class UserSupplementSerializer(serializers.ModelSerializer):
    supplement = SupplementSerializer(read_only=True)
    supplement_id = serializers.PrimaryKeyRelatedField(
        queryset=Supplement.objects.filter(is_active=True),
        source="supplement",
        write_only=True,
    )

    class Meta:
        model = UserSupplement
        fields = [
            "id",
            "supplement",
            "supplement_id",
            "dose",
            "frequency",
            "time_of_day",
            "active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_frequency(self, value):
        if value != "daily":
            raise serializers.ValidationError(
                "Only daily supplement routines are supported."
            )
        return value
