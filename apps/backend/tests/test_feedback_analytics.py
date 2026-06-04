import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.foods.models import Food, FoodCategory, FoodNutrient
from apps.nutrients.models import Nutrient, NutrientInteraction
from apps.feedback.models import RecommendationFeedback
from apps.recommendations.models import RecommendationItem, SavedRecommendationItem
from apps.rules.models import AssociationRule
from apps.supplements.models import Supplement, SupplementNutrient, UserSupplement


pytestmark = pytest.mark.django_db


@pytest.fixture
def admin_api_client():
    admin = get_user_model().objects.create_superuser(
        email="analytics-admin@example.com",
        password="StrongPassword123",
        name="Analytics Admin",
    )
    api_client = APIClient()
    api_client.force_authenticate(user=admin)
    return api_client


@pytest.fixture
def feedback_recommendation_data(user):
    fruits = FoodCategory.objects.create(name="Fruits", slug="fruits")
    vitamin_c = Nutrient.objects.create(name="Vitamin C", slug="vitamin-c", unit="mg")
    iron = Nutrient.objects.create(name="Iron", slug="iron", unit="mg")
    orange = Food.objects.create(name="Orange", slug="orange", category=fruits)
    FoodNutrient.objects.create(food=orange, nutrient=vitamin_c, amount="53.200", unit="mg")
    iron_supplement = Supplement.objects.create(name="Iron", slug="iron", common_dose="18 mg")
    SupplementNutrient.objects.create(supplement=iron_supplement, nutrient=iron, amount="18.000", unit="mg")
    UserSupplement.objects.create(user=user, supplement=iron_supplement, dose="18 mg", frequency="daily")


@pytest.fixture
def recommendation_item(authenticated_client, feedback_recommendation_data):
    response = authenticated_client.post(reverse("recommendation-generate"), {"limit": 1}, format="json")
    return response.json()["items"][0]


