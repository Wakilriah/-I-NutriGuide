import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.foods.models import Food, FoodCategory, FoodNutrient
from apps.nutrients.models import Nutrient
from apps.feedback.models import RecommendationFeedback
from apps.recommendations.models import RecommendationItem, SavedRecommendationItem
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
