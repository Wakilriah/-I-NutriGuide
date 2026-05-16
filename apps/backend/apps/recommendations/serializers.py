from drf_spectacular.utils import extend_schema_field, inline_serializer
from rest_framework import serializers

from .models import RecommendationItem, RecommendationRun, SavedRecommendationItem


class RecommendedFoodSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    slug = serializers.CharField()
    category = serializers.CharField()


class RecommendedSupplementSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    slug = serializers.CharField()


class RecommendationItemSerializer(serializers.ModelSerializer):
    food = serializers.SerializerMethodField()
    matched_supplement = serializers.SerializerMethodField()
    run_id = serializers.UUIDField(source="run.id", read_only=True)

    class Meta:
        model = RecommendationItem
        fields = [
            "id",
            "run_id",
            "rank",
            "food",
            "matched_supplement",
            "score",
            "nutrient_score",
            "rule_score",
            "preference_score",
            "matched_nutrients",
            "matched_rules",
            "tags",
            "warnings",
            "explanation",
        ]

    @extend_schema_field(RecommendedFoodSerializer)
    def get_food(self, obj):
        return {
            "id": obj.food.id,
            "name": obj.food.name,
            "slug": obj.food.slug,
            "category": obj.food.category.name,
        }

    @extend_schema_field(RecommendedSupplementSerializer)
    def get_matched_supplement(self, obj):
        if not obj.supplement:
            return None
        return {"id": obj.supplement.id, "name": obj.supplement.name, "slug": obj.supplement.slug}


class RecommendationRunSerializer(serializers.ModelSerializer):
    run_id = serializers.UUIDField(source="id")
    items = RecommendationItemSerializer(many=True)

    class Meta:
        model = RecommendationRun
        fields = ["run_id", "created_at", "disclaimer", "items"]


class SavedRecommendationItemSerializer(serializers.ModelSerializer):
    recommendation_item_id = serializers.IntegerField(write_only=True)
    recommendation_item = RecommendationItemSerializer(read_only=True)

    class Meta:
        model = SavedRecommendationItem
        fields = ["id", "recommendation_item_id", "recommendation_item", "created_at"]
        read_only_fields = ["id", "recommendation_item", "created_at"]

    def validate_recommendation_item_id(self, value):
        user = self.context["request"].user
        if not user.recommendation_runs.filter(items__id=value).exists():
            raise serializers.ValidationError("Recommendation item does not belong to this user.")
        return value

    def create(self, validated_data):
        item_id = validated_data.pop("recommendation_item_id")
        saved_item, _created = SavedRecommendationItem.objects.get_or_create(
            user=self.context["request"].user,
            recommendation_item_id=item_id,
        )
        return saved_item


class AdminRecommendationRunSerializer(RecommendationRunSerializer):
    user = serializers.SerializerMethodField()

    class Meta(RecommendationRunSerializer.Meta):
        fields = ["run_id", "user", "created_at", "disclaimer", "items"]

    @extend_schema_field(
        inline_serializer(
            name="RecommendationRunUserSummary",
            fields={
                "id": serializers.IntegerField(),
                "email": serializers.EmailField(),
                "name": serializers.CharField(),
            },
        )
    )
    def get_user(self, obj):
        return {"id": obj.user.id, "email": obj.user.email, "name": obj.user.name}


class GenerateRecommendationSerializer(serializers.Serializer):
    limit = serializers.IntegerField(min_value=1, max_value=50, default=10)


class HybridRecommendationQuerySerializer(serializers.Serializer):
    n = serializers.IntegerField(min_value=1, max_value=50, default=10)


class HybridPreviewSerializer(serializers.Serializer):
    n_sessions = serializers.IntegerField(min_value=0, default=0)
    supplements = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    goals = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    maladies = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    diseases = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    allergies = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    aliments_exclus = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    excluded_foods = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    imc = serializers.FloatField(required=False)
    bmi = serializers.FloatField(required=False)
    imc_norm = serializers.FloatField(required=False)
    activite = serializers.FloatField(required=False, default=0.0)
    activity = serializers.FloatField(required=False)
    n = serializers.IntegerField(min_value=1, max_value=50, default=10)
