import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse

from apps.rules.models import AssociationRule


pytestmark = pytest.mark.django_db


@pytest.fixture
def rules_admin_client(api_client):
    admin = get_user_model().objects.create_superuser(
        email="rules-admin@example.com",
        password="StrongPassword123",
        name="Rules Admin",
    )
    api_client.force_authenticate(user=admin)
    return api_client


def test_admin_can_create_association_rule(rules_admin_client):
    response = rules_admin_client.post(
        reverse("admin-association-rule-list"),
        {
            "antecedent_type": "supplement",
            "antecedent_slug": "iron",
            "consequent_type": "nutrient",
            "consequent_slug": "vitamin-c",
            "support": 0.32,
            "confidence": 0.84,
            "lift": 1.45,
            "explanation": "Vitamin C-rich foods may support iron absorption.",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.json()["is_active"] is True
    assert AssociationRule.objects.filter(antecedent_slug="iron", consequent_slug="vitamin-c").exists()


def test_normal_user_cannot_create_association_rule(authenticated_client):
    response = authenticated_client.post(
        reverse("admin-association-rule-list"),
        {
            "antecedent_type": "supplement",
            "antecedent_slug": "iron",
            "consequent_type": "nutrient",
            "consequent_slug": "vitamin-c",
            "explanation": "Nope.",
        },
        format="json",
    )

    assert response.status_code == 403


def test_admin_can_disable_association_rule(rules_admin_client):
    rule = AssociationRule.objects.create(
        antecedent_type="supplement",
        antecedent_slug="iron",
        consequent_type="nutrient",
        consequent_slug="vitamin-c",
        support=0.32,
        confidence=0.84,
        lift=1.45,
        explanation="Vitamin C-rich foods may support iron absorption.",
    )

    response = rules_admin_client.patch(
        reverse("admin-association-rule-detail", kwargs={"pk": rule.id}),
        {"is_active": False},
        format="json",
    )

    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_association_rule_metric_validation(rules_admin_client):
    response = rules_admin_client.post(
        reverse("admin-association-rule-list"),
        {
            "antecedent_type": "supplement",
            "antecedent_slug": "iron",
            "consequent_type": "nutrient",
            "consequent_slug": "vitamin-c",
            "support": 1.2,
            "confidence": 0.84,
            "lift": 1.45,
            "explanation": "Invalid support.",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "support" in response.json()


def test_seed_rules_command_is_idempotent():
    call_command("seed_rules")
    call_command("seed_rules")

    assert AssociationRule.objects.count() == 8
    assert AssociationRule.objects.filter(antecedent_slug="iron", consequent_slug="vitamin-c", is_active=True).exists()
    assert AssociationRule.objects.filter(antecedent_slug="magnesium", consequent_slug="magnesium", is_active=True).exists()
    assert AssociationRule.objects.filter(antecedent_slug="vitamin-b12", consequent_slug="vitamin-b12", is_active=True).exists()
