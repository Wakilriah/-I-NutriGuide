import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(
        email="user@example.com",
        password="StrongPassword123",
        name="Test User",
    )


@pytest.fixture
def other_user(db):
    return get_user_model().objects.create_user(
        email="other@example.com",
        password="StrongPassword123",
        name="Other User",
    )


@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client

