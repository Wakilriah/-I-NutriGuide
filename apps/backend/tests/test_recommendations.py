import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

from apps.accounts.models import Allergy, UserProfile
from apps.foods.models import Food, FoodCategory, FoodNutrient
from apps.nutrients.models import Nutrient
from apps.recommendations.models import RecommendationItem, RecommendationRun
from apps.rules.models import AssociationRule
from apps.supplements.models import Supplement, SupplementNutrient, UserSupplement
from apps.recommendations.services.filters import is_food_blocked
from apps.recommendations.tasks import recommendation_cache_smoke_task


pytestmark = pytest.mark.django_db


@pytest.fixture
def recommendation_data(user):
    fruits = FoodCategory.objects.create(name="Fruits", slug="fruits")
    vegetables = FoodCategory.objects.create(name="Vegetables", slug="vegetables")
    grains = FoodCategory.objects.create(name="Grains", slug="grains")

    vitamin_c = Nutrient.objects.create(name="Vitamin C", slug="vitamin-c", unit="mg")
    iron = Nutrient.objects.create(name="Iron", slug="iron", unit="mg")
    fiber = Nutrient.objects.create(name="Fiber", slug="fiber", unit="g")

    orange = Food.objects.create(name="Orange", slug="orange", category=fruits)
    spinach = Food.objects.create(name="Spinach", slug="spinach", category=vegetables)
    oats = Food.objects.create(name="Oats", slug="oats", category=grains)
    archived = Food.objects.create(name="Archived Apple", slug="archived-apple", category=fruits, is_active=False)
    peanut = Food.objects.create(name="Peanut Butter", slug="peanut-butter", category=grains)

    FoodNutrient.objects.create(food=orange, nutrient=vitamin_c, amount="53.200", unit="mg")
    FoodNutrient.objects.create(food=spinach, nutrient=iron, amount="2.700", unit="mg")
    FoodNutrient.objects.create(food=oats, nutrient=fiber, amount="10.600", unit="g")
    FoodNutrient.objects.create(food=archived, nutrient=vitamin_c, amount="10.000", unit="mg")
    FoodNutrient.objects.create(food=peanut, nutrient=fiber, amount="8.000", unit="g")

    iron_supplement = Supplement.objects.create(name="Iron", slug="iron", common_dose="18 mg")
    SupplementNutrient.objects.create(supplement=iron_supplement, nutrient=iron, amount="18.000", unit="mg")
    UserSupplement.objects.create(user=user, supplement=iron_supplement, dose="18 mg", frequency="daily")

    AssociationRule.objects.create(
        antecedent_type="supplement",
        antecedent_slug="iron",
        consequent_type="nutrient",
        consequent_slug="vitamin-c",
        support=0.3,
        confidence=0.9,
        lift=1.6,
        explanation="vitamin C-rich foods may support iron absorption when using an iron supplement.",
    )
    AssociationRule.objects.create(
        antecedent_type="supplement",
        antecedent_slug="iron",
        consequent_type="food",
        consequent_slug="spinach",
        support=0.9,
        confidence=1.0,
        lift=2.0,
        explanation="spinach is a directly matched rule for this test.",
        is_active=False,
    )

    return {
        "orange": orange,
        "spinach": spinach,
        "oats": oats,
        "archived": archived,
        "peanut": peanut,
    }


