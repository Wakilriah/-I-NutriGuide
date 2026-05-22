import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse

from apps.nutrients.models import Nutrient
from apps.supplements.models import Supplement, SupplementNutrient, UserSupplement


pytestmark = pytest.mark.django_db


@pytest.fixture
def supplement_admin_client(api_client):
    admin = get_user_model().objects.create_superuser(
        email="supplement-admin@example.com",
        password="StrongPassword123",
        name="Supplement Admin",
    )
    api_client.force_authenticate(user=admin)
    return api_client


@pytest.fixture
def iron():
    return Nutrient.objects.create(name="Iron", slug="iron", unit="mg")


@pytest.fixture
def iron_supplement(iron):
    supplement = Supplement.objects.create(name="Iron", slug="iron", common_dose="18 mg")
    SupplementNutrient.objects.create(supplement=supplement, nutrient=iron, amount="18.000", unit="mg")
    return supplement


def test_admin_can_create_supplement_with_nutrients(supplement_admin_client, iron):
    response = supplement_admin_client.post(
        reverse("supplement-list"),
        {
            "name": "Iron",
            "slug": "iron",
            "description": "Iron supplement.",
            "common_dose": "18 mg",
            "nutrient_items": [{"nutrient_slug": iron.slug, "amount": "18.000", "unit": "mg"}],
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.json()["nutrients"][0]["slug"] == "iron"
    assert SupplementNutrient.objects.filter(supplement__slug="iron", nutrient=iron).exists()


def test_normal_user_cannot_create_supplement(authenticated_client, iron):
    response = authenticated_client.post(
        reverse("supplement-list"),
        {"name": "Iron", "slug": "iron", "nutrient_items": [{"nutrient_slug": iron.slug}]},
        format="json",
    )

    assert response.status_code == 403
    assert not Supplement.objects.filter(slug="iron").exists()


def test_public_supplement_list_searches_and_hides_inactive(api_client, iron):
    Supplement.objects.create(name="Iron", slug="iron")
    Supplement.objects.create(name="Archived Zinc", slug="archived-zinc", is_active=False)

    response = api_client.get(reverse("supplement-list"), {"search": "iron"})

    assert response.status_code == 200
    assert [supplement["slug"] for supplement in response.json()] == ["iron"]


def test_user_can_manage_only_own_supplements(api_client, user, other_user, iron_supplement):
    other_entry = UserSupplement.objects.create(user=other_user, supplement=iron_supplement, dose="18 mg")
    api_client.force_authenticate(user=user)

    create_response = api_client.post(
        reverse("user-supplement-list"),
        {"supplement_id": iron_supplement.id, "dose": "18 mg", "frequency": "daily", "time_of_day": "morning"},
        format="json",
    )
    list_response = api_client.get(reverse("user-supplement-list"))
    forbidden_response = api_client.patch(
        reverse("user-supplement-detail", kwargs={"pk": other_entry.id}),
        {"dose": "wrong user"},
        format="json",
    )

    assert create_response.status_code == 201
    assert list_response.status_code == 200
    assert [entry["id"] for entry in list_response.json()] == [create_response.json()["id"]]
    assert forbidden_response.status_code == 404


def test_user_supplement_frequency_is_limited_to_daily(authenticated_client, iron_supplement):
    response = authenticated_client.post(
        reverse("user-supplement-list"),
        {"supplement_id": iron_supplement.id, "dose": "18 mg", "frequency": "weekly", "time_of_day": "morning"},
        format="json",
    )

    assert response.status_code == 400
    assert "Only daily supplement routines are supported." in response.json()["frequency"]


def test_seed_supplements_command_is_idempotent():
    call_command("seed_supplements")
    call_command("seed_supplements")

    assert Supplement.objects.count() == 10
    assert SupplementNutrient.objects.filter(supplement__slug="iron", nutrient__slug="iron").exists()
