import pytest

from apps.foods.models import Food, FoodCategory
from apps.recommendations.services.association import AssociationRulesEngine
from apps.recommendations.services.cbf import ContentBasedFilter
from apps.recommendations.services.collaborative import CollaborativeArtifacts, CollaborativeFilter
from apps.recommendations.services.hybrid import HybridRecommender
from apps.recommendations.services.safety_filter import SafetyFilter
from apps.recommendations.services.training import normalize_bmi


pytestmark = pytest.mark.django_db


def test_cbf_excludes_allergy_and_excluded_food():
    cbf = ContentBasedFilter()
    user = {"allergies": ["peanut"], "aliments_exclus": ["spinach"], "goals": ["sante_generale"], "maladies": []}

    peanut = {"id": 1, "nom": "Peanut butter", "slug": "peanut-butter", "category": "spread", "vitamine_c": 0.4}
    spinach = {"id": 2, "nom": "Spinach", "slug": "spinach", "category": "vegetables", "vitamine_c": 0.4}

    assert cbf.score_food(user, peanut) is None
    assert cbf.score_food(user, spinach) is None


def test_anemia_profile_keeps_iron_and_vitamin_c_foods():
    category = FoodCategory.objects.create(name="Legumes", slug="legumes")
    lentils = Food.objects.create(name="lentilles", slug="lentilles", category=category)
    foods = [
        {"id": lentils.id, "nom": "lentilles", "slug": "lentilles", "category": "legumes", "fer": 0.9, "folates": 0.7, "kcal_100g": 116},
    ]
    user = {"maladies": ["anemie"]}

    recommender = HybridRecommender(artifacts={"rules": [], "cf": None})
    payload = recommender.recommend(user, n=5, foods=foods)
    names = [item["food_name"] for item in payload["recommendations"]]

    assert names == ["lentilles"]
    assert payload["strategy"] == "ASSOCIATION_RULES_FILTERED"


def test_hybrid_recommender_scores_active_association_rules():
    fruits = FoodCategory.objects.create(name="Fruits", slug="fruits")
    grains = FoodCategory.objects.create(name="Grains", slug="grains")
    orange = Food.objects.create(name="Orange", slug="orange", category=fruits)
    oats = Food.objects.create(name="Oats", slug="oats", category=grains)
    foods = [
        {"id": orange.id, "nom": "Orange", "slug": "orange", "category": "fruits", "vitamine_c": 0.8, "kcal_100g": 47},
        {"id": oats.id, "nom": "Oats", "slug": "oats", "category": "grains", "fiber": 0.6, "kcal_100g": 389},
    ]
    rules = [
        {
            "id": 10,
            "antecedent": "supplement:fer",
            "consequent": "nutrient:vitamine_c",
            "support": 0.3,
            "confidence": 0.9,
            "lift": 1.8,
            "explanation": "Vitamin C foods may support iron absorption.",
        }
    ]

    payload = HybridRecommender(artifacts={"rules": rules, "cf": None}).recommend({"supplements": ["iron"]}, n=2, foods=foods)

    first = payload["recommendations"][0]
    assert first["food_slug"] == "orange"
    assert first["rules_score"] > 0
    assert first["matched_rules"][0]["id"] == 10


def test_association_rules_are_primary_ranking_signal():
    fruits = FoodCategory.objects.create(name="Fruits", slug="fruits")
    snacks = FoodCategory.objects.create(name="Snacks", slug="snacks")
    generic = Food.objects.create(name="Generic high fit", slug="generic-high-fit", category=fruits)
    rule_backed = Food.objects.create(name="Rule backed food", slug="rule-backed-food", category=snacks)
    foods = [
        {"id": generic.id, "nom": "Generic high fit", "slug": "generic-high-fit", "category": "fruits", "vitamine_c": 1.0, "fer": 1.0, "kcal_100g": 120},
        {"id": rule_backed.id, "nom": "Rule backed food", "slug": "rule-backed-food", "category": "snacks", "kcal_100g": 120},
    ]
    rules = [
        {
            "id": 11,
            "antecedent": "supplement:fer",
            "consequent": "food:rule_backed_food",
            "support": 0.4,
            "confidence": 0.95,
            "lift": 3.0,
            "explanation": "Rule-backed food is strongly associated with iron supplementation.",
        }
    ]

    payload = HybridRecommender(artifacts={"rules": rules, "cf": None}).recommend({"supplements": ["iron"]}, n=2, foods=foods)

    assert payload["weights"]["beta"] > payload["weights"]["alpha"]
    first = payload["recommendations"][0]
    assert first["food_slug"] == "rule-backed-food"
    assert first["matched_rules"][0]["id"] == 11


