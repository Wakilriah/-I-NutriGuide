from dataclasses import dataclass

from .association import AssociationRulesEngine
from .cbf import ContentBasedFilter
from .collaborative import CollaborativeFilter
from apps.recommendations.models import DISCLAIMER

from .training import build_food_database, load_artifacts


FUSION_STRATEGIES = {
    "COLD_START": {"alpha": 0.60, "beta": 0.30, "gamma": 0.10},
    "MEDICAL_PROFILE": {"alpha": 0.50, "beta": 0.35, "gamma": 0.15},
    "ACTIVE_USER": {"alpha": 0.30, "beta": 0.30, "gamma": 0.40},
    "INTERMEDIATE": {"alpha": 0.40, "beta": 0.35, "gamma": 0.25},
}


@dataclass(frozen=True)
class HybridRecommendation:
    food_id: int
    food_name: str
    food_slug: str
    category: str
    final_score: float
    cbf_score: float
    rules_score: float
    cf_score: float
    reason: str
    safety_notes: list[str]
    matched_nutrients: list[str]
    matched_rules: list[dict]
    related_supplement: str | None


class HybridRecommender:
    def __init__(self, artifacts: dict | None = None):
        self.artifacts = artifacts or load_artifacts()
        self.cbf = ContentBasedFilter()
        self.rules = AssociationRulesEngine(self.artifacts.get("rules", []))
        self.cf = CollaborativeFilter(self.artifacts.get("cf"))

    def recommend(self, user_profile: dict, n: int = 10, foods: list[dict] | None = None) -> dict:
        food_database = foods if foods is not None else build_food_database()
        strategy = self.strategy_for(user_profile)
        weights = FUSION_STRATEGIES[strategy]
        cbf_candidates = self.cbf.get_candidates(user_profile, food_database)
        results = []
        for candidate in cbf_candidates:
            food = candidate.food
            rule_score = self.rules.score(user_profile, food)
            cf_score = self.cf.score(user_profile, food)
            final = (
                weights["alpha"] * candidate.score
                + weights["beta"] * rule_score.score
                + weights["gamma"] * cf_score
            )
            results.append(
                HybridRecommendation(
                    food_id=food["id"],
                    food_name=food["nom"],
                    food_slug=food.get("slug", ""),
                    category=food.get("category", ""),
                    final_score=round(min(final, 1.0), 4),
                    cbf_score=candidate.score,
                    rules_score=rule_score.score,
                    cf_score=cf_score,
                    reason=build_reason(user_profile, food, candidate.matched_nutrients, rule_score.matched_rules),
                    safety_notes=candidate.safety_notes,
                    matched_nutrients=candidate.matched_nutrients,
                    matched_rules=rule_score.matched_rules,
                    related_supplement=next(iter(user_profile.get("supplements", [])), None),
                )
            )
        ranked = sorted(results, key=lambda item: item.final_score, reverse=True)[:n]
        return {
            "user_id": user_profile.get("user_id"),
            "strategy": strategy,
            "weights": weights,
            "disclaimer": DISCLAIMER,
            "recommendations": [item.__dict__ for item in ranked],
        }

    def strategy_for(self, user_profile: dict) -> str:
        sessions = int(user_profile.get("n_sessions", 0) or 0)
        if sessions == 0:
            return "COLD_START"
        if user_profile.get("maladies"):
            return "MEDICAL_PROFILE"
        if sessions >= 5:
            return "ACTIVE_USER"
        return "INTERMEDIATE"


def build_reason(user_profile: dict, food: dict, nutrients: list[str], rules: list[dict]) -> str:
    parts = [f"{food['nom']} matches your nutrition profile"]
    goals = user_profile.get("goals", [])
    supplements = user_profile.get("supplements", [])
    diseases = user_profile.get("maladies", [])
    if goals:
        parts.append(f"supports your goal: {', '.join(goals)}")
    if diseases:
        parts.append(f"fits your medical safety profile: {', '.join(diseases)}")
    if supplements:
        parts.append(f"complements your supplements: {', '.join(supplements)}")
    if nutrients:
        parts.append(f"because it provides {', '.join(nutrients[:5])}")
    if rules:
        parts.append("and matches learned supplement-food association patterns")
    return ". ".join(parts) + "."
