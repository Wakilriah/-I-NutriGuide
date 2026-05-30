from dataclasses import dataclass

from apps.nutrients.models import NutrientInteraction
from apps.rules.models import SafetyConstraint
from apps.rules.services import canonical_key, supplement_item_variants
from apps.supplements.fact_sheets import excerpt, matching_fact_sheets

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
            if self._matches_food_term(allergy, food_terms):
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
            if self._matches_food_term(disliked, food_terms):
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
        safety_context = food_terms | food_tokens | supplement_tokens | set(self._tokens(user_profile.get("maladies", [])))
        warnings.extend(self._safety_constraint_warnings(supplements, safety_context))
        if warnings:
            safety_score = min(safety_score, self._constraint_safety_score(warnings))

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

        for fact_sheet in matching_fact_sheets(supplements, limit=2):
            safety_text = fact_sheet.interactions or fact_sheet.safety
            if not safety_text:
                continue
            warnings.append(
                {
                    "level": "info",
                    "type": "nih_ods_safety_context",
                    "title": f"NIH ODS safety context: {fact_sheet.title}",
                    "message": (
                        f"{excerpt(safety_text)} This is educational guidance, "
                        "not medical advice."
                    ),
                    "related_items": [fact_sheet.source_id],
                    "source_url": fact_sheet.url,
                }
            )

        return WarningResult(warnings=warnings, blocked=blocked, safety_score=0.0 if blocked else safety_score)

    def _safety_constraint_warnings(self, supplements, context_terms: set[str]) -> list[dict]:
        supplement_categories = set()
        for supplement in supplements or []:
            supplement_categories.update(supplement_item_variants(str(supplement)))
            supplement_categories.add(canonical_key(supplement))
        warnings = []
        for constraint in SafetyConstraint.objects.filter(is_active=True):
            category_key = canonical_key(constraint.supplement_category_name)
            category_item = f"supp:{constraint.supplement_category.canonical_item}" if constraint.supplement_category_id else ""
            if category_key not in supplement_categories and category_item not in supplement_categories:
                continue
            target = canonical_key(constraint.avoid_or_review_item.replace("context", ""))
            if target and not any(target in term or term in target for term in context_terms):
                if constraint.constraint_type == SafetyConstraint.ConstraintType.AVOID_TIMING:
                    continue
                if "disease" not in constraint.avoid_or_review_item.lower() and "intake" not in constraint.avoid_or_review_item.lower():
                    continue
            level = "warning" if constraint.constraint_type in {"medical_review", "exclusion"} else "caution"
            warnings.append(
                {
                    "level": level,
                    "type": constraint.constraint_type,
                    "title": f"{constraint.supplement_category_name} safety note",
                    "message": f"{constraint.reason} {constraint.how_to_use}".strip(),
                    "related_items": [constraint.supplement_category_name, constraint.avoid_or_review_item],
                    "source_url": constraint.source_url,
                }
            )
        return warnings

    def _constraint_safety_score(self, warnings: list[dict]) -> float:
        score = 1.0
        for warning in warnings:
            if warning.get("type") in {"medical_review", "exclusion"}:
                score = min(score, 0.35)
            elif warning.get("type") == "avoid_timing":
                score = min(score, 0.65)
        return score

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

    def _matches_food_term(self, blocked_item: str, food_terms: set[str]) -> bool:
        if not blocked_item:
            return False
        for term in food_terms:
            if len(term) < 3:
                continue
            if blocked_item == term or blocked_item in term:
                return True
            if len(term) >= 4 and term in blocked_item:
                return True
        return False

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
