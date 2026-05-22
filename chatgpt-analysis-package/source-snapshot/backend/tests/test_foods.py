import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse

from apps.foods.models import Food, FoodCategory, FoodNutrient
from apps.nutrients.models import Nutrient


pytestmark = pytest.mark.django_db


@pytest.fixture
def food_admin_client(api_client):
    admin = get_user_model().objects.create_superuser(
        email="food-admin@example.com",
        password="StrongPassword123",
        name="Food Admin",
    )
    api_client.force_authenticate(user=admin)
    return api_client


@pytest.fixture
def vitamin_c():
    return Nutrient.objects.create(name="Vitamin C", slug="vitamin-c", unit="mg")


def test_admin_can_create_food_with_nutrients(food_admin_client, vitamin_c):
    response = food_admin_client.post(
        reverse("food-list"),
        {
            "name": "Orange",
            "slug": "orange",
            "category_slug": "fruits",
            "description": "Citrus fruit.",
            "nutrient_items": [{"nutrient_slug": vitamin_c.slug, "amount": "53.200", "unit": "mg"}],
        },
        format="json",
    )

    assert response.status_code == 201
    body = response.json()
    assert body["category"] == "Fruits"
    assert body["nutrients"][0]["slug"] == "vitamin-c"
    assert FoodNutrient.objects.filter(food__slug="orange", nutrient=vitamin_c).exists()


def test_normal_user_cannot_create_food(authenticated_client, vitamin_c):
    response = authenticated_client.post(
        reverse("food-list"),
        {
            "name": "Spinach",
            "category_slug": "vegetables",
            "nutrient_items": [{"nutrient_slug": vitamin_c.slug, "amount": "20.000"}],
        },
        format="json",
    )

    assert response.status_code == 403
    assert not Food.objects.filter(slug="spinach").exists()


def test_public_food_list_searches_filters_and_hides_inactive(api_client, vitamin_c):
    fruits = FoodCategory.objects.create(name="Fruits", slug="fruits")
    vegetables = FoodCategory.objects.create(name="Vegetables", slug="vegetables")
    Food.objects.create(name="Orange", slug="orange", category=fruits)
    Food.objects.create(name="Spinach", slug="spinach", category=vegetables)
    Food.objects.create(name="Archived Apple", slug="archived-apple", category=fruits, is_active=False)

    response = api_client.get(reverse("food-list"), {"search": "o", "category": "fruits"})

    assert response.status_code == 200
    assert response.json()["count"] == 1
    assert [food["slug"] for food in response.json()["results"]] == ["orange"]


def test_food_list_is_paginated_and_filters_source(food_admin_client, vitamin_c):
    fruits = FoodCategory.objects.create(name="Fruits", slug="fruits")
    for index in range(30):
        Food.objects.create(
            name=f"Manual Food {index}",
            slug=f"manual-food-{index}",
            category=fruits,
            source="",
        )
    Food.objects.create(name="CIQUAL Apple", slug="ciqual-apple", category=fruits, source="CIQUAL 2020")

    first_page = food_admin_client.get(reverse("food-list"), {"page": 1, "page_size": 10})
    manual_page = food_admin_client.get(reverse("food-list"), {"source": "manual", "page_size": 100})
    ciqual_page = food_admin_client.get(reverse("food-list"), {"source": "CIQUAL 2020", "page_size": 100})

    assert first_page.status_code == 200
    assert first_page.json()["count"] == 31
    assert len(first_page.json()["results"]) == 10
    assert manual_page.json()["count"] == 30
    assert ciqual_page.json()["results"][0]["slug"] == "ciqual-apple"


def test_seed_foods_command_is_idempotent():
    call_command("seed_foods")
    call_command("seed_foods")

    assert Food.objects.count() == 21
    assert FoodCategory.objects.filter(slug="fruits").exists()
    assert FoodNutrient.objects.filter(food__slug="orange", nutrient__slug="vitamin-c").exists()
