from django.contrib.auth import get_user_model
from django.db.models import Avg, Count
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import permissions
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.feedback.models import RecommendationFeedback
from apps.foods.models import Food
from apps.nutrients.models import Nutrient
from apps.recommendations.models import RecommendationItem, RecommendationRun, SavedRecommendationItem
from apps.rules.models import AssociationRule
from apps.supplements.models import Supplement, UserSupplement


dashboard_response = inline_serializer(
    name="DashboardAnalytics",
    fields={
        "total_users": serializers.IntegerField(),
        "active_users": serializers.IntegerField(),
        "admin_users": serializers.IntegerField(),
        "survey_users": serializers.IntegerField(),
        "total_foods": serializers.IntegerField(),
        "active_foods": serializers.IntegerField(),
        "ciqual_foods": serializers.IntegerField(),
        "total_nutrients": serializers.IntegerField(),
        "total_supplements": serializers.IntegerField(),
        "active_supplements": serializers.IntegerField(),
        "user_supplement_entries": serializers.IntegerField(),
        "total_recommendations": serializers.IntegerField(),
        "total_recommendation_items": serializers.IntegerField(),
        "average_recommendation_score": serializers.FloatField(),
        "average_feedback_rating": serializers.FloatField(),
        "total_feedback": serializers.IntegerField(),
        "helpful_feedback": serializers.IntegerField(),
        "total_saved_foods": serializers.IntegerField(),
        "total_association_rules": serializers.IntegerField(),
        "active_association_rules": serializers.IntegerField(),
        "recommendation_items_with_rules": serializers.IntegerField(),
        "average_rule_score": serializers.FloatField(),
        "most_used_supplements": serializers.ListField(child=serializers.DictField()),
        "most_recommended_foods": serializers.ListField(child=serializers.DictField()),
        "most_saved_foods": serializers.ListField(child=serializers.DictField()),
        "food_category_counts": serializers.ListField(child=serializers.DictField()),
        "food_source_counts": serializers.ListField(child=serializers.DictField()),
        "rule_usage": serializers.ListField(child=serializers.DictField()),
        "feedback_type_counts": serializers.ListField(child=serializers.DictField()),
        "most_liked_foods": serializers.ListField(child=serializers.DictField()),
        "most_disliked_foods": serializers.ListField(child=serializers.DictField()),
        "most_common_warning_types": serializers.ListField(child=serializers.DictField()),
        "recommendation_acceptance_rate": serializers.FloatField(),
    },
)

recommendation_analytics_response = inline_serializer(
    name="RecommendationAnalytics",
    fields={
        "total_runs": serializers.IntegerField(),
        "total_items": serializers.IntegerField(),
        "average_score": serializers.FloatField(),
        "top_foods": serializers.ListField(child=serializers.DictField()),
    },
)

feedback_analytics_response = inline_serializer(
    name="FeedbackAnalytics",
    fields={
        "total_feedback": serializers.IntegerField(),
        "average_rating": serializers.FloatField(),
        "helpful_count": serializers.IntegerField(),
        "not_helpful_count": serializers.IntegerField(),
        "feedback_type_counts": serializers.ListField(child=serializers.DictField()),
        "most_liked_foods": serializers.ListField(child=serializers.DictField()),
        "most_disliked_foods": serializers.ListField(child=serializers.DictField()),
        "acceptance_rate": serializers.FloatField(),
    },
)


