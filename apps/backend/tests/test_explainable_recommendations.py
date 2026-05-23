import pytest
from django.urls import reverse

from apps.accounts.models import Allergy, UserProfile
from apps.feedback.models import RecommendationFeedback
from apps.foods.models import Food, FoodCategory, FoodNutrient
from apps.nutrients.models import Nutrient, NutrientInteraction
from apps.recommendations.models import RecommendationItem, RecommendationRun
from apps.recommendations.services.confidence import calculate_confidence
from apps.recommendations.services.explanation_engine import ExplanationEngine
from apps.recommendations.services.feedback_learning import feedback_score_for_food
from apps.recommendations.services.warnings_engine import WarningsEngine


pytestmark = pytest.mark.django_db


@pytest.fixture
def explainable_food_data(user):
    vegetables = FoodCategory.objects.create(name="Vegetables", slug="vegetables")
    vitamin_c = Nutrient.objects.create(name="Vitamin C", slug="vitamin-c", unit="mg")
    iron = Nutrient.objects.create(name="Iron", slug="iron", unit="mg")
    calcium = Nutrient.objects.create(name="Calcium", slug="calcium", unit="mg")
    spinach = Food.objects.create(name="Spinach", slug="spinach", category=vegetables)
    yogurt = Food.objects.create(name="Yogurt", slug="yogurt", category=vegetables)
    FoodNutrient.objects.create(food=spinach, nutrient=iron, amount="2.7", unit="mg")
    FoodNutrient.objects.create(food=spinach, nutrient=vitamin_c, amount="28", unit="mg")
    FoodNutrient.objects.create(food=yogurt, nutrient=calcium, amount="120", unit="mg")
    NutrientInteraction.objects.create(
        source_type="nutrient",
        source_key="vitamin_c",
        target_type="nutrient",
        target_key="iron",
        interaction_type="enhances",
        mechanism="Vitamin C may improve non-heme iron absorption.",
        evidence_level="high",
        severity="info",
    )
    NutrientInteraction.objects.create(
        source_type="nutrient",
        source_key="calcium",
        target_type="nutrient",
        target_key="iron",
        interaction_type="inhibits",
        mechanism="Calcium may reduce iron absorption. Consider taking them at different times.",
        evidence_level="medium",
        severity="caution",
    )
    return {"spinach": spinach, "yogurt": yogurt}


def test_nutrient_interaction_model_and_graph_endpoint(authenticated_client, explainable_food_data):
    response = authenticated_client.get(reverse("nutrition-interaction-graph"))

    assert response.status_code == 200
    body = response.json()
    assert {"id": "vitamin_c", "label": "Vitamin C", "type": "nutrient"} in body["nodes"]
    assert any(edge["source"] == "vitamin_c" and edge["target"] == "iron" for edge in body["edges"])


def test_explanation_engine_uses_educational_language(user, explainable_food_data):
    explanation = ExplanationEngine().explain(
        user_profile={"goals": ["energy"]},
        supplements=["vitamin_c"],
        food=explainable_food_data["spinach"],
        food_nutrients=["iron"],
        matched_rules=[{"explanation": "This pairing guarantees absorption.", "confidence": 0.9}],
        score_breakdown={"profile_match_score": 0.78, "safety_score": 1.0},
        warnings=[],
    )

    joined = " ".join([explanation["summary"], *[reason["message"] for reason in explanation["reasons"]]])
    assert "guarantees" not in joined.lower()
    assert "may" in joined.lower() or "commonly associated" in joined.lower()
    assert explanation["reasons"][0]["type"] == "nutrient_synergy"


