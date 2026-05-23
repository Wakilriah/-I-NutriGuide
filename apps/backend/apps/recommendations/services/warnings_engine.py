from dataclasses import dataclass

from apps.nutrients.models import NutrientInteraction

from .normalizer import normalize_token


SERIOUS_WARNING_SUFFIX = " This is educational guidance, not medical advice."


@dataclass(frozen=True)
class WarningResult:
    warnings: list[dict]
    blocked: bool
    safety_score: float


class WarningsEngine:
    def evaluate(self, *, user_profile: dict, supplements: list[str], food, food_nutrients: list[str]) -> WarningResult:
        warnings: list[dict] = []
        blocked = False
        safety_score = 1.0
        food_terms = self._food_terms(food)

        for allergy in self._tokens(user_profile.get("allergies", [])):
            if allergy and any(allergy in term or term in allergy for term in food_terms):
                warnings.append(
                    {
                        "level": "warning",
                        "type": "allergy_conflict",
                        "title": "Allergy conflict",
                        "message": f"{food.name} appears to conflict with your saved allergy: {allergy}.",
                        "related_items": [allergy, food.slug],
                    }
                )
                blocked = True

        for disliked in self._tokens(user_profile.get("aliments_exclus", [])):
            if disliked and any(disliked in term or term in disliked for term in food_terms):
                warnings.append(
                    {
                        "level": "caution",
                        "type": "disliked_food",
                        "title": "Marked as disliked",
                        "message": f"{food.name} matches a food you prefer to avoid.",
                        "related_items": [disliked, food.slug],
                    }
                )
                safety_score = min(safety_score, 0.3)

        supplement_tokens = set(self._tokens(supplements))
        food_tokens = set(self._tokens(food_nutrients))
        for interaction in NutrientInteraction.objects.filter(active=True):
            source = normalize_token(interaction.source_key)
            target = normalize_token(interaction.target_key)
            if not self._interaction_applies(source, target, supplement_tokens, food_tokens):
                continue
            if interaction.interaction_type not in {
                NutrientInteraction.InteractionType.INHIBITS,
                NutrientInteraction.InteractionType.SHOULD_NOT_COMBINE,
                NutrientInteraction.InteractionType.COMPETES_WITH,
            } and interaction.severity != NutrientInteraction.Severity.WARNING:
                continue
            warning_level = interaction.severity
            if warning_level == NutrientInteraction.Severity.INFO:
                warning_level = "caution"
            message = interaction.mechanism
            if warning_level == "warning" and "medical advice" not in message.lower():
                message = f"{message}{SERIOUS_WARNING_SUFFIX}"
            warnings.append(
                {
                    "level": warning_level,
                    "type": "absorption_conflict" if interaction.interaction_type == "inhibits" else "nutrient_caution",
                    "title": self._warning_title(interaction),
                    "message": message,
                    "related_items": [interaction.source_key, interaction.target_key],
                }
            )
            safety_score = min(safety_score, 0.6 if warning_level == "caution" else 0.35)

        return WarningResult(warnings=warnings, blocked=blocked, safety_score=0.0 if blocked else safety_score)

    def _food_terms(self, food) -> set[str]:
        terms = {
            normalize_token(food.name),
            normalize_token(food.slug),
            normalize_token(food.category.name),
            normalize_token(food.source),
        }
        for chunk in str(food.description or "").replace("|", " ").replace(",", " ").split():
            terms.add(normalize_token(chunk))
        return {term for term in terms if term}

    def _tokens(self, values) -> list[str]:
        return [normalize_token(value) for value in values or [] if value]

    def _interaction_applies(self, source: str, target: str, supplement_tokens: set[str], food_tokens: set[str]) -> bool:
        crosses_supplement_food = (source in supplement_tokens and target in food_tokens) or (
            target in supplement_tokens and source in food_tokens
        )
        within_supplements = source in supplement_tokens and target in supplement_tokens
        return crosses_supplement_food or within_supplements

    def _warning_title(self, interaction) -> str:
        source = interaction.source_key.replace("_", " ").title()
        target = interaction.target_key.replace("_", " ").title()
        if interaction.interaction_type == NutrientInteraction.InteractionType.INHIBITS:
            return f"{source} may reduce {target} absorption"
        if interaction.interaction_type == NutrientInteraction.InteractionType.COMPETES_WITH:
            return f"{source} and {target} may compete"
        return f"{source} and {target} need caution"
