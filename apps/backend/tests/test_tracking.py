import pytest
from django.urls import reverse

from apps.accounts.models import DailyTracking


pytestmark = pytest.mark.django_db


def test_user_can_update_today_tracking(authenticated_client, user):
    response = authenticated_client.patch(
        reverse("tracking-today"),
        {
            "weight_kg": "72.50",
            "water_ml": 2100,
            "calories": 2200,
            "protein_g": "95.00",
            "fiber_g": "28.00",
            "steps": 8500,
            "supplements_taken": ["Iron"],
            "goals_completed": True,
            "notes": "Good day.",
        },
        format="json",
    )

    assert response.status_code == 200
    assert response.json()["water_ml"] == 2100
    assert DailyTracking.objects.filter(user=user).count() == 1


def test_user_tracking_history_is_scoped(authenticated_client, user, other_user):
    DailyTracking.objects.create(user=user, date="2026-05-16", calories=2000)
    DailyTracking.objects.create(user=other_user, date="2026-05-16", calories=999)

    response = authenticated_client.get(reverse("tracking-history"))

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["calories"] == 2000