class DashboardView(APIView):
    permission_classes = [permissions.IsAdminUser]

    @extend_schema(responses=dashboard_response)
    def get(self, request):
        rule_usage = _get_rule_usage()
        user_model = get_user_model()

        return Response(
            {
                "total_users": user_model.objects.count(),
                "active_users": user_model.objects.filter(is_active=True).count(),
                "admin_users": user_model.objects.filter(is_staff=True).count(),
                "survey_users": user_model.objects.filter(email__endswith="@google-form.local").count(),
                "total_foods": Food.objects.count(),
                "active_foods": Food.objects.filter(is_active=True).count(),
                "ciqual_foods": Food.objects.filter(source="CIQUAL 2020").count(),
                "total_nutrients": Nutrient.objects.count(),
                "total_supplements": Supplement.objects.count(),
                "active_supplements": Supplement.objects.filter(is_active=True).count(),
                "user_supplement_entries": UserSupplement.objects.count(),
                "total_recommendations": RecommendationRun.objects.count(),
                "total_recommendation_items": RecommendationItem.objects.count(),
                "average_recommendation_score": RecommendationItem.objects.aggregate(avg=Avg("score"))["avg"] or 0,
                "average_feedback_rating": RecommendationFeedback.objects.aggregate(avg=Avg("rating"))["avg"] or 0,
                "total_feedback": RecommendationFeedback.objects.count(),
                "helpful_feedback": RecommendationFeedback.objects.filter(is_helpful=True).count(),
                "total_saved_foods": SavedRecommendationItem.objects.count(),
                "total_association_rules": AssociationRule.objects.count(),
                "active_association_rules": AssociationRule.objects.filter(is_active=True).count(),
                "recommendation_items_with_rules": RecommendationItem.objects.filter(rule_score__gt=0).count(),
                "average_rule_score": RecommendationItem.objects.aggregate(avg=Avg("rule_score"))["avg"] or 0,
                "most_used_supplements": list(
                    UserSupplement.objects.values("supplement__name", "supplement__slug")
                    .annotate(count=Count("id"))
                    .order_by("-count")[:5]
                ),
                "most_recommended_foods": list(
                    RecommendationItem.objects.values("food__name", "food__slug")
                    .annotate(count=Count("id"))
                    .order_by("-count")[:5]
                ),
                "most_saved_foods": list(
                    SavedRecommendationItem.objects.values("recommendation_item__food__name", "recommendation_item__food__slug")
                    .annotate(count=Count("id"))
                    .order_by("-count")[:5]
                ),
                "food_category_counts": list(
                    Food.objects.values("category__name", "category__slug")
                    .annotate(count=Count("id"))
                    .order_by("-count", "category__name")[:8]
                ),
                "food_source_counts": list(
                    Food.objects.values("source")
                    .annotate(count=Count("id"))
                    .order_by("-count", "source")[:6]
                ),
                "rule_usage": rule_usage,
                "feedback_type_counts": list(
                    RecommendationFeedback.objects.values("feedback_type")
                    .annotate(count=Count("id"))
                    .order_by("-count", "feedback_type")
                ),
                "most_liked_foods": list(
                    RecommendationFeedback.objects.filter(feedback_type__in=["liked", "saved", "tried", "helpful"])
                    .values("food__name", "food__slug")
                    .annotate(count=Count("id"))
                    .order_by("-count")[:5]
                ),
                "most_disliked_foods": list(
                    RecommendationFeedback.objects.filter(feedback_type__in=["disliked", "not_interested", "bad_taste", "unsafe_for_me", "allergy_issue", "not_helpful"])
                    .values("food__name", "food__slug")
                    .annotate(count=Count("id"))
                    .order_by("-count")[:5]
                ),
                "most_common_warning_types": _get_warning_usage(),
                "recommendation_acceptance_rate": _acceptance_rate(),
            }
        )


class RecommendationAnalyticsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    @extend_schema(responses=recommendation_analytics_response)
    def get(self, request):
        return Response(
            {
                "total_runs": RecommendationRun.objects.count(),
                "total_items": RecommendationItem.objects.count(),
                "average_score": RecommendationItem.objects.aggregate(avg=Avg("score"))["avg"] or 0,
                "top_foods": list(
                    RecommendationItem.objects.values("food__name", "food__slug")
                    .annotate(count=Count("id"), average_score=Avg("score"))
                    .order_by("-count")[:10]
                ),
            }
        )


class FeedbackAnalyticsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    @extend_schema(responses=feedback_analytics_response)
    def get(self, request):
        return Response(
            {
                "total_feedback": RecommendationFeedback.objects.count(),
                "average_rating": RecommendationFeedback.objects.aggregate(avg=Avg("rating"))["avg"] or 0,
                "helpful_count": RecommendationFeedback.objects.filter(is_helpful=True).count(),
                "not_helpful_count": RecommendationFeedback.objects.filter(is_helpful=False).count(),
                "feedback_type_counts": list(
                    RecommendationFeedback.objects.values("feedback_type")
                    .annotate(count=Count("id"))
                    .order_by("-count", "feedback_type")
                ),
                "most_liked_foods": list(
                    RecommendationFeedback.objects.filter(feedback_type__in=["liked", "saved", "tried", "helpful"])
                    .values("food__name", "food__slug")
                    .annotate(count=Count("id"))
                    .order_by("-count")[:10]
                ),
                "most_disliked_foods": list(
                    RecommendationFeedback.objects.filter(feedback_type__in=["disliked", "not_interested", "bad_taste", "unsafe_for_me", "allergy_issue", "not_helpful"])
                    .values("food__name", "food__slug")
                    .annotate(count=Count("id"))
                    .order_by("-count")[:10]
                ),
                "acceptance_rate": _acceptance_rate(),
            }
        )


def _get_rule_usage():
    usage = {}
    items = RecommendationItem.objects.exclude(matched_rules=[]).values_list("matched_rules", flat=True)
    for matched_rules in items:
        for rule in matched_rules or []:
            rule_id = rule.get("id")
            label = f"{rule.get('antecedent', 'unknown')} -> {rule.get('consequent', 'unknown')}"
            key = str(rule_id or label)
            if key not in usage:
                usage[key] = {"rule_id": rule_id, "label": label, "count": 0}
            usage[key]["count"] += 1
    return sorted(usage.values(), key=lambda item: item["count"], reverse=True)[:8]


def _get_warning_usage():
    counts = {}
    for warnings in RecommendationItem.objects.exclude(warnings=[]).values_list("warnings", flat=True):
        for warning in warnings or []:
            key = warning.get("type") if isinstance(warning, dict) else "legacy_warning"
            counts[key] = counts.get(key, 0) + 1
    return [{"type": key, "count": value} for key, value in sorted(counts.items(), key=lambda item: item[1], reverse=True)[:8]]


def _acceptance_rate():
    total = RecommendationFeedback.objects.count()
    if not total:
        return 0
    accepted = RecommendationFeedback.objects.filter(feedback_type__in=["liked", "saved", "tried", "helpful"]).count()
    return round(accepted / total, 4)
