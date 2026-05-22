import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from unittest.mock import patch


@pytest.fixture(autouse=True)
def mock_neo4j_client():
    """Mock the Neo4j client for all tests to avoid requiring a real graph DB."""
    with patch("apps.common.neo4j_client.Neo4jClient.get_driver") as mock_get_driver:
        # We can configure the mock to return a dummy driver or MagicMock if tests start needing it.
        mock_get_driver.return_value = None
        yield mock_get_driver


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

