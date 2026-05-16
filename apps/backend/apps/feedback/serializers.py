from drf_spectacular.utils import extend_schema_field, inline_serializer
from rest_framework import serializers

from .models import RecommendationFeedback


class RecommendationFeedbackSerializer(serializers.ModelSerializer):
    recommendation_item_id = serializers.IntegerField(write_only=True)
    recommendation_item = serializers.SerializerMethodField(read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = RecommendationFeedback
        fields = [
            "id",
            "recommendation_item_id",
            "recommendation_item",
            "user_email",
            "rating",
            "is_helpful",
            "comment",
            "created_at",
        ]
        read_only_fields = ["id", "user_email", "created_at"]

    @extend_schema_field(
        inline_serializer(
            name="FeedbackRecommendationItemSummary",
            fields={
                "id": serializers.IntegerField(),
                "rank": serializers.IntegerField(),
                "food": inline_serializer(
                    name="FeedbackFoodSummary",
                    fields={
                        "id": serializers.IntegerField(),
                        "name": serializers.CharField(),
                        "slug": serializers.CharField(),
                    },
                ),
                "run_id": serializers.UUIDField(),
            },
        )
    )
    def get_recommendation_item(self, obj):
        item = obj.recommendation_item
        return {
            "id": item.id,
            "rank": item.rank,
            "food": {
                "id": item.food.id,
                "name": item.food.name,
                "slug": item.food.slug,
            },
            "run_id": item.run_id,
        }

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate_recommendation_item_id(self, value):
        user = self.context["request"].user
        if not user.is_staff and not user.recommendation_runs.filter(items__id=value).exists():
            raise serializers.ValidationError("Recommendation item does not belong to this user.")
        return value

    def create(self, validated_data):
        item_id = validated_data.pop("recommendation_item_id")
        feedback, _ = RecommendationFeedback.objects.update_or_create(
            user=self.context["request"].user,
            recommendation_item_id=item_id,
            defaults=validated_data,
        )
        return feedback
