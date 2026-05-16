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
        {"id": 2, "nom": "spinach", "slug": "spinach", "category": "vegetables", "fer": 0.7, "vitamine_c": 0.5, "kcal_100g": 23},
        {"id": 3, "nom": "broccoli", "slug": "broccoli", "category": "vegetables", "vitamine_c": 0.9, "kcal_100g": 35},
        {"id": 4, "nom": "white rice", "slug": "white-rice", "category": "grains", "kcal_100g": 130},
    ]
    user = {"supplements": ["vitamin_c", "iron"], "goals": ["energy"], "maladies": ["anemia"], "n_sessions": 1}

    payload = HybridRecommender(artifacts={"rules": [], "cf": None}).recommend(user, n=5, foods=foods)
    names = [item["food_name"] for item in payload["recommendations"]]

    assert "lentilles" in names
    assert "spinach" in names
    assert "broccoli" in names
    assert "white rice" not in names


def test_strategy_weights_for_cold_start_medical_and_active_users():
    recommender = HybridRecommender(artifacts={"rules": [], "cf": None})

    assert recommender.strategy_for({"n_sessions": 0}) == "COLD_START"
    assert recommender.strategy_for({"n_sessions": 1, "maladies": ["anemie"]}) == "MEDICAL_PROFILE"
    assert recommender.strategy_for({"n_sessions": 5}) == "ACTIVE_USER"
    assert recommender.strategy_for({"n_sessions": 2}) == "INTERMEDIATE"


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
