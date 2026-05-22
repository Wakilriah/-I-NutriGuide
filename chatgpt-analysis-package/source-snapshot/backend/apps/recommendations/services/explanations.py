def label_from_slug(slug: str) -> str:
    return slug.replace("-", " ").title()


def build_explanation(food, supplement, matched_rules, matched_nutrients):
    if matched_rules:
        return f"{food.name} is recommended because {matched_rules[0]['explanation']}"

    if supplement and matched_nutrients:
        nutrients = ", ".join(label_from_slug(slug) for slug in matched_nutrients)
        return (
            f"{food.name} is recommended because it provides {nutrients}, which may help complement "
            f"{supplement.name} intake as part of a balanced diet."
        )

    if matched_nutrients:
        nutrients = ", ".join(label_from_slug(slug) for slug in matched_nutrients)
        return f"{food.name} is recommended because it provides {nutrients}, which can support overall meal quality."

    return f"{food.name} is recommended as a nutrient-dense food that can support a balanced eating pattern."