def test_association_score_returns_zero_when_no_rules_exist():
    score = AssociationRulesEngine([]).score({"supplements": ["iron"]}, {"id": 1, "slug": "spinach"})

    assert score.score == 0
    assert score.matched_rules == []


def test_association_rule_score_uses_confidence_lift_normalization():
    engine = AssociationRulesEngine(
        [
            {"antecedent": "supplement:fer", "consequent": "food:spinach", "confidence": 0.8, "lift": 4.0},
            {"antecedent": "supplement:fer", "consequent": "food:oats", "confidence": 0.8, "lift": 1.0},
        ]
    )

    score = engine.score({"supplements": ["iron"]}, {"id": 1, "slug": "spinach"})
    ignored = engine.score({"supplements": ["iron"]}, {"id": 2, "slug": "oats"})

    assert score.score == 0.8
    assert ignored.score == 0


def test_hybrid_recommender_filters_french_diet_categories():
    dairy = FoodCategory.objects.create(name="lait et produits laitiers", slug="lait-et-produits-laitiers")
    meat = FoodCategory.objects.create(name="viandes, oeufs, poissons", slug="viandes-oeufs-poissons")
    fruit = FoodCategory.objects.create(name="Fruits", slug="fruits")
    Food.objects.create(name="Comte", slug="comte", category=dairy)
    Food.objects.create(name="Boeuf", slug="boeuf", category=meat)
    Food.objects.create(name="Pomme", slug="pomme", category=fruit)

    payload = HybridRecommender(artifacts={"rules": [], "cf": None}).recommend(
        {"diet_type": "vegan", "goals": ["general_health"], "allergies": [], "aliments_exclus": []},
        n=5,
    )
    slugs = [item["food_slug"] for item in payload["recommendations"]]

    assert "pomme" in slugs
    assert "comte" not in slugs
    assert "boeuf" not in slugs


def test_collaborative_filter_uses_real_artifacts_not_random_matrix():
    artifacts = CollaborativeArtifacts(
        user_vectors={1: [1.0, 0.5]},
        food_scores={1: {"spinach": 0.9}},
        feature_order=["supplements:fer", "numeric:imc_norm"],
    )
    cf = CollaborativeFilter(artifacts)

    assert cf.score({"supplements": ["iron"], "imc_norm": 0.5}, {"slug": "spinach"}) > 0


def test_bmi_normalization_uses_thesis_formula():
    assert normalize_bmi(15) == 0
    assert normalize_bmi(40) == 1
    assert normalize_bmi(27.5) == 0.5


def test_hybrid_dynamic_weights_for_user_types():
    recommender = HybridRecommender(artifacts={"rules": [], "cf": None})

    assert recommender._weights_for_user({"n_sessions": 0}) == ({"alpha": 0.25, "beta": 0.60, "gamma": 0.15}, "new_user")
    assert recommender._weights_for_user({"n_sessions": 5}) == ({"alpha": 0.25, "beta": 0.60, "gamma": 0.15}, "active_user")
    assert recommender._weights_for_user({"n_sessions": 5, "allergies": ["peanut"]}) == (
        {"alpha": 0.25, "beta": 0.60, "gamma": 0.15},
        "complex_medical_case",
    )


def test_safety_filter_blocks_before_scoring():
    category = FoodCategory.objects.create(name="Nuts", slug="nuts")
    food = Food.objects.create(name="Peanut Butter", slug="peanut-butter", category=category, allergen_tags=["peanut"])

    decision = SafetyFilter().evaluate(food=food, food_row={"slug": "peanut-butter"}, user_profile={"allergies": ["peanut"]})

    assert decision.safe is False
    assert decision.status == "BLOCKED"
    assert decision.level == "HIGH"
