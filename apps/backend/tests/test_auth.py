import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse


pytestmark = pytest.mark.django_db


def test_register_user_returns_tokens_and_user(api_client):
    response = api_client.post(
        reverse("auth-register"),
        {
            "email": "new@example.com",
            "password": "StrongPassword123",
            "name": "New User",
        },
        format="json",
    )

    assert response.status_code == 201
    body = response.json()
    assert body["user"]["email"] == "new@example.com"
    assert body["user"]["name"] == "New User"
    assert "access" in body
    assert "refresh" in body
    assert get_user_model().objects.filter(email="new@example.com").exists()


def test_login_returns_access_and_refresh_tokens(api_client, user):
    response = api_client.post(
        reverse("auth-login"),
        {"email": user.email, "password": "StrongPassword123"},
        format="json",
    )

    assert response.status_code == 200
    assert "access" in response.json()
    assert "refresh" in response.json()


def test_invalid_login_fails(api_client, user):
    response = api_client.post(
        reverse("auth-login"),
        {"email": user.email, "password": "wrong-password"},
        format="json",
    )

    assert response.status_code == 401


def test_authenticated_me_returns_current_user(authenticated_client, user):
    response = authenticated_client.get(reverse("auth-me"))

    assert response.status_code == 200
    assert response.json() == {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "is_staff": False,
    }


def test_unauthenticated_me_fails(api_client):
    response = api_client.get(reverse("auth-me"))

    assert response.status_code == 401


def test_admin_can_list_users(api_client, user, other_user):
    admin = get_user_model().objects.create_superuser(
        email="admin-users@example.com",
        password="StrongPassword123",
        name="Users Admin",
    )
    api_client.force_authenticate(user=admin)

    response = api_client.get(reverse("admin-user-list"))

    assert response.status_code == 200
    emails = [entry["email"] for entry in response.json()]
    assert user.email in emails
    assert other_user.email in emails


def test_normal_user_cannot_list_users(authenticated_client):
    response = authenticated_client.get(reverse("admin-user-list"))

    assert response.status_code == 403
