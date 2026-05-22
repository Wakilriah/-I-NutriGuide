import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

from apps.accounts.models import Allergy, DislikedFood, UserProfile
from apps.chat.models import ChatMessage, ChatSession
from apps.chat.services import GroqResult
from apps.foods.models import Food, FoodCategory, FoodNutrient
from apps.nutrients.models import Nutrient
from apps.recommendations.models import RecommendationRun
from apps.rules.models import AssociationRule
from apps.supplements.models import Supplement, SupplementNutrient, UserSupplement


pytestmark = pytest.mark.django_db


@pytest.fixture
def chat_recommendation_data(user):
    fruits = FoodCategory.objects.create(name="Fruits", slug="fruits")
    grains = FoodCategory.objects.create(name="Grains", slug="grains")
    vitamin_c = Nutrient.objects.create(name="Vitamin C", slug="vitamin-c", unit="mg")
    iron = Nutrient.objects.create(name="Iron", slug="iron", unit="mg")
    fiber = Nutrient.objects.create(name="Fiber", slug="fiber", unit="g")

    orange = Food.objects.create(name="Orange", slug="orange", category=fruits)
    peanut = Food.objects.create(name="Peanut Butter", slug="peanut-butter", category=grains)
    oats = Food.objects.create(name="Oats", slug="oats", category=grains)
    FoodNutrient.objects.create(food=orange, nutrient=vitamin_c, amount="53.200", unit="mg")
    FoodNutrient.objects.create(food=peanut, nutrient=fiber, amount="8.000", unit="g")
    FoodNutrient.objects.create(food=oats, nutrient=fiber, amount="10.600", unit="g")

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
        explanation="vitamin C-rich foods may support iron absorption.",
    )
    return {"orange": orange, "peanut": peanut, "oats": oats}


def test_chat_recommendation_creates_messages_and_chat_run(authenticated_client, user, chat_recommendation_data, monkeypatch):
    UserProfile.objects.create(user=user, goal="general_health")

    def fake_complete(self, messages):
        assert "cited_recommendations" in messages[1]["content"]
        return GroqResult(content="Try orange with your iron supplement.", model="test-model", token_usage={"total_tokens": 12})

    monkeypatch.setattr("apps.chat.services.GroqClient.complete", fake_complete)

    def fake_recommend(self, user_profile, n=10, foods=None):
        return {
            "user_id": user.id, "strategy": "GRAPH_TRAVERSAL", "weights": {}, "disclaimer": "test",
            "recommendations": [
                {"food_id": chat_recommendation_data["orange"].id, "food_name": "Orange", "food_slug": "orange", "category": "General", "final_score": 1.0, "cbf_score": 1.0, "rules_score": 1.0, "cf_score": 1.0, "reason": "Test", "safety_notes": [], "matched_nutrients": [], "matched_rules": [{"explanation": "rule"}], "related_supplement": None}
            ]        }
    monkeypatch.setattr("apps.recommendations.services.hybrid.HybridRecommender.recommend", fake_recommend)

    response = authenticated_client.post(        reverse("chat-message-create"),
        {"message": "What should I eat with iron?"},
        format="json",
    )

    assert response.status_code == 201
    body = response.json()
    assert body["assistant_message"]["content"] == "Try orange with your iron supplement."
    assert body["recommendation_run"]["items"][0]["food"]["slug"] == "orange"
    assert body["recommendation_run"]["items"][0]["matched_rules"]
    assert body["cited_items"][0]["food"]["slug"] == "orange"
    assert RecommendationRun.objects.get(user=user).input_snapshot["source"] == "chat"
    assert ChatMessage.objects.filter(session_id=body["session_id"]).count() == 2


def test_chat_fallback_when_groq_key_missing(authenticated_client, user, chat_recommendation_data, settings):
    settings.GROQ_API_KEY = ""
    UserProfile.objects.create(user=user, goal="general_health")

    response = authenticated_client.post(
        reverse("chat-message-create"),
        {"message": "Recommend food with my supplement"},
        format="json",
    )

    assert response.status_code == 201
    body = response.json()
    assert "Here are the safest matches" in body["assistant_message"]["content"]
    assert body["cited_items"]


def test_chat_typo_weight_loss_message_still_runs_recommendations(authenticated_client, user, chat_recommendation_data, monkeypatch):
    UserProfile.objects.create(user=user, goal="general_health")
    monkeypatch.setattr(
        "apps.chat.services.GroqClient.complete",
        lambda self, messages: GroqResult(content="", model="test-model", token_usage={}, error_code="http_403", error_message="Forbidden"),
    )

    response = authenticated_client.post(
        reverse("chat-message-create"),
        {"message": "i wannq q deits fo loss wight"},
        format="json",
    )

    assert response.status_code == 201
    body = response.json()
    assert body["assistant_message"]["metadata"]["intent"] == "recommendation"
    assert body["assistant_message"]["metadata"]["provider_error"] == "Forbidden"
    assert body["recommendation_run"]["items"]
    assert body["cited_items"]


def test_chat_recommendation_respects_allergies_and_disliked_foods(authenticated_client, user, chat_recommendation_data, monkeypatch):
    profile = UserProfile.objects.create(user=user, goal="general_health")
    peanut_allergy = Allergy.objects.create(name="Peanut", slug="peanut")
    profile.allergies.add(peanut_allergy)
    DislikedFood.objects.create(user=user, name="Oats", slug="oats")
    monkeypatch.setattr(
        "apps.chat.services.GroqClient.complete",
        lambda self, messages: GroqResult(content="", model="test-model", token_usage={}, error_code="provider_unavailable"),
    )

    response = authenticated_client.post(reverse("chat-message-create"), {"message": "Recommend a snack"}, format="json")

    assert response.status_code == 201
    slugs = [item["food"]["slug"] for item in response.json()["cited_items"]]
    assert "peanut-butter" not in slugs
    assert "oats" not in slugs