def test_generate_recommendations_filters_and_ranks(authenticated_client, user, recommendation_data, monkeypatch):
    profile = UserProfile.objects.create(user=user, goal="general_health")
    peanut_allergy = Allergy.objects.create(name="Peanut", slug="peanut")
    profile.allergies.add(peanut_allergy)

    def fake_recommend(self, user_profile, n=10, foods=None):
        return {
            "user_id": user.id, "strategy": "GRAPH_TRAVERSAL", "weights": {}, "disclaimer": "Recommendations are nutritional suggestions",
            "recommendations": [
                {"food_id": recommendation_data["orange"].id, "food_name": "Orange", "food_slug": "orange", "category": "General", "final_score": 1.0, "cbf_score": 1.0, "rules_score": 1.0, "cf_score": 1.0, "reason": "This complements your supplements", "safety_notes": [], "matched_nutrients": ["vitamine_c"], "matched_rules": [], "related_supplement": None}
            ]        }
    monkeypatch.setattr("apps.recommendations.services.hybrid.HybridRecommender.recommend", fake_recommend)

    response = authenticated_client.post(reverse("recommendation-generate"), {"limit": 5}, format="json")
    assert response.status_code == 201
    body = response.json()
    slugs = [item["food"]["slug"] for item in body["items"]]
    assert body["disclaimer"].startswith("Recommendations are nutritional suggestions")
    assert slugs[0] == "orange"
    assert "peanut-butter" not in slugs
    assert "archived-apple" not in slugs
    assert body["items"][0]["matched_nutrients"] == ["vitamine_c"]
    assert body["items"][0]["confidence_score"] >= 0
    assert "summary" in body["items"][0]["explanation"]
    assert RecommendationRun.objects.filter(user=user).count() == 1
    assert RecommendationItem.objects.filter(run__user=user).count() == len(body["items"])


def test_disabled_rule_is_ignored(authenticated_client, recommendation_data):
    response = authenticated_client.post(reverse("recommendation-generate"), {"limit": 5}, format="json")

    assert response.status_code == 201
    spinach = next(item for item in response.json()["items"] if item["food"]["slug"] == "spinach")
    assert spinach["rule_score"] == 0
    assert "directly matched rule" not in spinach["explanation"]["summary"]


def test_hybrid_food_endpoint_returns_subscores(authenticated_client, user, recommendation_data):
    UserProfile.objects.create(user=user, goal="general_health")

    response = authenticated_client.get(reverse("recommendation-foods"), {"n": 3})

    assert response.status_code == 200
    body = response.json()
    assert body["strategy"] == "GRAPH_TRAVERSAL"
    assert body["weights"] == {"alpha": 1.0, "beta": 0.0, "gamma": 0.0}
    assert body["recommendations"] == sorted(
        body["recommendations"],
        key=lambda item: item["final_score"],
        reverse=True,
    )
    first = body["recommendations"][0]
    assert {"final_score", "cbf_score", "rules_score", "cf_score", "reason", "safety_notes"} <= set(first)


def test_hybrid_preview_excludes_allergies(api_client, recommendation_data):
    response = api_client.post(
        reverse("recommendation-preview"),
        {"supplements": ["iron"], "allergies": ["orange"], "n": 5},
        format="json",
    )

    assert response.status_code == 200
    slugs = [item["food_slug"] for item in response.json()["recommendations"]]
    assert "orange" not in slugs


def test_history_is_scoped_to_current_user(api_client, user, other_user, recommendation_data):
    api_client.force_authenticate(user=user)
    own_response = api_client.post(reverse("recommendation-generate"), {"limit": 2}, format="json")
    RecommendationRun.objects.create(user=other_user)

    list_response = api_client.get(reverse("recommendation-history"))
    detail_response = api_client.get(
        reverse("recommendation-history-detail", kwargs={"run_id": own_response.json()["run_id"]})
    )

    assert list_response.status_code == 200
    assert len(list_response.json()) == 1
    assert detail_response.status_code == 200
    assert detail_response.json()["run_id"] == own_response.json()["run_id"]


def test_user_can_save_and_unsave_recommendation_item(authenticated_client, user, recommendation_data):
    run_response = authenticated_client.post(reverse("recommendation-generate"), {"limit": 2}, format="json")
    item_id = run_response.json()["items"][0]["id"]

    create_response = authenticated_client.post(reverse("saved-recommendation-list"), {"recommendation_item_id": item_id}, format="json")
    duplicate_response = authenticated_client.post(reverse("saved-recommendation-list"), {"recommendation_item_id": item_id}, format="json")
    list_response = authenticated_client.get(reverse("saved-recommendation-list"))

    assert create_response.status_code == 201
    assert duplicate_response.status_code == 201
    assert len(list_response.json()) == 1
    assert list_response.json()[0]["recommendation_item"]["id"] == item_id

    delete_response = authenticated_client.delete(reverse("saved-recommendation-detail", kwargs={"pk": create_response.json()["id"]}))

    assert delete_response.status_code == 204
    assert authenticated_client.get(reverse("saved-recommendation-list")).json() == []


