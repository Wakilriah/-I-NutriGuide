from django.urls import reverse
import pytest


pytestmark = pytest.mark.django_db


def test_health_endpoint_returns_ok(client):
    response = client.get(reverse("health-check"))

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["database"] == "ok"
    assert response.json()["redis"] == "ok"
