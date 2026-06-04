from apps.foods.models import Food

from .food_metadata import recommendation_food_payload
from .normalizer import normalize_many
from .safety_filter import SafetyFilter


def alternatives_for_food(food: Food, user_profile: dict, limit: int = 4, filters: list[str] | None = None) -> list[dict]:
    filters = set(normalize_many(filters or []))
    base_tags = set(normalize_many(food.nutrient_tags or []))
    base_diet_tags = set(normalize_many(food.diet_tags or []))
    safety_filter = SafetyFilter()
    candidates = (
        Food.objects.filter(is_active=True)
        .exclude(id=food.id)
        .select_related("category")
        .prefetch_related("nutrients__nutrient")
    )
    candidates = safety_filter.filter_queryset(candidates, user_profile)

    ranked = []
    for candidate in candidates[:300]:
        decision = safety_filter.evaluate(food=candidate, food_row={}, user_profile=user_profile)
        if decision.status == "BLOCKED":
            continue
        candidate_tags = set(normalize_many(candidate.nutrient_tags or []))
        candidate_diet_tags = set(normalize_many(candidate.diet_tags or []))
        if filters and not filters.intersection(candidate_tags | candidate_diet_tags | {candidate.category.slug}):
            continue
        overlap = len(base_tags & candidate_tags)
        diet_overlap = len(base_diet_tags & candidate_diet_tags)
        category_match = int(candidate.category_id == food.category_id)
        score = (0.55 * overlap) + (0.25 * diet_overlap) + (0.2 * category_match)
        if score <= 0 and filters:
            score = 0.2
        if score > 0:
            payload = recommendation_food_payload(
                candidate,
                nutrients=list(candidate.nutrients.values_list("nutrient__slug", flat=True)),
            )
            payload["match_score"] = round(min(score / 5, 1), 4)
            payload["reason"] = _alternative_reason(candidate_tags, candidate_diet_tags, filters)
            ranked.append((score, payload))

    ranked.sort(key=lambda item: item[0], reverse=True)
    return [payload for _score, payload in ranked[:limit]]


def _alternative_reason(candidate_tags: set[str], diet_tags: set[str], filters: set[str]) -> str:
    matched = sorted((candidate_tags | diet_tags) & filters)
    if matched:
        return f"Matches alternative filter: {matched[0].replace('_', ' ')}."
    if candidate_tags:
        return f"Similar nutrient profile: {sorted(candidate_tags)[0].replace('_', ' ')}."
    return "Similar category and compatible with your profile."
