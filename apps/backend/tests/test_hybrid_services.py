import pytest

from apps.recommendations.services.association import AssociationRulesEngine
from apps.recommendations.services.cbf import ContentBasedFilter
from apps.recommendations.services.collaborative import CollaborativeArtifacts, CollaborativeFilter
from apps.recommendations.services.hybrid import HybridRecommender


pytestmark = pytest.mark.django_db


def test_cbf_excludes_allergy_and_excluded_food():
    cbf = ContentBasedFilter()
    user = {"allergies": ["peanut"], "aliments_exclus": ["spinach"], "goals": ["sante_generale"], "maladies": []}

    peanut = {"id": 1, "nom": "Peanut butter", "slug": "peanut-butter", "category": "spread", "vitamine_c": 0.4}
    spinach = {"id": 2, "nom": "Spinach", "slug": "spinach", "category": "vegetables", "vitamine_c": 0.4}

    assert cbf.score_food(user, peanut) is None
    assert cbf.score_food(user, spinach) is None


def test_anemia_profile_keeps_iron_and_vitamin_c_foods():
    foods = [
        {"id": 1, "nom": "lentilles", "slug": "lentilles", "category": "legumes", "fer": 0.9, "folates": 0.7, "kcal_100g": 116},
    ]
    user = {"maladies": ["anemie"]}

    recommender = HybridRecommender(artifacts={"rules": [], "cf": None})
    payload = recommender.recommend(user, n=5, foods=foods)
    names = [item["food_name"] for item in payload["recommendations"]]

    assert names == ["lentilles"]
    assert payload["strategy"] == "ASSOCIATION_RULES"


def test_hybrid_recommender_scores_active_association_rules():
    foods = [
        {"id": 1, "nom": "Orange", "slug": "orange", "category": "fruits", "vitamine_c": 0.8, "kcal_100g": 47},
        {"id": 2, "nom": "Oats", "slug": "oats", "category": "grains", "fiber": 0.6, "kcal_100g": 389},
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
    foods = [
        {"id": 1, "nom": "Generic high fit", "slug": "generic-high-fit", "category": "fruits", "vitamine_c": 1.0, "fer": 1.0, "kcal_100g": 120},
        {"id": 2, "nom": "Rule backed food", "slug": "rule-backed-food", "category": "snacks", "kcal_100g": 120},
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

    assert payload["weights"]["association_rules"] > payload["weights"]["content_based"]
    first = payload["recommendations"][0]
    assert first["food_slug"] == "rule-backed-food"
    assert first["matched_rules"][0]["id"] == 11


def test_association_score_returns_zero_when_no_rules_exist():
    score = AssociationRulesEngine([]).score({"supplements": ["iron"]}, {"id": 1, "slug": "spinach"})

    assert score.score == 0
    assert score.matched_rules == []


def test_collaborative_filter_uses_real_artifacts_not_random_matrix():
    artifacts = CollaborativeArtifacts(
        user_vectors={1: [1.0, 0.5]},
        food_scores={1: {"spinach": 0.9}},
        feature_order=["supplements:fer", "numeric:imc_norm"],
    )
    cf = CollaborativeFilter(artifacts)

    assert cf.score({"supplements": ["iron"], "imc_norm": 0.5}, {"slug": "spinach"}) > 0
