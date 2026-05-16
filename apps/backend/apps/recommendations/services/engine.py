from apps.foods.models import Food
from apps.recommendations.models import DISCLAIMER, RecommendationItem, RecommendationRun
from apps.supplements.models import UserSupplement

from .cache import make_recommendation_cache_key
from .hybrid import HybridRecommender
from .training import build_user_profile


def generate_recommendations(user, limit=10, source="api"):
    profile_snapshot = build_user_profile(user)
    payload = HybridRecommender().recommend(profile_snapshot, n=limit)
    user_supplements = list(UserSupplement.objects.filter(user=user, active=True).select_related("supplement"))
    supplements_by_slug = {item.supplement.slug: item.supplement for item in user_supplements}
    run = RecommendationRun.objects.create(
        user=user,
        input_snapshot={
            "limit": limit,
            "strategy": payload["strategy"],
            "weights": payload["weights"],
            "engine": "hybrid",
            "source": source,
        },
        profile_snapshot=profile_snapshot,
        supplements_snapshot=_supplement_snapshot(user_supplements),
        disclaimer=DISCLAIMER,
    )

    items = []
    for index, scored in enumerate(payload["recommendations"], start=1):
        food = Food.objects.get(id=scored["food_id"])
        supplement = supplements_by_slug.get(scored.get("related_supplement"))
        items.append(
            RecommendationItem.objects.create(
                run=run,
                food=food,
                supplement=supplement,
                score=scored["final_score"],
                nutrient_score=scored["cbf_score"],
                rule_score=scored["rules_score"],
                preference_score=scored["cf_score"],
                matched_nutrients=scored["matched_nutrients"],
                matched_rules=scored["matched_rules"],
                explanation=scored["reason"],
                warnings=scored["safety_notes"],
                tags=scored["matched_nutrients"],
                rank=index,
            )
        )

    run.items.set(items)
    return run


def get_food_recommendations_payload(user, limit=10):
    return HybridRecommender().recommend(build_user_profile(user), n=limit)


def get_recommendation_cache_key(user, limit):
    user_supplements = list(
        UserSupplement.objects.filter(user=user, active=True)
        .select_related("supplement")
        .prefetch_related("supplement__nutrients__nutrient")
    )
    profile_snapshot = build_user_profile(user)
    profile_snapshot.pop("n_sessions", None)
    return make_recommendation_cache_key(
        user.id,
        profile_snapshot,
        _supplement_snapshot(user_supplements),
        limit,
    )


def _supplement_snapshot(user_supplements):
    return [
        {
            "id": user_supplement.supplement.id,
            "name": user_supplement.supplement.name,
            "slug": user_supplement.supplement.slug,
            "dose": user_supplement.dose,
            "frequency": user_supplement.frequency,
            "time_of_day": user_supplement.time_of_day,
        }
        for user_supplement in user_supplements
    ]
