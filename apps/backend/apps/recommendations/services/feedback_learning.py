from apps.feedback.models import RecommendationFeedback

from .normalizer import clamp


POSITIVE_FEEDBACK = {"liked", "saved", "tried", "helpful"}
NEGATIVE_FEEDBACK = {"disliked", "not_interested", "bad_taste", "not_helpful", "too_expensive"}
BLOCKING_FEEDBACK = {"unsafe_for_me", "allergy_issue"}


def feedback_score_for_food(user, food) -> tuple[float, bool]:
    if not user or not getattr(user, "is_authenticated", False):
        return 0.5, False

    feedback = RecommendationFeedback.objects.filter(user=user).select_related("food", "recommendation_item__food")
    direct = []
    category = []
    for item in feedback:
        item_food = item.food or item.recommendation_item.food
        if item_food_id := getattr(item_food, "id", None):
            if item_food_id == food.id:
                direct.append(item)
            elif item_food.category_id == food.category_id:
                category.append(item)

    if any(item.feedback_type in BLOCKING_FEEDBACK for item in direct):
        return 0.0, True

    score = 0.5
    for item in category:
        score += _feedback_delta(item) * 0.35
    for item in direct:
        score += _feedback_delta(item)
    return round(clamp(score), 4), False


def _feedback_delta(item):
    feedback_type = item.feedback_type
    if feedback_type in POSITIVE_FEEDBACK:
        return 0.18
    if feedback_type in NEGATIVE_FEEDBACK:
        return -0.22
    if item.rating:
        return (item.rating - 3) / 10
    return 0.0
