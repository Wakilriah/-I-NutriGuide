from dataclasses import dataclass

from apps.foods.models import Food
from apps.recommendations.models import DISCLAIMER, RecommendationWeightProfile

from .association import AssociationRulesEngine
from .cbf import ContentBasedFilter
from .collaborative import CollaborativeFilter
from .normalizer import clamp
from .safety_filter import SafetyFilter
from .scoring import calculate_nutrient_score
from .training import build_food_database, load_artifacts

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
    safety_notes: list
    matched_nutrients: list
    matched_rules: list
    related_supplement: str | None
    score_breakdown: dict
    safety_status: str
    safety_level: str
    safety_message: str
    blocked_reason: str
    matched_goal_reasons: list
    supplement_synergy_reasons: list
    calorie_reason: str
    similar_user_reason: str
    association_rule_reason: str


class HybridRecommender:
    """
    Main recommendation engine.

    This intentionally does not use the knowledge graph for ranking. The graph is reserved
    for LLM/context features. Ranking is based on explicit DB filters, active supplements,
    association rules, profile preferences, collaborative artifacts, and feedback enrichment.
    """

    def __init__(self, artifacts: dict | None = None):
        self.artifacts = artifacts or load_artifacts()
        self.rules = AssociationRulesEngine(self.artifacts.get("rules", []))
        self.collaborative = CollaborativeFilter(self.artifacts.get("cf"))
        self.cbf = ContentBasedFilter()
        self.safety_filter = SafetyFilter()

    def recommend(self, user_profile: dict, n: int = 10, foods: list[dict] | None = None) -> dict:
        food_rows = foods or build_food_database()
        food_rows_by_id = {row["id"]: row for row in food_rows}
        queryset = (
            Food.objects.filter(is_active=True, id__in=food_rows_by_id.keys())
            .select_related("category")
            .prefetch_related("nutrients__nutrient")
        )
        queryset = self.safety_filter.filter_queryset(queryset, user_profile)
        user_supplements = list(self._active_user_supplements(user_profile))
        supplement_tokens = list(user_profile.get("supplements", []))
        weights, user_type = self._weights_for_user(user_profile)

        recommendations = []
        for food in queryset:
            row = food_rows_by_id.get(food.id)
            if not row:
                continue
            safety = self.safety_filter.evaluate(
                food=food,
                food_row=row,
                user_profile=user_profile,
                supplements=supplement_tokens,
            )
            if safety.status == "BLOCKED":
                continue

            cbf = self.cbf.score_food(user_profile, row)
            if cbf is None:
                continue
            _nutrient_score, nutrient_matches, matched_supplement = calculate_nutrient_score(food, user_supplements)
            association = self.rules.score(user_profile, row)
            cf_score = self.collaborative.score(user_profile, row)
            final_score = clamp(
                (weights["alpha"] * cbf.score)
                + (weights["beta"] * association.score)
                + (weights["gamma"] * cf_score)
            )

            if final_score <= 0:
                continue

            matched_nutrients = sorted(set(cbf.matched_nutrients + nutrient_matches))
            related_supplement = matched_supplement.slug if matched_supplement else self._related_supplement_from_rules(
                association.matched_rules
            )
            recommendations.append(
                HybridRecommendation(
                    food_id=food.id,
                    food_name=food.name,
                    food_slug=food.slug,
                    category=food.category.name,
                    final_score=round(final_score, 4),
                    cbf_score=round(cbf.score, 4),
                    rules_score=round(association.score, 4),
                    cf_score=round(cf_score, 4),
                    reason=self._reason(cbf, association.score, cf_score),
                    safety_notes=safety.details,
                    matched_nutrients=matched_nutrients,
                    matched_rules=association.matched_rules,
                    related_supplement=related_supplement,
                    score_breakdown={
                        "content_based_score": round(cbf.score, 4),
                        "objective_score": cbf.objective_score,
                        "medical_score": cbf.medical_score,
                        "supplement_score": cbf.supplement_score,
                        "caloric_score": cbf.calorie_score,
                        "association_rule_score": round(association.score, 4),
                        "collaborative_score": round(cf_score, 4),
                        "final_hybrid_score": round(final_score, 4),
                        "alpha": weights["alpha"],
                        "beta": weights["beta"],
                        "gamma": weights["gamma"],
                        "user_type": user_type,
                    },
                    safety_status=safety.status,
                    safety_level=safety.level,
                    safety_message=safety.message,
                    blocked_reason=safety.blocked_reason,
                    matched_goal_reasons=self._goal_reasons(user_profile, cbf),
                    supplement_synergy_reasons=self._supplement_reasons(user_profile, cbf),
                    calorie_reason=self._calorie_reason(user_profile, row, cbf.calorie_score),
                    similar_user_reason=self._cf_reason(cf_score),
                    association_rule_reason=self._association_reason(association.matched_rules),
                )
            )

        recommendations.sort(key=lambda item: (item.final_score, item.rules_score, item.cbf_score, item.cf_score), reverse=True)
        if not recommendations:
            recommendations = self._fallback_recommendation(n, user_profile)

        return {
            "user_id": user_profile.get("user_id"),
            "strategy": "ASSOCIATION_RULES_FILTERED",
            "weights": weights,
            "user_type": user_type,
            "disclaimer": DISCLAIMER,
            "recommendations": [item.__dict__ for item in recommendations[:n]],
        }

    def _active_user_supplements(self, user_profile: dict):
        from apps.supplements.models import UserSupplement

        user_id = user_profile.get("user_id")
        if not user_id:
            return []
        return (
            UserSupplement.objects.filter(user_id=user_id, active=True)
            .select_related("supplement")
            .prefetch_related("supplement__nutrients__nutrient")
        )

    def _fallback_recommendation(self, n: int, user_profile: dict):
        queryset = self.safety_filter.filter_queryset(Food.objects.filter(is_active=True).select_related("category"), user_profile)
        return [
            HybridRecommendation(
                food_id=food.id,
                food_name=food.name,
                food_slug=food.slug,
                category=food.category.name if food.category else "General",
                final_score=0.45,
                cbf_score=0.0,
                rules_score=0.0,
                cf_score=0.0,
                reason="Filtered fallback recommendation based on your profile.",
                safety_notes=[],
                matched_nutrients=[],
                matched_rules=[],
                related_supplement=None,
                score_breakdown={
                    "content_based_score": 0.0,
                    "association_rule_score": 0.0,
                    "collaborative_score": 0.0,
                    "final_hybrid_score": 0.45,
                },
                safety_status="SAFE",
                safety_level="LOW",
                safety_message="Safe fallback for your current profile.",
                blocked_reason="",
                matched_goal_reasons=[],
                supplement_synergy_reasons=[],
                calorie_reason="No scored candidates were available, so this safe fallback is shown.",
                similar_user_reason="Collaborative filtering had insufficient data.",
                association_rule_reason="No association rule matched.",
            )
            for food in queryset[:n]
        ]

    def _related_supplement_from_rules(self, matched_rules: list[dict]) -> str | None:
        for rule in matched_rules:
            antecedents = []
            if rule.get("antecedent"):
                antecedents.append(rule.get("antecedent"))
            antecedents.extend(rule.get("antecedent_items") or rule.get("antecedents") or [])
            for antecedent in antecedents:
                if isinstance(antecedent, str) and antecedent.startswith(("supplement:", "supp:")):
                    return antecedent.split(":", 1)[1]
        return None

    def _weights_for_user(self, user_profile: dict) -> tuple[dict, str]:
        has_medical_constraints = bool(
            user_profile.get("allergies")
            or user_profile.get("maladies")
            or user_profile.get("diseases")
            or user_profile.get("dietary_restrictions")
        )
        if has_medical_constraints:
            user_type = "complex_medical_case"
            return self._configured_weights(user_type, {"alpha": 0.25, "beta": 0.60, "gamma": 0.15}), user_type
        if int(user_profile.get("n_sessions", 0) or 0) < 3:
            user_type = "new_user"
            return self._configured_weights(user_type, {"alpha": 0.25, "beta": 0.60, "gamma": 0.15}), user_type
        user_type = "active_user"
        return self._configured_weights(user_type, {"alpha": 0.25, "beta": 0.60, "gamma": 0.15}), user_type

    def _configured_weights(self, user_type: str, defaults: dict) -> dict:
        profile = RecommendationWeightProfile.objects.filter(user_type=user_type, is_active=True).first()
        if not profile:
            return defaults
        total = profile.alpha + profile.beta + profile.gamma
        if total <= 0:
            return defaults
        return {
            "alpha": round(profile.alpha / total, 4),
            "beta": round(profile.beta / total, 4),
            "gamma": round(profile.gamma / total, 4),
        }

    def _reason(self, cbf, rule_score: float, cf_score: float) -> str:
        parts = []
        if rule_score > 0:
            parts.append("association rules matched your supplement/profile pattern")
        if cbf.supplement_score > 0:
            parts.append("nutrients complement your active supplements")
        if cf_score > 0:
            parts.append("similar-user feedback supports this food")
        if cbf.objective_score > 0:
            parts.append("it fits your nutrition goals")
        return "Recommended because " + ", ".join(parts[:3]) + "." if parts else "Recommended after profile filtering."

    def _goal_reasons(self, user_profile: dict, cbf) -> list[str]:
        if not user_profile.get("goals") or cbf.objective_score <= 0:
            return []
        goals = ", ".join(str(goal).replace("_", " ") for goal in user_profile.get("goals", [])[:3])
        return [f"Matches goal context: {goals}."]

    def _supplement_reasons(self, user_profile: dict, cbf) -> list[str]:
        if not user_profile.get("supplements") or cbf.supplement_score <= 0:
            return []
        supplements = ", ".join(str(supplement).replace("_", " ") for supplement in user_profile.get("supplements", [])[:3])
        return [f"Complements supplement context: {supplements}."]

    def _calorie_reason(self, user_profile: dict, food: dict, calorie_score: float) -> str:
        kcal = food.get("kcal_100g", 0)
        if calorie_score >= 0.7:
            return f"Calories fit the current BMI, activity, and goal context ({kcal:g} kcal/100g)."
        return f"Calories are acceptable but not the strongest fit for the current context ({kcal:g} kcal/100g)."

    def _cf_reason(self, cf_score: float) -> str:
        if cf_score > 0:
            return "Similar users provided positive signals for this food."
        if cf_score < 0:
            return "Similar users provided negative signals for this food."
        return "Collaborative filtering had insufficient matching interaction data."

    def _association_reason(self, matched_rules: list[dict]) -> str:
        if not matched_rules:
            return "No association rule matched."
        return matched_rules[0].get("explanation") or "A stored association rule matched this recommendation."
