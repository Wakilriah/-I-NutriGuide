import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError


@pytest.mark.django_db
def test_ensure_superuser_creates_admin_from_env(monkeypatch):
    monkeypatch.setenv("ADMIN_EMAIL", "Admin@Example.com")
    monkeypatch.setenv("ADMIN_PASSWORD", "StrongAdminPassword123")
    monkeypatch.setenv("ADMIN_NAME", "Production Admin")

    call_command("ensure_superuser")

    admin = get_user_model().objects.get(email="admin@example.com")
    assert admin.name == "Production Admin"
    assert admin.is_staff is True
    assert admin.is_superuser is True
    assert admin.check_password("StrongAdminPassword123")


@pytest.mark.django_db
def test_ensure_superuser_updates_existing_admin(monkeypatch):
    admin = get_user_model().objects.create_user(email="admin@example.com", password="old-password", name="Old")
    monkeypatch.setenv("ADMIN_EMAIL", "admin@example.com")
    monkeypatch.setenv("ADMIN_PASSWORD", "NewStrongPassword123")
    monkeypatch.setenv("ADMIN_NAME", "Updated Admin")

    call_command("ensure_superuser")

    admin.refresh_from_db()
    assert admin.name == "Updated Admin"
    assert admin.is_staff is True
    assert admin.is_superuser is True
    assert admin.check_password("NewStrongPassword123")


@pytest.mark.django_db
def test_ensure_superuser_requires_email_and_password(monkeypatch):
    monkeypatch.delenv("ADMIN_EMAIL", raising=False)
    monkeypatch.setenv("ADMIN_PASSWORD", "StrongAdminPassword123")

    with pytest.raises(CommandError, match="ADMIN_EMAIL is required"):
        call_command("ensure_superuser")

    monkeypatch.setenv("ADMIN_EMAIL", "admin@example.com")
    monkeypatch.delenv("ADMIN_PASSWORD", raising=False)

    with pytest.raises(CommandError, match="ADMIN_PASSWORD is required"):
        call_command("ensure_superuser")
