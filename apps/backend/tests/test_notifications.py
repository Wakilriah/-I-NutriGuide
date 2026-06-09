import json
from datetime import datetime, time, timezone as dt_timezone
from unittest.mock import patch

import pytest
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import DailyTracking
from apps.notifications.models import DevicePushToken, NotificationLog, NotificationPreference
from apps.notifications.services import send_push_notification
from apps.notifications.tasks import send_daily_habit_reminders
from apps.recommendations.models import RecommendationRun
from apps.recommendations.tasks import generate_recommendations_for_user
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
    assert response.data[0]["data"]["url"] == "inutriguide://tabs/tracking"
    assert response.data[0]["data"]["screen"] == "tracking"
    assert response.data[0]["data"]["slot"] == now.strftime("%H:%M")
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


def test_supplement_reminders_use_each_saved_time_and_allow_multiple_daily_slots(user):
    supplement = Supplement.objects.create(name="Vitamin D", slug="vitamin-d")
    UserSupplement.objects.create(
        user=user,
        supplement=supplement,
        frequency="twice daily",
        time_of_day="08:00, 12:00",
        active=True,
    )
    DevicePushToken.objects.create(user=user, token="ExponentPushToken[test-token]", platform="android")
    NotificationPreference.objects.create(
        user=user,
        notifications_enabled=True,
        timezone="UTC",
        supplement_reminder_time=time(9, 0),
        water_reminders_enabled=False,
        quiet_hours_start=time(0, 0),
        quiet_hours_end=time(0, 0),
    )

    with patch("apps.notifications.tasks.timezone.now") as now, patch("apps.notifications.services.urlopen") as urlopen:
        urlopen.return_value.__enter__.return_value.read.return_value = b'{"data":[{"status":"ok"}]}'
        now.return_value = datetime(2026, 6, 8, 8, 7, tzinfo=dt_timezone.utc)
        morning = send_daily_habit_reminders()
        now.return_value = datetime(2026, 6, 8, 12, 7, tzinfo=dt_timezone.utc)
        noon = send_daily_habit_reminders()

    assert morning["sent"] == 1
    assert noon["sent"] == 1
    assert set(NotificationLog.objects.values_list("provider_response__data__slot", flat=True)) == {"08:00", "12:00"}


def test_push_uses_notification_channel_and_marks_expo_ticket_error_failed(user):
    DevicePushToken.objects.create(user=user, token="ExponentPushToken[test-token]", platform="android")

    with patch("apps.notifications.services.urlopen") as urlopen:
        urlopen.return_value.__enter__.return_value.read.return_value = (
            b'{"data":[{"status":"error","message":"Invalid credentials","details":{"error":"InvalidCredentials"}}]}'
        )
        log = send_push_notification(
            user,
            notification_type=NotificationLog.NotificationType.RECOMMENDATION_READY,
            title="Recommendations ready",
            body="Your plan is ready.",
        )

    messages = json.loads(urlopen.call_args.args[0].data.decode("utf-8"))
    assert messages[0]["channelId"] == "recommendations"
    assert log.status == NotificationLog.Status.FAILED
    assert log.sent_at is None


def test_background_recommendation_generation_sends_ready_notification(user):
    DevicePushToken.objects.create(user=user, token="ExponentPushToken[test-token]", platform="android")
    run = RecommendationRun.objects.create(user=user)

    with (
        patch("apps.recommendations.tasks.generate_recommendations", return_value=run),
        patch("apps.recommendations.tasks.get_recommendation_cache_key", return_value="recommendations:test"),
        patch("apps.recommendations.tasks.set_cached_recommendations"),
        patch("apps.notifications.services.urlopen") as urlopen,
    ):
        urlopen.return_value.__enter__.return_value.read.return_value = b'{"data":[{"status":"ok"}]}'
        result = generate_recommendations_for_user(user.id)

    log = NotificationLog.objects.get(user=user, notification_type=NotificationLog.NotificationType.RECOMMENDATION_READY)
    assert result == str(run.id)
    assert log.status == NotificationLog.Status.SENT
    assert log.provider_response["data"]["url"] == f"inutriguide://tabs/recommendation-detail/{run.id}"
