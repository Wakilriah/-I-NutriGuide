from apps.nutrients.models import NutrientInteraction

from .normalizer import normalize_token


class ExplanationEngine:
    def explain(
        self,
        *,
        user_profile: dict,
        supplements: list[str],
        food,
        food_nutrients: list[str],
        matched_rules: list[dict],
        score_breakdown: dict,
        warnings: list[dict],
    ) -> dict:
        reasons = []
        interaction_reasons = self._interaction_reasons(supplements, food_nutrients)
        reasons.extend(interaction_reasons)

        for rule in matched_rules[:2]:
            explanation = rule.get("explanation") or "This pairing is commonly associated with supplement-food complementarity."
            reasons.append(
                {
                    "type": "association_rule",
                    "title": "Known pairing signal",
                    "message": self._safe_message(explanation),
                    "confidence": round(min(float(rule.get("confidence", rule.get("score", 0.7)) or 0.7), 1.0), 4),
                }
            )

        goals = user_profile.get("goals", [])
        if goals:
            goal = str(goals[0]).replace("_", " ")
            reasons.append(
                {
                    "type": "profile_match",
                    "title": "Matches your goal",
                    "message": f"{food.name} may support your {goal} goal as part of a balanced routine.",
                    "confidence": score_breakdown.get("profile_match_score", 0.7),
                }
            )

        if warnings:
            reasons.append(
                {
                    "type": "safety_context",
                    "title": "Safety context checked",
                    "message": "Known allergies, preferences, and interaction cautions were checked before showing this recommendation.",
                    "confidence": score_breakdown.get("safety_score", 1.0),
                }
            )

        if not reasons:
            reasons.append(
                {
                    "type": "balanced_match",
                    "title": "General nutrition fit",
                    "message": f"{food.name} can help add variety to your supplement-aware nutrition plan.",
                    "confidence": score_breakdown.get("content_based_score", 0.5),
                }
            )

        summary = self._summary(food.name, reasons)
        return {"summary": summary, "reasons": reasons[:5]}

    def _interaction_reasons(self, supplements: list[str], food_nutrients: list[str]) -> list[dict]:
        tokens = {normalize_token(value) for value in supplements + food_nutrients if value}
        reasons = []
        evidence_weight = {"low": 0.55, "medium": 0.74, "high": 0.91}
        for interaction in NutrientInteraction.objects.filter(active=True).exclude(interaction_type__in=["inhibits", "should_not_combine"]):
            source = normalize_token(interaction.source_key)
            target = normalize_token(interaction.target_key)
            if source not in tokens or target not in tokens:
                continue
            reasons.append(
                {
                    "type": "nutrient_synergy",
                    "title": f"{interaction.source_key.replace('_', ' ').title()} + {interaction.target_key.replace('_', ' ').title()}",
                    "message": self._safe_message(interaction.mechanism),
                    "confidence": evidence_weight.get(interaction.evidence_level, 0.65),
                }
            )
        return reasons

    def _summary(self, food_name: str, reasons: list[dict]) -> str:
        first = reasons[0]["message"].rstrip(".")
        return f"{food_name} is recommended because {first[0].lower()}{first[1:]}."

    def _safe_message(self, message: str) -> str:
        unsafe_replacements = {
            "will cure": "may support",
            "guarantees": "may support",
            "guarantee": "may support",
            "treats disease": "is commonly associated with nutrition support",
            "cures": "may support",
        }
        safe = message
        for unsafe, replacement in unsafe_replacements.items():
            safe = safe.replace(unsafe, replacement).replace(unsafe.title(), replacement)
        return safe
