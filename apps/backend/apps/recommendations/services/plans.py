from collections import defaultdict

from apps.supplements.models import UserSupplement

from .engine import get_food_recommendations_payload


TIMING_GUIDANCE = {
    "iron": {
        "best_time": "morning",
        "avoid": ["coffee", "tea", "calcium", "dairy"],
        "explanation": "Iron is usually better paired with vitamin C foods and separated from calcium, coffee, and tea.",
    },
    "fer": {
        "best_time": "morning",
        "avoid": ["coffee", "tea", "calcium", "dairy"],
        "explanation": "Iron is usually better paired with vitamin C foods and separated from calcium, coffee, and tea.",
    },
    "vitamin-d": {
        "best_time": "lunch",
        "avoid": [],
        "explanation": "Vitamin D is fat soluble, so it fits well with meals containing healthy fats.",
    },
    "vitamine-d": {
        "best_time": "lunch",
        "avoid": [],
        "explanation": "Vitamin D is fat soluble, so it fits well with meals containing healthy fats.",
    },
    "magnesium": {
        "best_time": "evening",
        "avoid": [],
        "explanation": "Magnesium is often scheduled later in the day and pairs with whole grains, nuts, and fruit when safe.",
    },
    "zinc": {
        "best_time": "lunch",
        "avoid": ["high-calcium meal"],
        "explanation": "Zinc fits best with a meal and may be separated from high-calcium contexts when absorption matters.",
    },
    "omega-3": {
        "best_time": "lunch",
        "avoid": [],
        "explanation": "Omega 3 works well with a regular meal containing healthy fats.",
    },
}

MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"]


def build_timing_plan(user, limit: int = 12) -> dict:
    recommendations = get_food_recommendations_payload(user, limit=limit).get("recommendations", [])
    by_supplement = defaultdict(list)
    for item in recommendations:
        key = item.get("related_supplement") or item.get("matched_supplement") or "general"
        by_supplement[str(key)].append(item)

    plan = []
    for user_supplement in UserSupplement.objects.filter(user=user, active=True).select_related("supplement"):
        supplement = user_supplement.supplement
        guidance = _guidance_for(supplement.slug)
        foods = by_supplement.get(supplement.slug) or recommendations[:3]
        warnings = [
            {
                "level": "MEDIUM",
                "message": f"Avoid {avoid} near {supplement.name} intake when absorption matters.",
            }
            for avoid in guidance["avoid"]
        ]
        plan.append(
            {
                "supplement": {"id": supplement.id, "name": supplement.name, "slug": supplement.slug},
                "best_time": guidance["best_time"],
                "recommended_foods": foods[:3],
                "avoid_near_intake": guidance["avoid"],
                "explanation": guidance["explanation"],
                "warnings": warnings,
            }
        )
    return {"items": plan}


def build_meal_plan(user, limit: int = 12) -> dict:
    recommendations = get_food_recommendations_payload(user, limit=limit).get("recommendations", [])
    meals = {}
    for index, slot in enumerate(MEAL_SLOTS):
        food = recommendations[index % len(recommendations)] if recommendations else None
        meals[slot] = _meal_payload(slot, food)
    return {"meals": meals, "warnings": _collect_warnings(recommendations)}


def _guidance_for(slug: str) -> dict:
    normalized = slug.replace("_", "-")
    return TIMING_GUIDANCE.get(normalized, {"best_time": "with_meal", "avoid": [], "explanation": "Take with a balanced meal unless your clinician advised otherwise."})


def _meal_payload(slot: str, food: dict | None) -> dict:
    if not food:
        return {
            "slot": slot,
            "foods": [],
            "supplement_connection": "No scored recommendation was available yet.",
            "explanation": "Complete your profile and supplement list to personalize this meal.",
            "warnings": [],
        }
    return {
        "slot": slot,
        "foods": [food],
        "supplement_connection": food.get("related_supplement") or food.get("matched_supplement") or "general nutrition",
        "explanation": food.get("reason") or "This food fits your supplement-aware recommendation profile.",
        "warnings": food.get("warnings") or food.get("safety_notes") or [],
    }


def _collect_warnings(recommendations: list[dict]) -> list[dict]:
    warnings = []
    for item in recommendations:
        warnings.extend(item.get("warnings") or item.get("safety_notes") or [])
    return warnings[:5]
