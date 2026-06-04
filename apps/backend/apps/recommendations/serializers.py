from drf_spectacular.utils import extend_schema_field, inline_serializer
from rest_framework import serializers

from apps.supplements.models import Supplement

from .models import RecommendationItem, RecommendationRun, RecommendationWeightProfile, SavedRecommendationItem
from .services.food_metadata import attach_food_metadata_to_rules, recommendation_food_payload


class RecommendedFoodSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    food_name = serializers.CharField()
    name = serializers.CharField()
    slug = serializers.CharField()
    category = serializers.CharField()
    image_path = serializers.CharField()
    image_alt = serializers.CharField(allow_blank=True)
    nutrient_tags = serializers.ListField(child=serializers.CharField(), required=False)
    synergy_reason = serializers.CharField(allow_blank=True)
    avoid_or_caution = serializers.CharField(allow_blank=True)
    nutrients = serializers.ListField(child=serializers.CharField(), required=False)


class RecommendedSupplementSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    slug = serializers.CharField()


class RecommendationItemSerializer(serializers.ModelSerializer):
    food = serializers.SerializerMethodField()
    matched_supplement = serializers.SerializerMethodField()
    run_id = serializers.UUIDField(source="run.id", read_only=True)
    recommendation_id = serializers.IntegerField(source="id", read_only=True)
    explanation = serializers.SerializerMethodField()
    warnings = serializers.SerializerMethodField()
    feedback = serializers.SerializerMethodField()
    matched_rules = serializers.SerializerMethodField()
    association_rule_score = serializers.SerializerMethodField()
    matched_rule = serializers.SerializerMethodField()
    support = serializers.SerializerMethodField()
    rule_confidence = serializers.SerializerMethodField()
    lift = serializers.SerializerMethodField()
    safety_note = serializers.SerializerMethodField()
    safety_status = serializers.SerializerMethodField()
    safety_level = serializers.SerializerMethodField()
    safety_message = serializers.SerializerMethodField()
    blocked_reason = serializers.SerializerMethodField()
    alternatives = serializers.SerializerMethodField()

    class Meta:
        model = RecommendationItem
        fields = [
            "id",
            "recommendation_id",
            "run_id",
            "rank",
            "food",
            "matched_supplement",
            "score",
            "confidence_score",
            "confidence_label",
            "score_breakdown",
            "nutrient_score",
            "rule_score",
            "association_rule_score",
            "preference_score",
            "matched_nutrients",
            "matched_rules",
            "matched_rule",
            "support",
            "rule_confidence",
            "lift",
            "tags",
            "warnings",
            "safety_note",
            "safety_status",
            "safety_level",
            "safety_message",
            "blocked_reason",
            "alternatives",
            "explanation",
            "feedback",
        ]

    @extend_schema_field(RecommendedFoodSerializer)
    def get_food(self, obj):
        return recommendation_food_payload(
            obj.food,
            nutrients=list(obj.food.nutrients.values_list("nutrient__slug", flat=True)),
        )

    @extend_schema_field(RecommendedSupplementSerializer)
    def get_matched_supplement(self, obj):
        if not obj.supplement_id:
            return None
        return Supplement.objects.filter(id=obj.supplement_id).values("id", "name", "slug").first()

    def get_explanation(self, obj):
        return obj.explanation_details or {"summary": obj.explanation, "reasons": []}

    def get_warnings(self, obj):
        warnings = obj.warnings or []
        normalized = []
        for warning in warnings:
            if isinstance(warning, dict):
                normalized.append(warning)
            else:
                normalized.append(
                    {
                        "level": "caution",
                        "type": "legacy_warning",
                        "title": "Recommendation warning",
                        "message": str(warning),
                        "related_items": [],
                    }
                )
        return normalized

    def get_matched_rules(self, obj):
        return attach_food_metadata_to_rules(obj.matched_rules or [])

    def get_matched_rule(self, obj):
        rules = self.get_matched_rules(obj)
        return rules[0] if rules else None

    def get_association_rule_score(self, obj):
        return obj.rule_score

    def get_support(self, obj):
        rule = self.get_matched_rule(obj)
        return rule.get("support") if rule else None

    def get_rule_confidence(self, obj):
        rule = self.get_matched_rule(obj)
        return rule.get("confidence") if rule else None

    def get_lift(self, obj):
        rule = self.get_matched_rule(obj)
        return rule.get("lift") if rule else None

    def get_safety_note(self, obj):
        warnings = self.get_warnings(obj)
        return warnings[0].get("message") if warnings and isinstance(warnings[0], dict) else None

    def get_safety_status(self, obj):
        return (obj.explanation_details or {}).get("score_details", {}).get("safety_status", "SAFE")

    def get_safety_level(self, obj):
        return (obj.explanation_details or {}).get("score_details", {}).get("safety_level", "LOW")

    def get_safety_message(self, obj):
        return (obj.explanation_details or {}).get("score_details", {}).get("safety_message", "Safe for your current profile.")

    def get_blocked_reason(self, obj):
        return (obj.explanation_details or {}).get("score_details", {}).get("blocked_reason", "")

    def get_alternatives(self, obj):
        return (obj.explanation_details or {}).get("alternatives", [])

    def get_feedback(self, obj):
        request = self.context.get("request")
        user_feedback = None
        if request and request.user.is_authenticated:
            feedback = obj.feedback.filter(user=request.user).first()
            if feedback:
                user_feedback = {
                    "id": feedback.id,
                    "feedback_type": feedback.feedback_type,
                    "rating": feedback.rating,
                    "comment": feedback.comment,
                }
        return {
            "user_feedback": user_feedback,
            "available_actions": [
                "liked",
                "disliked",
                "saved",
                "not_interested",
                "allergy_issue",
                "do_not_eat",
                "too_expensive",
                "not_available",
                "already_tried",
                "good_recommendation",
            ],
        }


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


class RecommendationWeightProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecommendationWeightProfile
        fields = ["id", "user_type", "alpha", "beta", "gamma", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        alpha = attrs.get("alpha", getattr(self.instance, "alpha", 0))
        beta = attrs.get("beta", getattr(self.instance, "beta", 0))
        gamma = attrs.get("gamma", getattr(self.instance, "gamma", 0))
        if round(alpha + beta + gamma, 6) != 1:
            raise serializers.ValidationError("alpha + beta + gamma must equal 1.")
        return attrs


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
    async_generate = serializers.BooleanField(default=False, required=False)


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
    activity_level = serializers.CharField(required=False, allow_blank=True)
    age = serializers.IntegerField(required=False, min_value=0, max_value=120)
    gender = serializers.CharField(required=False, allow_blank=True)
    liked_foods = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    liked_categories = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    n = serializers.IntegerField(min_value=1, max_value=50, default=10)
