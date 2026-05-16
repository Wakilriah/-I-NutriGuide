from django.contrib.auth import get_user_model
from django.db.models import Avg, Count
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import permissions
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.feedback.models import RecommendationFeedback
from apps.foods.models import Food
from apps.recommendations.models import RecommendationItem, RecommendationRun, SavedRecommendationItem
from apps.rules.models import AssociationRule
from apps.supplements.models import Supplement, UserSupplement


dashboard_response = inline_serializer(
    name="DashboardAnalytics",
    fields={
        "total_users": serializers.IntegerField(),
        "total_foods": serializers.IntegerField(),
        "total_supplements": serializers.IntegerField(),
        "total_recommendations": serializers.IntegerField(),
        "average_feedback_rating": serializers.FloatField(),
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
    },
)


class DashboardView(APIView):
    permission_classes = [permissions.IsAdminUser]

    @extend_schema(responses=dashboard_response)
    def get(self, request):
        rule_usage = _get_rule_usage()

        return Response(
            {
                "total_users": get_user_model().objects.count(),
                "total_foods": Food.objects.count(),
                "total_supplements": Supplement.objects.count(),
                "total_recommendations": RecommendationRun.objects.count(),
                "average_feedback_rating": RecommendationFeedback.objects.aggregate(avg=Avg("rating"))["avg"] or 0,
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
