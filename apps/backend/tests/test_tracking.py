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
            "food_entries": [
                {
                    "food_id": 0,
                    "food_name": "Avocado Toast",
                    "serving_g": "125.4",
                    "calories": 250,
                    "protein_g": 8.5,
                    "carbs_g": "30.25",
                    "fat_g": "11.4",
                    "meal_type": "Breakfast",
                    "unit": "slice",
                    "time": "08:30",
                    "notes": "Manual entry",
                    "timestamp": "2026-06-02T08:30:00Z",
                }
            ],
            "goals_completed": True,
            "notes": "Good day.",
        },
        format="json",
    )

    assert response.status_code == 200
    assert response.json()["water_ml"] == 2100
    assert response.json()["food_entries"][0]["carbs_g"] == 30.2
    assert response.json()["food_entries"][0]["fat_g"] == 11.4
    assert response.json()["food_entries"][0]["meal_type"] == "Breakfast"
    assert response.json()["food_entries"][0]["unit"] == "slice"
    assert response.json()["food_entries"][0]["time"] == "08:30"
    assert response.json()["food_entries"][0]["notes"] == "Manual entry"
    assert DailyTracking.objects.filter(user=user).count() == 1


def test_user_tracking_history_is_scoped(authenticated_client, user, other_user):
    DailyTracking.objects.create(user=user, date="2026-05-16", calories=2000)
    DailyTracking.objects.create(user=other_user, date="2026-05-16", calories=999)

    response = authenticated_client.get(reverse("tracking-history"))

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["calories"] == 2000
