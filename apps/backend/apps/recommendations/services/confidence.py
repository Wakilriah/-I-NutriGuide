from .normalizer import clamp


CONFIDENCE_WEIGHTS = {
    "content_based_score": 0.25,
    "association_rule_score": 0.25,
    "nutrient_synergy_score": 0.20,
    "collaborative_score": 0.10,
    "feedback_score": 0.10,
    "profile_match_score": 0.10,
}


def normalize_score(value) -> float:
    try:
        return round(clamp(float(value or 0)), 4)
    except (TypeError, ValueError):
        return 0.0


def confidence_label(score: float) -> str:
    if score >= 0.8:
        return "High"
    if score >= 0.55:
        return "Medium"
    return "Low"


def calculate_confidence(score_breakdown: dict) -> tuple[float, str]:
    safety_score = normalize_score(score_breakdown.get("safety_score", 1.0))
    weighted = 0.0
    for key, weight in CONFIDENCE_WEIGHTS.items():
        weighted += normalize_score(score_breakdown.get(key)) * weight
    score = round(clamp(weighted * safety_score), 4)
    return score, confidence_label(score)
