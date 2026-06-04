from django.db import transaction

from apps.foods.models import Food
from apps.recommendations.models import DISCLAIMER, RecommendationItem, RecommendationRun
from apps.feedback.models import RecommendationFeedback
from apps.rules.models import AssociationRule, MinedAssociationRule
from apps.supplements.models import UserSupplement

from .cache import make_recommendation_cache_key
from .enrichment import enrich_scored_recommendation, to_api_result
from .hybrid import HybridRecommender
from .training import build_user_profile


def generate_recommendations(user, limit=10, source="api"):
    profile_snapshot = build_user_profile(user)
    payload = HybridRecommender().recommend(profile_snapshot, n=_candidate_limit(limit))
    user_supplements = _user_supplement_rows(user)
    supplement_ids_by_slug = {item["supplement__slug"]: item["supplement_id"] for item in user_supplements}

    with transaction.atomic():
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
            if rank > limit:
                break
            food = Food.objects.select_related("category").prefetch_related("nutrients__nutrient").get(id=scored["food_id"])
            enriched = enrich_scored_recommendation(scored, food=food, user_profile=profile_snapshot, user=user)
            if enriched is None:
                continue
            supplement_id = supplement_ids_by_slug.get(scored.get("related_supplement"))
            items.append(
                RecommendationItem.objects.create(
                    run=run,
                    food=food,
                    supplement_id=supplement_id,
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
    payload = HybridRecommender().recommend(profile, n=_candidate_limit(limit))
    results = []
    for scored in payload["recommendations"]:
        if len(results) >= limit:
            break
        food = Food.objects.select_related("category").prefetch_related("nutrients__nutrient").get(id=scored["food_id"])
        enriched = enrich_scored_recommendation(scored, food=food, user_profile=profile, user=user)
        if enriched is None:
            continue
        results.append(to_api_result(enriched, food))
    return {**payload, "results": results, "recommendations": results}


def get_recommendation_cache_key(user, limit):
    user_supplements = _user_supplement_rows(user)
    profile_snapshot = build_user_profile(user)
    profile_snapshot.pop("n_sessions", None)
    profile_snapshot["_cache_versions"] = _cache_versions(user)
    return make_recommendation_cache_key(
        user.id,
        profile_snapshot,
        _supplement_snapshot(user_supplements),
        limit,
    )


def _cache_versions(user):
    profile = getattr(user, "profile", None)
    profile_updated = profile.updated_at.isoformat() if profile and profile.updated_at else None
    feedback_updated = (
        RecommendationFeedback.objects.filter(user=user).order_by("-created_at").values_list("created_at", flat=True).first()
    )
    food_updated = Food.objects.order_by("-updated_at").values_list("updated_at", flat=True).first()
    rule_updated = AssociationRule.objects.order_by("-updated_at").values_list("updated_at", flat=True).first()
    mined_rule_updated = MinedAssociationRule.objects.order_by("-updated_at").values_list("updated_at", flat=True).first()
    return {
        "profile_updated_at": profile_updated,
        "feedback_updated_at": feedback_updated.isoformat() if feedback_updated else None,
        "food_dataset_version": food_updated.isoformat() if food_updated else None,
        "association_rules_version": max(
            [value for value in [rule_updated, mined_rule_updated] if value],
            default=None,
        ).isoformat()
        if (rule_updated or mined_rule_updated)
        else None,
    }


def _supplement_snapshot(user_supplements):
    return [
        {
            "id": user_supplement["supplement_id"],
            "name": user_supplement["supplement__name"],
            "slug": user_supplement["supplement__slug"],
            "dose": user_supplement["dose"],
            "frequency": user_supplement["frequency"],
            "time_of_day": user_supplement["time_of_day"],
        }
        for user_supplement in user_supplements
    ]


def _user_supplement_rows(user):
    return list(
        UserSupplement.objects.filter(user=user, active=True).values(
            "supplement_id",
            "supplement__name",
            "supplement__slug",
            "dose",
            "frequency",
            "time_of_day",
        )
    )


def _candidate_limit(limit):
    return max(limit * 4, limit + 10)
