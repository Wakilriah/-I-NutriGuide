from django.db.models import Count, Q

from apps.feedback.models import RecommendationFeedback
from apps.recommendations.models import RecommendationItem, RecommendationRun


POSITIVE = {"liked", "saved", "tried", "helpful", "already_tried", "good_recommendation"}
NEGATIVE = {"disliked", "not_interested", "bad_taste", "not_helpful", "too_expensive", "not_available"}
BLOCKING = {"unsafe_for_me", "allergy_issue", "do_not_eat"}


def recommendation_metrics(*, date_from=None, date_to=None, supplement=None) -> dict:
    items = RecommendationItem.objects.select_related("food__category", "supplement", "run")
    feedback = RecommendationFeedback.objects.select_related("recommendation_item")
    if date_from:
        items = items.filter(run__created_at__date__gte=date_from)
        feedback = feedback.filter(created_at__date__gte=date_from)
    if date_to:
        items = items.filter(run__created_at__date__lte=date_to)
        feedback = feedback.filter(created_at__date__lte=date_to)
    if supplement:
        items = items.filter(Q(supplement__slug__icontains=supplement) | Q(matched_rules__icontains=supplement))
        feedback = feedback.filter(recommendation_item__in=items)

    total_items = items.count()
    total_feedback = feedback.count()
    positives = feedback.filter(feedback_type__in=POSITIVE).count()
    negatives = feedback.filter(feedback_type__in=NEGATIVE).count()
    safety_blocks = feedback.filter(feedback_type__in=BLOCKING).count()
    saved = feedback.filter(feedback_type="saved").count()
    accepted = feedback.filter(feedback_type__in={"saved", "liked", "tried", "good_recommendation"}).count()
    rule_hits = items.exclude(matched_rules=[]).count()
    categories = items.values("food__category_id").distinct().count()
    foods = items.values("food_id").distinct().count()
    avg_confidence = _avg([item.confidence_score for item in items[:1000]])
    precision_at_k = positives / max(total_feedback, 1)
    recall_at_k = positives / max(total_items, 1)
    coverage = foods / max(_active_food_count(), 1)
    diversity = categories / max(total_items, 1)
    ndcg = _ndcg(feedback.order_by("recommendation_item__rank")[:100])

    return {
        "precision_at_k": round(precision_at_k, 4),
        "recall_at_k": round(recall_at_k, 4),
        "ndcg": round(ndcg, 4),
        "coverage": round(coverage, 4),
        "diversity": round(diversity, 4),
        "average_confidence": round(avg_confidence, 4),
        "rule_hit_rate": round(rule_hits / max(total_items, 1), 4),
        "safety_violation_rate": round(safety_blocks / max(total_feedback, 1), 4),
        "user_save_rate": round(saved / max(total_feedback, 1), 4),
        "user_dislike_rate": round(negatives / max(total_feedback, 1), 4),
        "recommendation_acceptance_rate": round(accepted / max(total_feedback, 1), 4),
        "counts": {
            "recommendation_runs": RecommendationRun.objects.count(),
            "recommendation_items": total_items,
            "feedback": total_feedback,
            "positive_feedback": positives,
            "negative_feedback": negatives,
            "safety_reports": safety_blocks,
        },
        "high_risk_issues": _high_risk_issues(items, safety_blocks),
    }


def _active_food_count() -> int:
    from apps.foods.models import Food

    return Food.objects.filter(is_active=True).count()


def _avg(values) -> float:
    values = [float(value or 0) for value in values]
    return sum(values) / len(values) if values else 0.0


def _ndcg(feedback_items) -> float:
    import math

    dcg = 0.0
    ideal = 0.0
    gains = []
    for index, feedback in enumerate(feedback_items, start=1):
        gain = 1.0 if feedback.feedback_type in POSITIVE else 0.0
        gains.append(gain)
        dcg += gain / math.log2(index + 1)
    for index, gain in enumerate(sorted(gains, reverse=True), start=1):
        ideal += gain / math.log2(index + 1)
    return dcg / ideal if ideal else 0.0


def _high_risk_issues(items, safety_blocks: int) -> list[dict]:
    issues = []
    low_confidence = items.filter(confidence_score__lt=0.35).count()
    if safety_blocks:
        issues.append({"type": "safety_reports", "message": f"{safety_blocks} feedback items reported safety concerns."})
    if low_confidence:
        issues.append({"type": "low_confidence", "message": f"{low_confidence} recommendations have low confidence."})
    repeated_categories = (
        items.values("food__category__name")
        .annotate(total=Count("id"))
        .filter(total__gte=10)
        .order_by("-total")[:5]
    )
    for row in repeated_categories:
        issues.append({"type": "low_diversity", "message": f"{row['food__category__name']} appears {row['total']} times."})
    return issues