def test_warnings_engine_blocks_allergies_and_flags_inhibitors(user, explainable_food_data):
    profile = UserProfile.objects.create(user=user)
    allergy = Allergy.objects.create(name="Spinach", slug="spinach")
    profile.allergies.add(allergy)

    blocked = WarningsEngine().evaluate(
        user_profile={"allergies": ["spinach"]},
        supplements=[],
        food=explainable_food_data["spinach"],
        food_nutrients=["iron"],
    )
    caution = WarningsEngine().evaluate(
        user_profile={"allergies": []},
        supplements=["calcium"],
        food=explainable_food_data["spinach"],
        food_nutrients=["iron"],
    )
    safe_allergy = WarningsEngine().evaluate(
        user_profile={"allergies": ["gluten"]},
        supplements=[],
        food=explainable_food_data["spinach"],
        food_nutrients=["iron"],
    )

    assert blocked.blocked is True
    assert blocked.safety_score == 0
    assert blocked.warnings[0]["type"] == "allergy_conflict"
    assert caution.blocked is False
    assert caution.warnings[0]["type"] == "absorption_conflict"
    assert safe_allergy.blocked is False


def test_confidence_score_uses_safety_as_strong_multiplier():
    high, label = calculate_confidence(
        {
            "content_based_score": 1,
            "association_rule_score": 1,
            "collaborative_score": 1,
            "nutrient_synergy_score": 1,
            "feedback_score": 1,
            "profile_match_score": 1,
            "safety_score": 1,
        }
    )
    low, _ = calculate_confidence(
        {
            "content_based_score": 1,
            "association_rule_score": 1,
            "collaborative_score": 1,
            "nutrient_synergy_score": 1,
            "feedback_score": 1,
            "profile_match_score": 1,
            "safety_score": 0.35,
        }
    )

    assert high == 1
    assert label == "High"
    assert low < high


def test_feedback_endpoint_and_feedback_learning(authenticated_client, user, explainable_food_data):
    run = RecommendationRun.objects.create(user=user)
    item = RecommendationItem.objects.create(
        run=run,
        food=explainable_food_data["spinach"],
        score=0.8,
        rank=1,
        explanation="Spinach may support iron intake.",
    )

    response = authenticated_client.post(
        reverse("recommendation-feedback"),
        {
            "recommendation_id": item.id,
            "food_id": explainable_food_data["spinach"].id,
            "feedback_type": "unsafe_for_me",
            "rating": 1,
            "comment": "This felt unsafe for me.",
        },
        format="json",
    )
    score, blocked = feedback_score_for_food(user, explainable_food_data["spinach"])

    assert response.status_code == 201
    assert RecommendationFeedback.objects.filter(user=user, feedback_type="unsafe_for_me").exists()
    assert score == 0.0
    assert blocked is True


def test_recommendation_response_contains_explainable_shape(authenticated_client, user, explainable_food_data, monkeypatch):
    UserProfile.objects.create(user=user, goal="energy")

    def fake_recommend(self, user_profile, n=10, foods=None):
        return {
            "user_id": user.id,
            "strategy": "GRAPH_TRAVERSAL",
            "weights": {},
            "disclaimer": "Recommendations are nutritional suggestions",
            "recommendations": [
                {
                    "food_id": explainable_food_data["spinach"].id,
                    "food_name": "Spinach",
                    "food_slug": "spinach",
                    "category": "Vegetables",
                    "final_score": 0.8,
                    "cbf_score": 0.8,
                    "rules_score": 0.7,
                    "cf_score": 0.5,
                    "reason": "Iron-friendly leafy green.",
                    "safety_notes": [],
                    "matched_nutrients": ["iron"],
                    "matched_rules": [],
                    "related_supplement": None,
                }
            ],
        }

    monkeypatch.setattr("apps.recommendations.services.hybrid.HybridRecommender.recommend", fake_recommend)
    response = authenticated_client.post(reverse("recommendation-generate"), {"limit": 1}, format="json")

    assert response.status_code == 201
    item = response.json()["items"][0]
    assert 0 <= item["confidence_score"] <= 1
    assert item["confidence_label"] in {"Low", "Medium", "High"}
    assert {"content_based_score", "nutrient_synergy_score", "safety_score", "feedback_score"} <= set(item["score_breakdown"])
    assert "summary" in item["explanation"]
    assert isinstance(item["warnings"], list)
    assert "available_actions" in item["feedback"]
