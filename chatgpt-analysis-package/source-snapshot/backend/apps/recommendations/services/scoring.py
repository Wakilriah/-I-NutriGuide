COMPLEMENTARY_NUTRIENTS = {
    "iron": {"vitamin-c", "fiber"},
    "vitamin-c": {"iron", "fiber"},
    "vitamin-d": {"calcium", "healthy-fat"},
    "calcium": {"vitamin-d", "magnesium"},
    "magnesium": {"magnesium", "fiber", "healthy-fat"},
    "zinc": {"zinc", "protein"},
    "omega-3": {"fiber", "protein"},
    "vitamin-b12": {"vitamin-b12", "protein", "iron"},
    "multivitamin": {"fiber", "protein", "healthy-fat"},
    "folate": {"vitamin-c", "iron"},
}


def clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def calculate_nutrient_score(food, user_supplements):
    food_nutrients = {item.nutrient.slug for item in food.nutrients.all()}
    target_nutrients = set()
    matched_supplement = None

    for user_supplement in user_supplements:
        supplement = user_supplement.supplement
        supplement_targets = set(COMPLEMENTARY_NUTRIENTS.get(supplement.slug, set()))
        for supplement_nutrient in supplement.nutrients.all():
            supplement_targets.update(COMPLEMENTARY_NUTRIENTS.get(supplement_nutrient.nutrient.slug, set()))
        if food_nutrients & supplement_targets and matched_supplement is None:
            matched_supplement = supplement
        target_nutrients.update(supplement_targets)

    if not target_nutrients:
        return 0.0, [], matched_supplement

    matched = sorted(food_nutrients & target_nutrients)
    score = clamp(len(matched) / min(len(target_nutrients), 3))
    return score, matched, matched_supplement


def calculate_rule_score(food, user_supplements, rules):
    food_nutrients = {item.nutrient.slug for item in food.nutrients.all()}
    supplement_slugs = {user_supplement.supplement.slug for user_supplement in user_supplements}
    supplement_nutrients = {
        item.nutrient.slug
        for user_supplement in user_supplements
        for item in user_supplement.supplement.nutrients.all()
    }
    matched_rules = []
    best_score = 0.0

    for rule in rules:
        antecedent_matches = (
            rule.antecedent_type == "supplement"
            and rule.antecedent_slug in supplement_slugs
            or rule.antecedent_type == "nutrient"
            and rule.antecedent_slug in supplement_nutrients
        )
        consequent_matches = (
            rule.consequent_type == "food"
            and rule.consequent_slug == food.slug
            or rule.consequent_type == "nutrient"
            and rule.consequent_slug in food_nutrients
            or rule.consequent_type == "category"
            and rule.consequent_slug == food.category.slug
        )
        if not antecedent_matches or not consequent_matches:
            continue

        normalized_lift = clamp(rule.lift / 2)
        score = clamp((0.4 * rule.confidence) + (0.4 * normalized_lift) + (0.2 * rule.support))
        best_score = max(best_score, score)
        matched_rules.append(
            {
                "id": rule.id,
                "antecedent": f"{rule.antecedent_type}:{rule.antecedent_slug}",
                "consequent": f"{rule.consequent_type}:{rule.consequent_slug}",
                "explanation": rule.explanation,
            }
        )

    return best_score, matched_rules


def calculate_preference_score(food, profile):
    if profile.goal and profile.goal in {"general_health", "digestive_health"} and food.category.slug in {"fruits", "vegetables", "legumes", "grains"}:
        return 1.0
    if profile.diet_type in {"vegan", "vegetarian"} and food.category.slug in {"fruits", "vegetables", "legumes", "grains", "nuts-and-seeds"}:
        return 1.0
    return 0.8


def calculate_final_score(nutrient_score, rule_score, preference_score):
    return clamp((0.45 * nutrient_score) + (0.35 * rule_score) + (0.20 * preference_score))
