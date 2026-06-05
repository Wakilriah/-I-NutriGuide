from datetime import time
from unittest.mock import patch

import pytest
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import DailyTracking
from apps.notifications.models import DevicePushToken, NotificationLog, NotificationPreference
from apps.notifications.tasks import send_daily_habit_reminders
from apps.supplements.models import Supplement, UserSupplement


pytestmark = pytest.mark.django_db


def test_user_can_register_expo_push_token(authenticated_client, user):
    response = authenticated_client.post(
        reverse("notification-register-token"),
        {"token": "ExponentPushToken[test-token]", "platform": "android", "device_id": "device-1"},
        format="json",
    )

    assert response.status_code == 201
    token = DevicePushToken.objects.get(user=user)
    assert token.token == "ExponentPushToken[test-token]"
    assert token.platform == "android"
    assert token.active is True


def test_user_can_update_notification_preferences(authenticated_client, user):
    response = authenticated_client.patch(
        reverse("notification-preferences"),
        {
            "notifications_enabled": True,
            "timezone": "Africa/Algiers",
            "supplement_reminder_time": "08:30:00",
            "water_morning_time": "10:00:00",
        },
        format="json",
    )

    assert response.status_code == 200
    preference = NotificationPreference.objects.get(user=user)
    assert preference.notifications_enabled is True
    assert preference.timezone == "Africa/Algiers"
    assert preference.supplement_reminder_time == time(8, 30)


def test_supplement_reminder_sends_when_supplement_not_taken(user):
    supplement = Supplement.objects.create(name="Vitamin D", slug="vitamin-d")
    UserSupplement.objects.create(user=user, supplement=supplement, frequency="daily", active=True)
    DevicePushToken.objects.create(user=user, token="ExponentPushToken[test-token]", platform="android")
    now = timezone.now()
    NotificationPreference.objects.create(
        user=user,
        notifications_enabled=True,
        timezone="UTC",
        supplement_reminder_time=now.time().replace(second=0, microsecond=0),
        water_reminders_enabled=False,
        quiet_hours_start=time(0, 0),
        quiet_hours_end=time(0, 0),
    )

    with patch("apps.notifications.services.urlopen") as urlopen:
        urlopen.return_value.__enter__.return_value.read.return_value = b'{"data":[{"status":"ok"}]}'
        result = send_daily_habit_reminders()

    assert result["sent"] == 1
    log = NotificationLog.objects.get(user=user)
    assert log.notification_type == "supplement_reminder"
    assert log.status == "sent"


def test_registered_token_reminder_is_visible_in_notification_history(authenticated_client, user):
    supplement = Supplement.objects.create(name="Vitamin D", slug="vitamin-d")
    UserSupplement.objects.create(user=user, supplement=supplement, frequency="daily", active=True)
    authenticated_client.post(
        reverse("notification-register-token"),
        {"token": "ExponentPushToken[test-token]", "platform": "android", "device_id": "device-1"},
        format="json",
    )
    now = timezone.now()
    NotificationPreference.objects.create(
        user=user,
        notifications_enabled=True,
        timezone="UTC",
        supplement_reminder_time=now.time().replace(second=0, microsecond=0),
        water_reminders_enabled=False,
        quiet_hours_start=time(0, 0),
        quiet_hours_end=time(0, 0),
    )

    with patch("apps.notifications.services.urlopen") as urlopen:
        urlopen.return_value.__enter__.return_value.read.return_value = b'{"data":[{"status":"ok"}]}'
        send_daily_habit_reminders()

    response = authenticated_client.get(reverse("notification-history"))

    assert response.status_code == 200
    assert response.data[0]["notification_type"] == "supplement_reminder"
    assert response.data[0]["title"] == "Supplement reminder"
    assert response.data[0]["data"] == {"screen": "tracking", "type": "supplement_reminder"}
    log = NotificationLog.objects.get(user=user)
    assert log.provider_response["expo"] == {"data": [{"status": "ok"}]}


def test_water_reminder_skips_when_goal_met(user):
    DevicePushToken.objects.create(user=user, token="ExponentPushToken[test-token]", platform="ios")
    now = timezone.now()
    NotificationPreference.objects.create(
        user=user,
        notifications_enabled=True,
        timezone="UTC",
        supplement_reminders_enabled=False,
        water_morning_time=now.time().replace(second=0, microsecond=0),
        quiet_hours_start=time(0, 0),
        quiet_hours_end=time(0, 0),
    )
    DailyTracking.objects.create(user=user, date=timezone.localdate(), water_ml=2200)

    with patch("apps.notifications.services.urlopen") as urlopen:
        result = send_daily_habit_reminders()

    assert result["sent"] == 0
    assert not urlopen.called
    assert NotificationLog.objects.count() == 0