def test_user_can_submit_feedback_for_own_recommendation(authenticated_client, recommendation_item):
    response = authenticated_client.post(
        reverse("feedback-list"),
        {
            "recommendation_item_id": recommendation_item["id"],
            "rating": 5,
            "is_helpful": True,
            "comment": "Useful recommendation.",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.json()["rating"] == 5
    assert RecommendationFeedback.objects.count() == 1


def test_user_can_update_existing_feedback_for_recommendation(authenticated_client, recommendation_item):
    authenticated_client.post(
        reverse("feedback-list"),
        {
            "recommendation_item_id": recommendation_item["id"],
            "rating": 5,
            "is_helpful": True,
            "comment": "Useful recommendation.",
        },
        format="json",
    )

    response = authenticated_client.post(
        reverse("feedback-list"),
        {
            "recommendation_item_id": recommendation_item["id"],
            "rating": 2,
            "is_helpful": False,
            "comment": "Changed my mind.",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.json()["rating"] == 2
    assert response.json()["is_helpful"] is False
    assert RecommendationFeedback.objects.count() == 1


def test_user_cannot_feedback_another_users_recommendation(api_client, other_user, recommendation_item):
    api_client.force_authenticate(user=other_user)

    response = api_client.post(
        reverse("feedback-list"),
        {"recommendation_item_id": recommendation_item["id"], "rating": 4},
        format="json",
    )

    assert response.status_code == 400
    assert RecommendationFeedback.objects.count() == 0


def test_user_cannot_feedback_another_users_recommendation_with_alias(api_client, other_user, recommendation_item):
    api_client.force_authenticate(user=other_user)

    response = api_client.post(
        reverse("feedback-list"),
        {"recommendation_id": recommendation_item["id"], "rating": 4},
        format="json",
    )

    assert response.status_code == 400
    assert RecommendationFeedback.objects.count() == 0


def test_feedback_list_is_admin_only(authenticated_client, admin_api_client, recommendation_item):
    authenticated_client.post(
        reverse("feedback-list"),
        {"recommendation_item_id": recommendation_item["id"], "rating": 5},
        format="json",
    )

    user_response = authenticated_client.get(reverse("feedback-list"))
    admin_response = admin_api_client.get(reverse("feedback-list"))

    assert user_response.status_code == 403
    assert admin_response.status_code == 200
    assert len(admin_response.json()) == 1


def test_admin_dashboard_and_analytics(admin_api_client, authenticated_client, recommendation_item):
    item = RecommendationItem.objects.get(id=recommendation_item["id"])
    SavedRecommendationItem.objects.create(user=item.run.user, recommendation_item=item)
    authenticated_client.post(
        reverse("feedback-list"),
        {"recommendation_item_id": recommendation_item["id"], "rating": 5, "is_helpful": True},
        format="json",
    )

    dashboard = admin_api_client.get(reverse("admin-dashboard"))
    recommendation_analytics = admin_api_client.get(reverse("admin-recommendation-analytics"))
    feedback_analytics = admin_api_client.get(reverse("admin-feedback-analytics"))

    assert dashboard.status_code == 200
    assert dashboard.json()["total_recommendations"] == 1
    assert dashboard.json()["total_recommendation_items"] == 1
    assert dashboard.json()["total_feedback"] == 1
    assert dashboard.json()["helpful_feedback"] == 1
    assert dashboard.json()["active_users"] >= 1
    assert dashboard.json()["active_foods"] == 1
    assert dashboard.json()["total_nutrients"] == 2
    assert dashboard.json()["total_saved_foods"] == 1
    assert dashboard.json()["most_saved_foods"][0]["recommendation_item__food__name"] == "Orange"
    assert recommendation_analytics.status_code == 200
    assert recommendation_analytics.json()["total_items"] == 1
    assert feedback_analytics.status_code == 200
    assert feedback_analytics.json()["average_rating"] == 5


def test_data_quality_is_admin_only(admin_api_client, authenticated_client):
    user_response = authenticated_client.get(reverse("admin-data-quality"))
    admin_response = admin_api_client.get(reverse("admin-data-quality"))

    assert user_response.status_code == 403
    assert admin_response.status_code == 200


def test_admin_data_quality_reports_import_issues(admin_api_client):
    category = FoodCategory.objects.create(name="Vegetables", slug="vegetables")
    Food.objects.create(name="Nutrientless Kale", slug="nutrientless-kale", category=category)
    Food.objects.create(name="Hidden Pear", slug="hidden-pear", category=category, is_active=False)
    vitamin_c = Nutrient.objects.create(name="Vitamin C", slug="vitamin-c", unit="mg")
    food_with_bad_amount = Food.objects.create(name="Zero Orange", slug="zero-orange", category=category)
    FoodNutrient.objects.create(food=food_with_bad_amount, nutrient=vitamin_c, amount=0, unit="mg")
    Supplement.objects.create(name="Nutrientless Supplement", slug="nutrientless-supplement")
    Supplement.objects.create(name="Inactive Supplement", slug="inactive-supplement", is_active=False)
    supplement = Supplement.objects.create(name="Incomplete Supplement", slug="incomplete-supplement")
    SupplementNutrient.objects.create(supplement=supplement, nutrient=vitamin_c, amount=None, unit="")
    AssociationRule.objects.create(
        antecedent_type=AssociationRule.EntityType.SUPPLEMENT,
        antecedent_slug="missing-supplement",
        consequent_type=AssociationRule.EntityType.FOOD,
        consequent_slug="nutrientless-kale",
        support=0.1,
        confidence=0.2,
        lift=1.1,
        explanation="Missing antecedent should be reported.",
    )
    AssociationRule.objects.create(
        antecedent_type=AssociationRule.EntityType.NUTRIENT,
        antecedent_slug="vitamin-c",
        consequent_type=AssociationRule.EntityType.FOOD,
        consequent_slug="hidden-pear",
        support=0.1,
        confidence=0.2,
        lift=1.1,
        explanation="Inactive rule should be reported.",
        is_active=False,
    )
    NutrientInteraction.objects.create(
        source_type=NutrientInteraction.EntityType.NUTRIENT,
        source_key="vitamin-c",
        target_type=NutrientInteraction.EntityType.FOOD,
        target_key="nutrientless-kale",
        interaction_type=NutrientInteraction.InteractionType.SUPPORTS,
        mechanism="",
        evidence_level=NutrientInteraction.EvidenceLevel.MEDIUM,
    )

    response = admin_api_client.get(reverse("admin-data-quality"))

    assert response.status_code == 200
    issues = {issue["key"]: issue for issue in response.json()["issues"]}
    assert issues["foods_without_nutrients"]["count"] == 1
    assert issues["inactive_foods"]["count"] == 1
    assert issues["foods_with_zero_or_negative_nutrients"]["count"] == 1
    assert issues["supplements_without_nutrients"]["count"] == 1
    assert issues["inactive_supplements"]["count"] == 1
    assert issues["supplement_nutrients_missing_amount_or_unit"]["count"] == 1
    assert issues["association_rules_missing_entities"]["count"] == 1
    assert issues["inactive_association_rules"]["count"] == 1
    assert issues["nutrient_interactions_missing_context"]["count"] == 1
    assert response.json()["issue_categories"] == 9
