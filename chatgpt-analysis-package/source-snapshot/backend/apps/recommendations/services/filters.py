MEAT_CATEGORIES = {"meat"}
FISH_CATEGORIES = {"fish"}
DAIRY_CATEGORIES = {"dairy"}

MEAT_TERMS = {"meat", "viande", "charcuterie", "abats"}
FISH_TERMS = {"fish", "poisson", "crustace", "mollusque"}
DAIRY_TERMS = {"dairy", "lait", "fromage", "yaourt", "yogourt", "creme"}
EGG_TERMS = {"egg", "oeuf", "œuf"}


def get_blocked_food_slugs(profile):
    allergy_slugs = set(profile.allergies.values_list("slug", flat=True))
    restriction_slugs = set(profile.dietary_restrictions.values_list("slug", flat=True))
    disliked_slugs = set(profile.user.disliked_foods.values_list("slug", flat=True))
    return allergy_slugs, restriction_slugs, disliked_slugs


def is_food_blocked(food, profile) -> bool:
    allergy_slugs, restriction_slugs, disliked_slugs = get_blocked_food_slugs(profile)
    food_slug = food.slug
    category_slug = food.category.slug
    category_text = f"{category_slug} {food.category.name}".lower()

    if food_slug in disliked_slugs:
        return True
    if food_slug in allergy_slugs or category_slug in allergy_slugs:
        return True
    if any(allergy in food_slug for allergy in allergy_slugs):
        return True

    diet_type = profile.diet_type
    restrictions = restriction_slugs | ({diet_type} if diet_type and diet_type != "none" else set())
    is_meat = category_slug in MEAT_CATEGORIES or _contains_any(category_text, MEAT_TERMS)
    is_fish = category_slug in FISH_CATEGORIES or _contains_any(category_text, FISH_TERMS)
    is_dairy = category_slug in DAIRY_CATEGORIES or _contains_any(category_text, DAIRY_TERMS)
    is_egg = _contains_any(category_text, EGG_TERMS)
    if "vegan" in restrictions and (is_meat or is_fish or is_dairy or is_egg):
        return True
    if "vegetarian" in restrictions and (is_meat or is_fish):
        return True
    if "lactose_free" in restrictions and is_dairy:
        return True
    return False


def _contains_any(value, terms):
    return any(term in value for term in terms)
