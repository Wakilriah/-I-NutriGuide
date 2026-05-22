from drf_spectacular.utils import extend_schema_field, inline_serializer
from rest_framework import serializers

from .models import RecommendationFeedback


class RecommendationFeedbackSerializer(serializers.ModelSerializer):
    recommendation_item_id = serializers.IntegerField(write_only=True, required=False)
    recommendation_id = serializers.IntegerField(write_only=True, required=False)
    food_id = serializers.IntegerField(required=False)
    recommendation_item = serializers.SerializerMethodField(read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = RecommendationFeedback
        fields = [
            "id",
            "recommendation_item_id",
            "recommendation_id",
            "food_id",
            "recommendation_item",
            "user_email",
            "feedback_type",
            "rating",
            "is_helpful",
            "comment",
            "context",
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
        if value is None:
            return value
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate_feedback_type(self, value):
        if value == RecommendationFeedback.FeedbackType.ALLERGY_ISSUE:
            return value
        return value

    def validate_recommendation_item_id(self, value):
        user = self.context["request"].user
        if not user.is_staff and not user.recommendation_runs.filter(items__id=value).exists():
            raise serializers.ValidationError("Recommendation item does not belong to this user.")
        return value

    def validate(self, attrs):
        recommendation_id = attrs.pop("recommendation_id", None)
        if recommendation_id and "recommendation_item_id" not in attrs:
            attrs["recommendation_item_id"] = recommendation_id
        if "recommendation_item_id" not in attrs:
            raise serializers.ValidationError({"recommendation_item_id": "This field is required."})
        food_id = attrs.get("food_id")
        if food_id:
            from apps.recommendations.models import RecommendationItem

            item = RecommendationItem.objects.select_related("food").filter(id=attrs["recommendation_item_id"]).first()
            if item and item.food_id != food_id:
                raise serializers.ValidationError({"food_id": "Food does not match the recommendation item."})
        return attrs

    def create(self, validated_data):
        item_id = validated_data.pop("recommendation_item_id")
        validated_data.pop("food_id", None)
        feedback_type = validated_data.get("feedback_type")
        if feedback_type in {"liked", "saved", "tried", "helpful"}:
            validated_data["is_helpful"] = True
        elif feedback_type in {"disliked", "not_interested", "bad_taste", "not_helpful", "unsafe_for_me", "allergy_issue", "too_expensive"}:
            validated_data["is_helpful"] = False
        from apps.recommendations.models import RecommendationItem

        item = RecommendationItem.objects.select_related("food").get(id=item_id)
        validated_data.setdefault("food", item.food)
        feedback, _ = RecommendationFeedback.objects.update_or_create(
            user=self.context["request"].user,
            recommendation_item_id=item_id,
            defaults=validated_data,
        )
        return feedback