def test_user_cannot_save_other_users_recommendation_item(api_client, user, other_user, recommendation_data):
    api_client.force_authenticate(user=other_user)
    other_run_response = api_client.post(reverse("recommendation-generate"), {"limit": 1}, format="json")
    other_item_id = other_run_response.json()["items"][0]["id"]

    api_client.force_authenticate(user=user)
    response = api_client.post(reverse("saved-recommendation-list"), {"recommendation_item_id": other_item_id}, format="json")

    assert response.status_code == 400
    assert "does not belong" in str(response.json())


def test_admin_can_list_all_recommendation_runs(api_client, user, other_user, recommendation_data):
    api_client.force_authenticate(user=user)
    own_response = api_client.post(reverse("recommendation-generate"), {"limit": 2}, format="json")
    other_run = RecommendationRun.objects.create(user=other_user)
    admin = get_user_model().objects.create_superuser(
        email="recommendation-admin@example.com",
        password="StrongPassword123",
        name="Recommendation Admin",
    )
    api_client.force_authenticate(user=admin)

    response = api_client.get(reverse("admin-recommendation-list"))

    assert response.status_code == 200
    run_ids = [run["run_id"] for run in response.json()]
    assert own_response.json()["run_id"] in run_ids
    assert str(other_run.id) in run_ids
    assert response.json()[0]["user"]["email"]


def test_generate_requires_authentication(api_client):
    response = api_client.post(reverse("recommendation-generate"), {"limit": 2}, format="json")

    assert response.status_code == 401


def test_ciqual_french_categories_respect_dietary_restrictions(user):
    dairy = FoodCategory.objects.create(name="lait et produits laitiers", slug="lait-et-produits-laitiers", source="CIQUAL 2020")
    meat = FoodCategory.objects.create(name="viandes, oeufs, poissons", slug="viandes-oeufs-poissons", source="CIQUAL 2020")
    cheese = Food.objects.create(name="Comte", slug="comte", category=dairy, source="CIQUAL 2020")
    beef = Food.objects.create(name="Boeuf", slug="boeuf", category=meat, source="CIQUAL 2020")
    profile = UserProfile.objects.create(user=user, diet_type="vegan")

    assert is_food_blocked(cheese, profile)
    assert is_food_blocked(beef, profile)


def test_repeated_recommendation_request_uses_cache(authenticated_client, user, recommendation_data):
    first_response = authenticated_client.post(reverse("recommendation-generate"), {"limit": 2}, format="json")
    second_response = authenticated_client.post(reverse("recommendation-generate"), {"limit": 2}, format="json")

    assert first_response.status_code == 201
    assert second_response.status_code == 200
    assert second_response.json()["run_id"] == first_response.json()["run_id"]
    assert RecommendationRun.objects.filter(user=user).count() == 1


def test_profile_change_invalidates_recommendation_cache(authenticated_client, user, recommendation_data):
    first_response = authenticated_client.post(reverse("recommendation-generate"), {"limit": 2}, format="json")
    authenticated_client.patch(reverse("profile"), {"goal": "digestive_health"}, format="json")
    second_response = authenticated_client.post(reverse("recommendation-generate"), {"limit": 2}, format="json")

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert second_response.json()["run_id"] != first_response.json()["run_id"]
    assert RecommendationRun.objects.filter(user=user).count() == 2


def test_recommendation_cache_smoke_task():
    assert recommendation_cache_smoke_task() == "recommendation-cache-ok"
