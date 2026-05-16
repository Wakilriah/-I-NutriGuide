from django.utils.text import slugify
from rest_framework import serializers

from apps.nutrients.models import Nutrient

from .models import Food, FoodCategory, FoodNutrient


class FoodCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodCategory
        fields = [
            "id",
            "name",
            "slug",
            "ciqual_group_code",
            "ciqual_subgroup_code",
            "ciqual_subsubgroup_code",
            "source",
        ]
        read_only_fields = ["id"]


class FoodNutrientSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="nutrient.name", read_only=True)
    slug = serializers.CharField(source="nutrient.slug", read_only=True)

    class Meta:
        model = FoodNutrient
        fields = ["name", "slug", "amount", "unit", "per_quantity", "per_unit"]


class FoodNutrientInputSerializer(serializers.Serializer):
    nutrient_slug = serializers.SlugField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=3)
    unit = serializers.CharField(max_length=20, required=False, allow_blank=True)
    per_quantity = serializers.DecimalField(max_digits=10, decimal_places=3, required=False, default=100)
    per_unit = serializers.CharField(max_length=20, required=False, default="g")


class FoodSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.SlugField(write_only=True)
    nutrients = FoodNutrientSerializer(many=True, read_only=True)
    nutrient_items = FoodNutrientInputSerializer(many=True, required=False, write_only=True)

    class Meta:
        model = Food
        fields = [
            "id",
            "name",
            "slug",
            "category",
            "category_slug",
            "description",
            "scientific_name",
            "ciqual_code",
            "source",
            "serving_size_g",
            "image_url",
            "is_active",
            "nutrients",
            "nutrient_items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        category_slug = validated_data.pop("category_slug")
        nutrient_items = validated_data.pop("nutrient_items", [])
        category = self._get_category(category_slug)
        food = Food.objects.create(category=category, **validated_data)
        self._replace_nutrients(food, nutrient_items)
        return food

    def update(self, instance, validated_data):
        category_slug = validated_data.pop("category_slug", None)
        nutrient_items = validated_data.pop("nutrient_items", None)

        if category_slug is not None:
            instance.category = self._get_category(category_slug)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        if nutrient_items is not None:
            self._replace_nutrients(instance, nutrient_items)
        return instance

    def _get_category(self, slug):
        name = slug.replace("-", " ").title()
        return FoodCategory.objects.get_or_create(slug=slug, defaults={"name": name})[0]

    def _replace_nutrients(self, food, nutrient_items):
        food.nutrients.all().delete()
        rows = []
        for item in nutrient_items:
            nutrient_slug = item["nutrient_slug"]
            nutrient = Nutrient.objects.get(slug=nutrient_slug)
            rows.append(
                FoodNutrient(
                    food=food,
                    nutrient=nutrient,
                    amount=item["amount"],
                    unit=item.get("unit") or nutrient.unit,
                    per_quantity=item.get("per_quantity", 100),
                    per_unit=item.get("per_unit", "g"),
                )
            )
        FoodNutrient.objects.bulk_create(rows)

    def validate_slug(self, value):
        return slugify(value)

    def validate_nutrient_items(self, value):
        missing = [item["nutrient_slug"] for item in value if not Nutrient.objects.filter(slug=item["nutrient_slug"]).exists()]
        if missing:
            raise serializers.ValidationError(f"Unknown nutrient slug(s): {', '.join(missing)}")
        return value
