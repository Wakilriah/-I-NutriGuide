from apps.foods.models import Food
from apps.rules.services import canonical_key


DEFAULT_FOOD_IMAGE_PATH = "/media/foods/default.webp"


def recommendation_food_payload(food: Food, nutrients: list[str] | None = None) -> dict:
    return {
        "id": food.id,
        "name": food.name,
        "food_name": food.name,
        "slug": food.slug,
        "category": food.category.name if food.category_id else "",
        "image_path": food.image_path or DEFAULT_FOOD_IMAGE_PATH,
        "image_alt": food.image_alt,
        "nutrient_tags": list(food.nutrient_tags or []),
        "synergy_reason": food.synergy_reason,
        "avoid_or_caution": food.avoid_or_caution,
        "nutrients": nutrients or [],
    }


def attach_food_metadata_to_rules(matched_rules: list) -> list:
    if not matched_rules:
        return []

    food_slugs = sorted(
        {
            consequent.split(":", 1)[1]
            for rule in matched_rules
            if isinstance(rule, dict)
            for consequent in _rule_consequents(rule)
            if consequent.startswith("food:")
        }
    )
    lookup_slugs = {slug for slug in food_slugs}
    lookup_slugs.update(slug.replace("_", "-") for slug in food_slugs)
    foods_by_slug = {}
    if lookup_slugs:
        for food in Food.objects.filter(slug__in=lookup_slugs):
            foods_by_slug[food.slug] = food
            foods_by_slug[canonical_key(food.slug)] = food

    annotated = []
    for rule in matched_rules:
        if not isinstance(rule, dict):
            annotated.append(rule)
            continue
        next_rule = dict(rule)
        consequent = next((item for item in _rule_consequents(next_rule) if item.startswith("food:")), "")
        if consequent:
            food_key = consequent.split(":", 1)[1]
            food = foods_by_slug.get(food_key) or foods_by_slug.get(food_key.replace("_", "-"))
            if food:
                next_rule.update(
                    {
                        "food_slug": food.slug,
                        "image_path": food.image_path or DEFAULT_FOOD_IMAGE_PATH,
                        "image_alt": food.image_alt,
                    }
                )
        annotated.append(next_rule)
    return annotated


def _rule_consequents(rule: dict) -> list[str]:
    values = []
    if isinstance(rule.get("consequent"), str):
        values.append(rule["consequent"])
    for key in ("consequents", "consequent_items"):
        if isinstance(rule.get(key), list):
            values.extend(item for item in rule[key] if isinstance(item, str))
    return values
