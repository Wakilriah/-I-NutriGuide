import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from django.urls import reverse
from datetime import timedelta
from unittest.mock import patch


pytestmark = pytest.mark.django_db


def test_register_user_sends_verification_code(api_client):
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
    assert body["verification_required"] is True
    assert "access" not in body
    user = get_user_model().objects.get(email="new@example.com")
    assert user.is_email_verified is False
    assert user.email_verification_code_hash


def test_unverified_user_cannot_login(api_client):
    user = get_user_model().objects.create_user(
        email="pending@example.com",
        password="StrongPassword123",
        name="Pending User",
        is_email_verified=False,
    )
    response = api_client.post(
        reverse("auth-login"),
        {"email": user.email, "password": "StrongPassword123"},
        format="json",
    )

    assert response.status_code == 400


def test_verify_email_returns_tokens(api_client):
    user = get_user_model().objects.create_user(
        email="verify@example.com",
        password="StrongPassword123",
        name="Verify User",
        is_email_verified=False,
    )
    user.email_verification_code_hash = make_password("123456")
    user.email_verification_expires_at = timezone.now() + timedelta(minutes=5)
    user.save(update_fields=["email_verification_code_hash", "email_verification_expires_at"])

    response = api_client.post(
        reverse("auth-verify-email"),
        {"email": user.email, "code": "123456"},
        format="json",
    )

    assert response.status_code == 201
    body = response.json()
    assert body["user"]["is_email_verified"] is True
    assert "access" in body
    assert "refresh" in body
    user.refresh_from_db()
    assert user.is_email_verified is True


def test_resend_verification_sends_new_code(api_client):
    user = get_user_model().objects.create_user(
        email="resend@example.com",
        password="StrongPassword123",
        name="Resend User",
        is_email_verified=False,
    )

    with patch("apps.accounts.services.send_email_verification") as send_email:
        response = api_client.post(reverse("auth-resend-verification"), {"email": user.email}, format="json")

    assert response.status_code == 200
    send_email.assert_called_once()
    user.refresh_from_db()
    assert user.email_verification_code_hash


def test_password_reset_request_sends_code(api_client, user):
    with patch("apps.accounts.services.send_password_reset") as send_email:
        response = api_client.post(reverse("auth-password-reset-request"), {"email": user.email}, format="json")

    assert response.status_code == 200
    send_email.assert_called_once()
    user.refresh_from_db()
    assert user.password_reset_code_hash


def test_password_reset_request_does_not_reveal_missing_email(api_client):
    response = api_client.post(reverse("auth-password-reset-request"), {"email": "missing@example.com"}, format="json")

    assert response.status_code == 200
    assert response.json() == {"detail": "If an account exists for this email, we sent a password reset code."}


def test_password_reset_confirm_changes_password(api_client, user):
    user.password_reset_code_hash = make_password("654321")
    user.password_reset_expires_at = timezone.now() + timedelta(minutes=5)
    user.save(update_fields=["password_reset_code_hash", "password_reset_expires_at"])

    response = api_client.post(
        reverse("auth-password-reset-confirm"),
        {"email": user.email, "code": "654321", "password": "NewStrongPassword123"},
        format="json",
    )

    assert response.status_code == 201
    user.refresh_from_db()
    assert user.check_password("NewStrongPassword123")
    assert not user.password_reset_code_hash

    login_response = api_client.post(
        reverse("auth-login"),
        {"email": user.email, "password": "NewStrongPassword123"},
        format="json",
    )
    assert login_response.status_code == 200


def test_password_reset_confirm_rejects_bad_code(api_client, user):
    user.password_reset_code_hash = make_password("654321")
    user.password_reset_expires_at = timezone.now() + timedelta(minutes=5)
    user.save(update_fields=["password_reset_code_hash", "password_reset_expires_at"])

    response = api_client.post(
        reverse("auth-password-reset-confirm"),
        {"email": user.email, "code": "111111", "password": "NewStrongPassword123"},
        format="json",
    )

    assert response.status_code == 400
    user.refresh_from_db()
    assert user.check_password("StrongPassword123")


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
        "is_email_verified": True,
    }


def test_google_auth_creates_verified_user(api_client, settings):
    settings.GOOGLE_OAUTH_CLIENT_IDS = ["web-client-id.apps.googleusercontent.com"]
    google_payload = {
        "aud": "web-client-id.apps.googleusercontent.com",
        "sub": "google-user-123",
        "email": "google@example.com",
        "email_verified": True,
        "name": "Google User",
    }

    with patch("apps.accounts.serializers.id_token.verify_oauth2_token", return_value=google_payload):
        response = api_client.post(reverse("auth-google"), {"id_token": "token"}, format="json")

    assert response.status_code == 201
    body = response.json()
    assert body["user"]["email"] == "google@example.com"
    assert body["user"]["is_email_verified"] is True
    assert "access" in body


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
