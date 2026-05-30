import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

from apps.accounts.models import UserProfile
from apps.feedback.models import RecommendationFeedback
from apps.foods.models import Food, FoodCategory, FoodNutrient
from apps.nutrients.models import Nutrient, NutrientInteraction
from apps.recommendations.models import RecommendationItem, RecommendationRun
from apps.rules.models import MinedAssociationRule, SafetyConstraint, SupplementCategory
from apps.rules.services import detect_rule_safety_conflicts
from apps.supplements.models import Supplement, UserSupplement


pytestmark = pytest.mark.django_db


@pytest.fixture
def extension_data(user):
    category = FoodCategory.objects.create(name="Fruits", slug="fruits")
    vitamin_c = Nutrient.objects.create(name="Vitamin C", slug="vitamin-c", unit="mg")
    iron = Nutrient.objects.create(name="Iron", slug="iron", unit="mg")
    orange = Food.objects.create(name="Orange", slug="orange", category=category, nutrient_tags=["vitamin_c"])
    kiwi = Food.objects.create(name="Kiwi", slug="kiwi", category=category, nutrient_tags=["vitamin_c"])
    FoodNutrient.objects.create(food=orange, nutrient=vitamin_c, amount="53", unit="mg")
    FoodNutrient.objects.create(food=kiwi, nutrient=vitamin_c, amount="90", unit="mg")
    supplement = Supplement.objects.create(name="Iron", slug="iron")
    UserSupplement.objects.create(user=user, supplement=supplement, active=True)
    profile = UserProfile.objects.create(user=user, goal="energy")
    run = RecommendationRun.objects.create(user=user, profile_snapshot={"goals": ["energy"]})
    item = RecommendationItem.objects.create(
        run=run,
        food=orange,
        score=0.85,
        confidence_score=0.8,
        rank=1,
        matched_nutrients=["vitamin-c"],
        matched_rules=[{"antecedent": "supplement:iron", "consequent": "food:orange", "confidence": 0.8, "lift": 2.0}],
        score_breakdown={"content_based_score": 0.8, "association_rule_score": 0.7, "collaborative_score": 0.1},
        explanation="Orange supports iron intake.",
        explanation_details={"summary": "Orange supports iron intake.", "reasons": [], "score_details": {"safety_status": "SAFE"}},
    )
    RecommendationFeedback.objects.create(user=user, recommendation_item=item, food=orange, feedback_type="saved", rating=5)
    NutrientInteraction.objects.create(
        source_type="nutrient",
        source_key="vitamin_c",
        target_type="nutrient",
        target_key="iron",
        interaction_type="enhances",
        mechanism="Vitamin C may support non-heme iron absorption.",
        evidence_level="high",
    )
    return {"orange": orange, "kiwi": kiwi, "supplement": supplement, "item": item, "profile": profile}


@pytest.fixture
def admin_user(db):
    return get_user_model().objects.create_superuser(
        email="extension-admin@example.com",
        password="StrongPassword123",
        name="Extension Admin",
    )


def test_timing_plan_endpoint(authenticated_client, extension_data):
    response = authenticated_client.get(reverse("recommendation-timing-plan"))

    assert response.status_code == 200
    assert response.json()["items"][0]["supplement"]["slug"] == "iron"
    assert "coffee" in response.json()["items"][0]["avoid_near_intake"]


def test_meal_plan_endpoint(authenticated_client, extension_data):
    response = authenticated_client.get(reverse("recommendation-meal-plan"))

    assert response.status_code == 200
    assert {"breakfast", "lunch", "dinner", "snack"} <= set(response.json()["meals"])


def test_explain_endpoint_includes_alternatives(authenticated_client, extension_data):
    response = authenticated_client.get(reverse("recommendation-explain", kwargs={"item_id": extension_data["item"].id}))

    assert response.status_code == 200
    assert "alternatives" in response.json()


def test_admin_evaluation_endpoint(api_client, admin_user, extension_data):
    api_client.force_authenticate(user=admin_user)

    response = api_client.get(reverse("admin-evaluation"))

    assert response.status_code == 200
    assert "precision_at_k" in response.json()
    assert "recommendation_acceptance_rate" in response.json()


def test_admin_knowledge_graph_endpoint(api_client, admin_user, extension_data):
    api_client.force_authenticate(user=admin_user)

    response = api_client.get(reverse("admin-knowledge-graph"), {"nutrient": "iron"})

    assert response.status_code == 200
    assert response.json()["nodes"]
    assert response.json()["edges"]


def test_safety_conflict_detection_marks_positive_rule_conflict():
    category = SupplementCategory.objects.create(category="Iron", canonical_item="iron")
    SafetyConstraint.objects.create(
        supplement_category=category,
        supplement_category_name="Iron",
        avoid_or_review_item="calcium",
        constraint_type="avoid_timing",
        safety_level="MEDIUM",
        reason="Separate calcium from iron timing.",
    )

    status, details = detect_rule_safety_conflicts(["supp:iron"], ["nutrient:calcium"])

    assert status == "conflict_warning"
    assert details[0]["safety_level"] == "MEDIUM"


def test_mined_rule_review_fields_exist():
    rule = MinedAssociationRule.objects.create(
        rule_key="abc",
        antecedent_items=["supp:iron"],
        consequent_items=["food:orange"],
        review_status="approved",
        admin_note="Looks useful.",
    )

    assert rule.review_status == "approved"
    assert rule.admin_note == "Looks useful."
