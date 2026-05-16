import pytest
from django.urls import reverse

from apps.accounts.models import Allergy, DietaryRestriction, DislikedFood, UserProfile


pytestmark = pytest.mark.django_db


def test_authenticated_user_can_read_default_profile(authenticated_client, user):
    response = authenticated_client.get(reverse("profile"))

    assert response.status_code == 200
    assert response.json()["diet_type"] == "none"
    assert UserProfile.objects.filter(user=user).exists()


def test_authenticated_user_can_update_profile_preferences(authenticated_client, user):
    response = authenticated_client.patch(
        reverse("profile"),
        {
            "age": 24,
            "gender": "male",
            "height_cm": "176.00",
            "weight_kg": "75.00",
            "goal": "general_health",
            "activity_level": "moderate",
            "diet_type": "halal",
            "allergies": ["Peanuts"],
            "dietary_restrictions": ["Halal"],
            "disliked_foods": ["Broccoli", "broccoli"],
        },
        format="json",
    )

    assert response.status_code == 200
    body = response.json()
    assert body["age"] == 24
    assert body["diet_type"] == "halal"
    assert body["allergies"] == ["peanuts"]
    assert body["dietary_restrictions"] == ["halal"]
    assert body["disliked_foods"] == ["broccoli"]
    assert Allergy.objects.filter(slug="peanuts").exists()
    assert DietaryRestriction.objects.filter(slug="halal").exists()
    assert DislikedFood.objects.filter(user=user, slug="broccoli").count() == 1


def test_profile_endpoint_requires_authentication(api_client):
    response = api_client.get(reverse("profile"))

    assert response.status_code == 401


def test_profile_endpoint_is_scoped_to_authenticated_user(api_client, user, other_user):
    UserProfile.objects.create(user=other_user, age=61, diet_type="vegan")
    api_client.force_authenticate(user=user)

    response = api_client.patch(reverse("profile"), {"age": 24}, format="json")

    assert response.status_code == 200
    assert response.json()["age"] == 24
    assert other_user.profile.age == 61

