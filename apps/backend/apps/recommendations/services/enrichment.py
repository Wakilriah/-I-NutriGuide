from apps.foods.models import Food
from apps.nutrients.models import NutrientInteraction

from .confidence import calculate_confidence, normalize_score
from .explanation_engine import ExplanationEngine
from .feedback_learning import feedback_score_for_food
from .normalizer import normalize_token
from .warnings_engine import WarningsEngine


def enrich_scored_recommendation(scored: dict, *, food: Food, user_profile: dict, user=None) -> dict | None:
    food_nutrients = _food_nutrient_slugs(food)
    supplements = [normalize_token(value) for value in user_profile.get("supplements", [])]
    warnings_result = WarningsEngine().evaluate(
        user_profile=user_profile,
        supplements=supplements,
        food=food,
        food_nutrients=food_nutrients,
    )
    if warnings_result.blocked:
        return None

    feedback_score, feedback_blocked = feedback_score_for_food(user, food)
    if feedback_blocked:
        return None

    nutrient_synergy_score = _nutrient_synergy_score(supplements, food_nutrients)
    profile_match_score = _profile_match_score(user_profile, scored)
    score_breakdown = {
        "content_based_score": normalize_score(scored.get("cbf_score")),
        "association_rule_score": normalize_score(scored.get("rules_score")),
        "collaborative_score": normalize_score(scored.get("cf_score")),
        "nutrient_synergy_score": nutrient_synergy_score,
        "safety_score": warnings_result.safety_score,
        "profile_match_score": profile_match_score,
        "feedback_score": feedback_score,
    }
    confidence_score, confidence_label = calculate_confidence(score_breakdown)
    explanation = ExplanationEngine().explain(
        user_profile=user_profile,
        supplements=supplements,
        food=food,
        food_nutrients=food_nutrients,
        matched_rules=scored.get("matched_rules", []),
        score_breakdown=score_breakdown,
        warnings=warnings_result.warnings,
    )
    tags = sorted(set((scored.get("matched_nutrients") or []) + [reason["title"] for reason in explanation["reasons"][:2]]))
    return {
        **scored,
        "final_score": confidence_score,
        "confidence_score": confidence_score,
        "confidence_label": confidence_label,
        "score_breakdown": score_breakdown,
        "explanation_details": explanation,
        "reason": explanation["summary"],
        "safety_notes": warnings_result.warnings,
        "tags": tags[:6],
    }


def to_api_result(scored: dict, food: Food, recommendation_id=None, item_id=None, user_feedback=None) -> dict:
    score_breakdown = scored.get("score_breakdown", {})
    explanation = scored.get("explanation_details", {"summary": scored.get("reason", ""), "reasons": []})
    warnings = scored.get("safety_notes", [])
    return {
        "id": item_id or scored.get("id") or scored.get("food_id"),
        "recommendation_id": recommendation_id,
        "food_id": food.id,
        "food_name": food.name,
        "food_slug": food.slug,
        "category": food.category.name,
        "food": {
            "id": food.id,
            "name": food.name,
            "slug": food.slug,
            "category": food.category.name,
            "nutrients": _food_nutrient_slugs(food),
        },
        "confidence_score": scored.get("confidence_score", scored.get("final_score", 0)),
        "confidence_label": scored.get("confidence_label", "Medium"),
        "score": scored.get("final_score", 0),
        "final_score": scored.get("final_score", 0),
        "cbf_score": score_breakdown.get("content_based_score", scored.get("cbf_score", 0)),
        "rules_score": score_breakdown.get("association_rule_score", scored.get("rules_score", 0)),
        "cf_score": score_breakdown.get("collaborative_score", scored.get("cf_score", 0)),
        "reason": explanation.get("summary", scored.get("reason", "")),
        "safety_notes": warnings,
        "matched_nutrients": scored.get("matched_nutrients", []),
        "matched_rules": scored.get("matched_rules", []),
        "related_supplement": scored.get("related_supplement"),
        "score_breakdown": score_breakdown,
        "explanation": explanation,
        "warnings": warnings,
        "feedback": {
            "user_feedback": user_feedback,
            "available_actions": ["liked", "disliked", "saved", "tried", "not_interested"],
        },
    }


def _food_nutrient_slugs(food: Food) -> list[str]:
    return [
        normalize_token(link.nutrient.slug or link.nutrient.name)
        for link in food.nutrients.select_related("nutrient").all()
    ]


def _nutrient_synergy_score(supplements: list[str], food_nutrients: list[str]) -> float:
    tokens = set(supplements + food_nutrients)
    evidence = {"low": 0.35, "medium": 0.65, "high": 0.9}
    best = 0.0
    for interaction in NutrientInteraction.objects.filter(active=True).exclude(interaction_type__in=["inhibits", "should_not_combine"]):
        source = normalize_token(interaction.source_key)
        target = normalize_token(interaction.target_key)
        if source in tokens and target in tokens:
            best = max(best, evidence.get(interaction.evidence_level, 0.55))
    return round(best, 4)


def _profile_match_score(user_profile: dict, scored: dict) -> float:
    base = normalize_score(scored.get("cbf_score"))
    if user_profile.get("goals"):
        return max(base, 0.65)
    return base or 0.5
