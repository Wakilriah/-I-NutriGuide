from dataclasses import dataclass

from apps.recommendations.models import DISCLAIMER

from .association import AssociationRulesEngine
from .cbf import ContentBasedFilter
from .collaborative import CollaborativeArtifacts, CollaborativeFilter
from .normalizer import clamp, normalize_token
from .training import build_food_database, build_rules_from_database, load_artifacts


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
        self.artifacts = artifacts if artifacts is not None else load_artifacts()
        self.cbf = ContentBasedFilter()
        self.rules = AssociationRulesEngine(self.artifacts.get("rules") or build_rules_from_database())
        self.cf = CollaborativeFilter(self._collaborative_artifacts())
        self.weights = {"content_based": 0.25, "association_rules": 0.60, "collaborative": 0.15}

    def recommend(self, user_profile: dict, n: int = 10, foods: list[dict] | None = None) -> dict:
        food_database = foods or build_food_database()
        scored = []

        for food in food_database:
            cbf_result = self.cbf.score_food(user_profile, food)
            if cbf_result is None:
                continue

            rule_result = self.rules.score(user_profile, food)
            cf_score = self.cf.score(user_profile, food)
            final_score = self._final_score(cbf_result.score, rule_result.score, cf_score)

            matched_nutrients = sorted(set(cbf_result.matched_nutrients + self._rule_nutrients(rule_result.matched_rules)))
            scored.append(
                HybridRecommendation(
                    food_id=food["id"],
                    food_name=food["nom"],
                    food_slug=food["slug"],
                    category=food.get("category") or "General",
                    final_score=final_score,
                    cbf_score=cbf_result.score,
                    rules_score=rule_result.score,
                    cf_score=cf_score,
                    reason=self._reason(cbf_result.score, rule_result.score, cf_score),
                    safety_notes=cbf_result.safety_notes,
                    matched_nutrients=matched_nutrients,
                    matched_rules=rule_result.matched_rules,
                    related_supplement=self._related_supplement(rule_result.matched_rules, user_profile),
                )
            )

        scored.sort(key=lambda item: (item.final_score, item.rules_score, item.cbf_score, item.food_name), reverse=True)
        results = scored[:n]

        return {
            "user_id": user_profile.get("user_id"),
            "strategy": "ASSOCIATION_RULES",
            "weights": self.weights,
            "disclaimer": DISCLAIMER,
            "recommendations": [item.__dict__ for item in results],
        }

    def _collaborative_artifacts(self) -> CollaborativeArtifacts:
        artifacts = self.artifacts.get("cf")
        if isinstance(artifacts, CollaborativeArtifacts):
            return artifacts
        return CollaborativeArtifacts(user_vectors={}, food_scores={}, feature_order=[])

    def _final_score(self, cbf_score: float, rule_score: float, cf_score: float) -> float:
        score = (
            self.weights["content_based"] * cbf_score
            + self.weights["association_rules"] * rule_score
            + self.weights["collaborative"] * cf_score
        )
        return round(clamp(score), 4)

    def _reason(self, cbf_score: float, rule_score: float, cf_score: float) -> str:
        parts = []
        if rule_score > 0:
            parts.append("matched association rules from your supplement and nutrition profile")
        if cbf_score > 0:
            parts.append("fits your nutrition goals and health context")
        if cf_score > 0:
            parts.append("aligns with similar user feedback")
        return "Recommended because it " + ", ".join(parts) + "." if parts else "General nutrition recommendation."

    def _rule_nutrients(self, matched_rules: list[dict]) -> list[str]:
        nutrients = []
        for rule in matched_rules:
            consequent = rule.get("consequent", "")
            if consequent.startswith("nutrient:"):
                nutrients.append(normalize_token(consequent.split(":", 1)[1]))
        return nutrients

    def _related_supplement(self, matched_rules: list[dict], user_profile: dict) -> str | None:
        user_supplements = {normalize_token(value): value for value in user_profile.get("supplements", [])}
        for rule in matched_rules:
            antecedent = rule.get("antecedent", "")
            if not antecedent.startswith("supplement:"):
                continue
            key = normalize_token(antecedent.split(":", 1)[1])
            return user_supplements.get(key, key)
        return None
