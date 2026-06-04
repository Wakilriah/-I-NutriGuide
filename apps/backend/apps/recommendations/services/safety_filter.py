from dataclasses import dataclass, field

from django.db.models import Q

from apps.rules.models import SafetyConstraint
from apps.rules.services import canonical_key, supplement_item_variants

from .normalizer import normalize_many, normalize_token


MEAT_TERMS = {"meat", "viande", "charcuterie", "abats", "boeuf", "poulet", "porc"}
FISH_TERMS = {"fish", "poisson", "crustace", "mollusque"}
DAIRY_TERMS = {"dairy", "lait", "fromage", "yaourt", "yogourt", "creme", "lactose"}
EGG_TERMS = {"egg", "oeuf"}
GLUTEN_TERMS = {"gluten", "wheat", "ble", "orge", "seigle"}

DISEASE_EXCLUSION_TERMS = {
    "diabete": {"soda", "sucre", "sugar", "sweet", "dessert", "candy", "sirop"},
    "cardio": {"charcuterie", "processed_meat", "fried", "frit", "sodium"},
    "hypertension": {"sodium", "salt", "sale", "charcuterie"},
    "celiac": GLUTEN_TERMS,
    "maladie_coeliaque": GLUTEN_TERMS,
}


@dataclass(frozen=True)
class SafetyDecision:
    safe: bool
    status: str = "SAFE"
    level: str = "LOW"
    message: str = "Safe for your current profile."
    blocked_reason: str = ""
    reasons: list[str] = field(default_factory=list)
    details: list[dict] = field(default_factory=list)


