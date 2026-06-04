from apps.foods.models import Food
from apps.nutrients.models import NutrientInteraction
from apps.rules.models import FoodSupplementSynergyRule, SafetyConstraint


def knowledge_graph_payload(*, supplement=None, nutrient=None, food=None, interaction_type=None, limit: int = 120) -> dict:
    nodes = {}
    edges = []

    def node(node_id, label, node_type):
        nodes[node_id] = {"id": node_id, "label": label, "type": node_type}

    def edge(source, target, relation, label="", level=""):
        edges.append({"source": source, "target": target, "type": relation, "label": label or relation, "level": level})

    interactions = NutrientInteraction.objects.filter(active=True)
    if interaction_type:
        interactions = interactions.filter(interaction_type=interaction_type)
    if nutrient:
        interactions = interactions.filter(source_key__icontains=nutrient) | interactions.filter(target_key__icontains=nutrient)
    for interaction in interactions[:limit]:
        source = f"nutrient:{interaction.source_key}"
        target = f"nutrient:{interaction.target_key}"
        node(source, interaction.source_key.replace("_", " ").title(), "nutrient")
        node(target, interaction.target_key.replace("_", " ").title(), "nutrient")
        edge(source, target, interaction.interaction_type, interaction.mechanism, interaction.severity)

    food_queryset = Food.objects.filter(is_active=True).prefetch_related("nutrients__nutrient")
    if food:
        food_queryset = food_queryset.filter(slug__icontains=food)
    for item in food_queryset[: min(limit, 60)]:
        food_id = f"food:{item.slug}"
        node(food_id, item.name, "food")
        for link in item.nutrients.all()[:8]:
            nutrient_id = f"nutrient:{link.nutrient.slug}"
            node(nutrient_id, link.nutrient.name, "nutrient")
            edge(food_id, nutrient_id, "contains", f"{item.name} contains {link.nutrient.name}")

    synergies = FoodSupplementSynergyRule.objects.filter(is_active=True)
    if supplement:
        synergies = synergies.filter(supplement_item__icontains=supplement)
    for rule in synergies[:limit]:
        supp_id = f"supplement:{rule.supplement_item}"
        food_id = rule.food_item if str(rule.food_item).startswith("food:") else f"food:{rule.food_item}"
        node(supp_id, rule.supplement_category_name or rule.supplement_item, "supplement")
        node(food_id, rule.food, "food")
        edge(supp_id, food_id, "recommended_for", rule.reason)

    constraints = SafetyConstraint.objects.filter(is_active=True)
    if supplement:
        constraints = constraints.filter(supplement_category_name__icontains=supplement)
    for constraint in constraints[:limit]:
        supp_id = f"supplement:{constraint.supplement_category_name}"
        target_id = f"safety:{constraint.avoid_or_review_item}"
        node(supp_id, constraint.supplement_category_name, "supplement")
        node(target_id, constraint.avoid_or_review_item, "safety")
        edge(supp_id, target_id, "safety_warning", constraint.reason, constraint.safety_level)

    return {"nodes": list(nodes.values()), "edges": edges[:limit]}