def test_chat_sessions_are_listed_with_history(authenticated_client, user, chat_recommendation_data, monkeypatch):
    UserProfile.objects.create(user=user, goal="general_health")
    monkeypatch.setattr(
        "apps.chat.services.GroqClient.complete",
        lambda self, messages: GroqResult(content="Orange is a useful match.", model="test-model", token_usage={}),
    )
    create_response = authenticated_client.post(reverse("chat-message-create"), {"message": "Recommend food"}, format="json")

    response = authenticated_client.get(reverse("chat-session-list"))

    assert response.status_code == 200
    assert response.json()[0]["id"] == create_response.json()["session_id"]
    assert len(response.json()[0]["messages"]) == 2


def test_user_can_clear_own_chat_history(authenticated_client, user, other_user):
    own_session = ChatSession.objects.create(user=user, title="Own session")
    ChatMessage.objects.create(session=own_session, role=ChatMessage.Role.USER, content="Hello")
    other_session = ChatSession.objects.create(user=other_user, title="Other session")
    ChatMessage.objects.create(session=other_session, role=ChatMessage.Role.USER, content="Keep me")

    response = authenticated_client.delete(reverse("chat-session-clear"))

    assert response.status_code == 200
    assert response.json()["deleted"] >= 1
    assert not ChatSession.objects.filter(user=user).exists()
    assert ChatSession.objects.filter(user=other_user).exists()


def test_admin_can_monitor_chat_sessions(api_client, user):
    admin_user = get_user_model().objects.create_user(
        email="admin@example.com",
        password="StrongPassword123",
        name="Admin",
        is_staff=True,
    )
    session = ChatSession.objects.create(user=user, title="Recommend food")
    ChatMessage.objects.create(session=session, role=ChatMessage.Role.USER, content="What should I eat?")
    ChatMessage.objects.create(
        session=session,
        role=ChatMessage.Role.ASSISTANT,
        content="Try orange.",
        metadata={
            "cited_items": [
                {
                    "id": 7,
                    "food": {"id": 3, "name": "Orange", "slug": "orange", "category": "Fruits"},
                    "score": 0.91,
                    "explanation": "Orange provides vitamin C.",
                }
            ]
        },
    )
    api_client.force_authenticate(user=admin_user)

    response = api_client.get(reverse("admin-chat-session-list"), {"search": "orange"})

    assert response.status_code == 200
    assert response.json()["count"] == 1
    result = response.json()["results"][0]
    assert result["user"]["email"] == user.email
    assert result["messages"][1]["metadata"]["cited_items"][0]["food"]["name"] == "Orange"


def test_admin_chat_users_are_grouped_by_user(api_client, user):
    admin_user = get_user_model().objects.create_user(
        email="chat-admin@example.com",
        password="StrongPassword123",
        name="Admin",
        is_staff=True,
    )
    session = ChatSession.objects.create(user=user, title="Recommend food")
    ChatMessage.objects.create(session=session, role=ChatMessage.Role.USER, content="What should I eat?")
    api_client.force_authenticate(user=admin_user)

    response = api_client.get(reverse("admin-chat-user-list"))

    assert response.status_code == 200
    assert response.json()["results"][0]["email"] == user.email
    assert response.json()["results"][0]["chat_session_count"] == 1
    assert response.json()["results"][0]["chat_message_count"] == 1


def test_admin_can_clear_one_users_chats(api_client, user, other_user):
    admin_user = get_user_model().objects.create_user(
        email="clear-admin@example.com",
        password="StrongPassword123",
        name="Admin",
        is_staff=True,
    )
    ChatSession.objects.create(user=user, title="Delete me")
    ChatSession.objects.create(user=other_user, title="Keep me")
    api_client.force_authenticate(user=admin_user)

    response = api_client.delete(reverse("admin-chat-user-clear", kwargs={"user_id": user.id}))

    assert response.status_code == 200
    assert not ChatSession.objects.filter(user=user).exists()
    assert ChatSession.objects.filter(user=other_user).exists()


def test_daily_chat_limit_resets_by_date(authenticated_client, user, settings):
    settings.CHAT_DAILY_LIMIT_PER_USER = 1
    session = ChatSession.objects.create(user=user, title="Earlier today")
    ChatMessage.objects.create(session=session, role=ChatMessage.Role.USER, content="First")

    response = authenticated_client.post(reverse("chat-message-create"), {"message": "Second"}, format="json")

    assert response.status_code == 429
    assert "daily chat allowance resets tomorrow" in response.json()["detail"]


def test_chat_requires_authentication(api_client):
    response = api_client.post(reverse("chat-message-create"), {"message": "Recommend food"}, format="json")

    assert response.status_code == 401


def test_chat_rejects_other_users_session(api_client, user, other_user):
    session = ChatSession.objects.create(user=other_user, title="Other session")
    api_client.force_authenticate(user=user)

    response = api_client.post(
        reverse("chat-message-create"),
        {"session_id": str(session.id), "message": "Hello"},
        format="json",
    )

    assert response.status_code == 404
