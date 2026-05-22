from apps.foods.models import Food
from apps.recommendations.models import DISCLAIMER, RecommendationItem, RecommendationRun
from apps.supplements.models import UserSupplement

from .cache import make_recommendation_cache_key
from .enrichment import enrich_scored_recommendation, to_api_result
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
    rank = 1
    for scored in payload["recommendations"]:
        food = Food.objects.select_related("category").prefetch_related("nutrients__nutrient").get(id=scored["food_id"])
        enriched = enrich_scored_recommendation(scored, food=food, user_profile=profile_snapshot, user=user)
        if enriched is None:
            continue
        supplement = supplements_by_slug.get(scored.get("related_supplement"))
        items.append(
            RecommendationItem.objects.create(
                run=run,
                food=food,
                supplement=supplement,
                score=enriched["final_score"],
                nutrient_score=enriched["score_breakdown"]["content_based_score"],
                rule_score=enriched["score_breakdown"]["association_rule_score"],
                preference_score=enriched["score_breakdown"]["collaborative_score"],
                confidence_score=enriched["confidence_score"],
                confidence_label=enriched["confidence_label"],
                score_breakdown=enriched["score_breakdown"],
                matched_nutrients=enriched["matched_nutrients"],
                matched_rules=enriched["matched_rules"],
                explanation=enriched["reason"],
                explanation_details=enriched["explanation_details"],
                warnings=enriched["safety_notes"],
                tags=enriched["tags"],
                rank=rank,
            )
        )
        rank += 1

    run.items.set(items)
    return run


def get_food_recommendations_payload(user, limit=10):
    profile = build_user_profile(user)
    payload = HybridRecommender().recommend(profile, n=limit)
    results = []
    for scored in payload["recommendations"]:
        food = Food.objects.select_related("category").prefetch_related("nutrients__nutrient").get(id=scored["food_id"])
        enriched = enrich_scored_recommendation(scored, food=food, user_profile=profile, user=user)
        if enriched is None:
            continue
        results.append(to_api_result(enriched, food))
    return {**payload, "results": results, "recommendations": results}


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