class SafetyFilter:
    """
    Hard pre-scoring safety gate for recommendations.

    If this filter returns unsafe, the food must not be scored or returned.
    """

    def __init__(self):
        self._active_constraints = None

    def filter_queryset(self, queryset, user_profile: dict):
        excluded = set(normalize_many(user_profile.get("aliments_exclus", [])))
        allergies = set(normalize_many(user_profile.get("allergies", [])))
        restrictions = self._restriction_tokens(user_profile)

        if excluded:
            queryset = queryset.exclude(slug__in=excluded)
        for token in allergies:
            queryset = queryset.exclude(
                Q(slug__icontains=token)
                | Q(name__icontains=token)
                | Q(category__slug__icontains=token)
                | Q(category__name__icontains=token)
                | Q(allergen_tags__icontains=token)
            )
        if "vegan" in restrictions:
            queryset = self._exclude_terms(queryset, MEAT_TERMS | FISH_TERMS | DAIRY_TERMS | EGG_TERMS)
        if "vegetarian" in restrictions:
            queryset = self._exclude_terms(queryset, MEAT_TERMS | FISH_TERMS)
        if "lactose_free" in restrictions:
            queryset = self._exclude_terms(queryset, DAIRY_TERMS)
        if "gluten_free" in restrictions:
            queryset = self._exclude_terms(queryset, GLUTEN_TERMS)
        return queryset

    def evaluate(self, *, food, food_row: dict | None, user_profile: dict, supplements: list[str] | None = None) -> SafetyDecision:
        row = food_row or {}
        terms = self._food_terms(food, row)
        details = []

        for allergy in normalize_many(user_profile.get("allergies", [])):
            if self._matches(allergy, terms):
                details.append(self._detail("allergy", f"Contains or matches allergy '{allergy}'.", allergy, "HIGH"))

        for disliked in normalize_many(user_profile.get("aliments_exclus", [])):
            if self._matches(disliked, terms):
                details.append(self._detail("disliked_food", f"Matches disliked or forbidden food '{disliked}'.", disliked, "HIGH"))

        restrictions = self._restriction_tokens(user_profile)
        restriction_conflicts = self._restriction_conflicts(restrictions, terms)
        details.extend(restriction_conflicts)

        for disease in normalize_many(user_profile.get("maladies", []) + user_profile.get("diseases", [])):
            for blocked in DISEASE_EXCLUSION_TERMS.get(disease, set()):
                if self._matches(blocked, terms):
                    details.append(self._detail("disease_constraint", f"Conflicts with disease constraint '{disease}'.", disease, "HIGH"))

        caution_text = normalize_token(getattr(food, "avoid_or_caution", "") or row.get("avoid_or_caution"))
        for disease in normalize_many(user_profile.get("maladies", []) + user_profile.get("diseases", [])):
            if disease and disease in caution_text:
                details.append(self._detail("contraindication", f"Food caution text mentions '{disease}'.", disease, "HIGH"))

        details.extend(self._constraint_conflicts(supplements or user_profile.get("supplements", []), terms, user_profile))

        if details:
            level = self._highest_level(details)
            status = "BLOCKED" if level == "HIGH" else "WARNING"
            message = details[0]["message"]
            return SafetyDecision(
                safe=status != "BLOCKED",
                status=status,
                level=level,
                message=message,
                blocked_reason=message if status == "BLOCKED" else "",
                reasons=[detail["message"] for detail in details],
                details=details,
            )
        return SafetyDecision(safe=True)

    def medical_violation(self, food, user_profile: dict, food_row: dict | None = None) -> bool:
        return not self.evaluate(food=food, food_row=food_row, user_profile=user_profile).safe

    def _exclude_terms(self, queryset, terms):
        query = Q()
        for term in terms:
            query |= Q(category__slug__icontains=term) | Q(category__name__icontains=term) | Q(diet_tags__icontains=term)
        return queryset.exclude(query)

    def _restriction_tokens(self, user_profile: dict) -> set[str]:
        restrictions = set(normalize_many(user_profile.get("dietary_restrictions", [])))
        diet_type = normalize_token(user_profile.get("diet_type"))
        if diet_type and diet_type != "none":
            restrictions.add(diet_type)
        return restrictions

    def _food_terms(self, food, row: dict) -> set[str]:
        values = [
            getattr(food, "name", None) or row.get("nom"),
            getattr(food, "slug", None) or row.get("slug"),
            getattr(getattr(food, "category", None), "name", None) or row.get("category"),
            getattr(getattr(food, "category", None), "slug", None),
            getattr(food, "description", None),
            getattr(food, "source", None) or row.get("source"),
            getattr(food, "avoid_or_caution", None) or row.get("avoid_or_caution"),
        ]
        values.extend(getattr(food, "allergen_tags", []) or row.get("allergenes", []))
        values.extend(getattr(food, "diet_tags", []) or row.get("diet_tags", []))
        values.extend(row.get("association_rule_items", []))
        terms = set(normalize_many(values))
        for value in values:
            for chunk in str(value or "").replace("|", " ").replace(",", " ").split():
                token = normalize_token(chunk)
                if token:
                    terms.add(token)
        return terms

    def _restriction_conflicts(self, restrictions: set[str], terms: set[str]) -> list[dict]:
        details = []
        if "vegan" in restrictions and self._matches_any(MEAT_TERMS | FISH_TERMS | DAIRY_TERMS | EGG_TERMS, terms):
            details.append(self._detail("dietary_restriction", "Conflicts with vegan restriction.", "vegan", "HIGH"))
        if "vegetarian" in restrictions and self._matches_any(MEAT_TERMS | FISH_TERMS, terms):
            details.append(self._detail("dietary_restriction", "Conflicts with vegetarian restriction.", "vegetarian", "HIGH"))
        if "lactose_free" in restrictions and self._matches_any(DAIRY_TERMS, terms):
            details.append(self._detail("dietary_restriction", "Conflicts with lactose-free restriction.", "lactose_free", "HIGH"))
        if "gluten_free" in restrictions and self._matches_any(GLUTEN_TERMS, terms):
            details.append(self._detail("dietary_restriction", "Conflicts with gluten-free restriction.", "gluten_free", "HIGH"))
        return details

    def _constraint_conflicts(self, supplements: list[str], terms: set[str], user_profile: dict) -> list[dict]:
        supplement_terms = set()
        for supplement in supplements or []:
            supplement_terms.update(supplement_item_variants(str(supplement)))
            supplement_terms.add(canonical_key(supplement))
        if not supplement_terms:
            return []
        context_terms = terms | set(normalize_many(user_profile.get("maladies", []) + user_profile.get("diseases", [])))
        details = []
        for constraint in self._constraints():
            category_key = canonical_key(constraint.supplement_category_name)
            category_item = f"supp:{constraint.supplement_category.canonical_item}" if constraint.supplement_category_id else ""
            if category_key not in supplement_terms and category_item not in supplement_terms:
                continue
            target = canonical_key(constraint.avoid_or_review_item.replace("context", ""))
            if target and not any(target in term or term in target for term in context_terms):
                continue
            level = constraint.safety_level
            if constraint.constraint_type == SafetyConstraint.ConstraintType.EXCLUSION:
                level = "HIGH"
            elif constraint.constraint_type == SafetyConstraint.ConstraintType.AVOID_TIMING and level == "HIGH":
                level = "MEDIUM"
            details.append(self._detail("safety_constraint", constraint.reason, constraint.avoid_or_review_item, level))
        return details

    def _constraints(self):
        if self._active_constraints is None:
            self._active_constraints = list(
                SafetyConstraint.objects.filter(is_active=True).select_related("supplement_category")
            )
        return self._active_constraints

    def _matches_any(self, blocked_terms, food_terms: set[str]) -> bool:
        return any(self._matches(normalize_token(term), food_terms) for term in blocked_terms)

    def _matches(self, blocked_item: str, food_terms: set[str]) -> bool:
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

    def _highest_level(self, details: list[dict]) -> str:
        order = {"LOW": 1, "MEDIUM": 2, "HIGH": 3}
        return max((detail.get("level", "LOW") for detail in details), key=lambda level: order.get(level, 1), default="LOW")

    def _detail(self, kind: str, message: str, matched: str, level: str) -> dict:
        return {"type": kind, "message": message, "matched": matched, "level": level}
