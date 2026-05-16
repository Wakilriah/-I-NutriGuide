import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse

from apps.nutrients.models import Nutrient


pytestmark = pytest.mark.django_db


@pytest.fixture
def admin_user():
    return get_user_model().objects.create_superuser(
        email="admin@example.com",
        password="StrongPassword123",
        name="Admin User",
    )


@pytest.fixture
def admin_client(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client


def test_admin_can_create_nutrient(admin_client):
    response = admin_client.post(
        reverse("admin-nutrient-list"),
        {
            "name": "Vitamin C",
            "slug": "vitamin-c",
            "unit": "mg",
            "description": "Supports normal immune function.",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.json()["slug"] == "vitamin-c"
    assert Nutrient.objects.filter(slug="vitamin-c").exists()


def test_normal_user_cannot_create_nutrient(authenticated_client):
    response = authenticated_client.post(
        reverse("admin-nutrient-list"),
        {"name": "Iron", "slug": "iron", "unit": "mg"},
        format="json",
    )

    assert response.status_code == 403
    assert not Nutrient.objects.filter(slug="iron").exists()


def test_admin_can_update_and_delete_nutrient(admin_client):
    nutrient = Nutrient.objects.create(name="Magnesium", slug="magnesium", unit="mg")

    update_response = admin_client.patch(
        reverse("admin-nutrient-detail", kwargs={"slug": nutrient.slug}),
        {"description": "Supports normal muscle function."},
        format="json",
    )
    delete_response = admin_client.delete(reverse("admin-nutrient-detail", kwargs={"slug": nutrient.slug}))

    assert update_response.status_code == 200
    assert update_response.json()["description"] == "Supports normal muscle function."
    assert delete_response.status_code == 204
    assert not Nutrient.objects.filter(slug="magnesium").exists()


def test_seed_nutrients_command_is_idempotent():
    call_command("seed_nutrients")
    call_command("seed_nutrients")

    assert Nutrient.objects.count() == 10
    assert Nutrient.objects.filter(slug="vitamin-c", unit="mg").exists()
