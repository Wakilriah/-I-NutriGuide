from datetime import datetime, timezone as dt_timezone
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

from apps.accounts.models import DailyTracking, NotificationLog
from apps.supplements.models import UserSupplement


pytestmark = pytest.mark.django_db


@patch("apps.accounts.management.commands.seed_notification_test.timezone.now")
def test_seed_notification_test_creates_repeatable_push_test_account(mock_now):
    mock_now.return_value = datetime(2026, 6, 2, 10, 0, tzinfo=dt_timezone.utc)

    call_command(
        "seed_notification_test",
        "--timezone",
        "Europe/Paris",
        "--expo-token",
        "ExponentPushToken[test]",
    )
    call_command(
        "seed_notification_test",
        "--timezone",
        "Europe/Paris",
        "--expo-token",
        "ExponentPushToken[test]",
    )

    user = get_user_model().objects.get(email="notify.tester@inutriguide.local")
    assert user.check_password("NotifyTest!2026")
    assert user.profile.expo_push_token == "ExponentPushToken[test]"
    assert user.profile.timezone == "Europe/Paris"
    assert NotificationLog.objects.filter(user=user, title="Notification test account ready").count() == 1

    entry = UserSupplement.objects.get(user=user, supplement__slug="notification-test-vitamin-d")
    assert entry.active is True
    assert entry.time_of_day == "12:02"


@patch("apps.accounts.management.commands.seed_notification_test.timezone.now")
def test_seed_notification_test_clears_today_tracking_for_reminder(mock_now):
    mock_now.return_value = datetime(2026, 6, 2, 10, 0, tzinfo=dt_timezone.utc)
    call_command("seed_notification_test", "--skip-history-log")
    user = get_user_model().objects.get(email="notify.tester@inutriguide.local")

    DailyTracking.objects.create(user=user, date=datetime(2026, 6, 2).date(), calories=1500)
    call_command("seed_notification_test", "--skip-history-log")

    assert DailyTracking.objects.filter(user=user, date=datetime(2026, 6, 2).date()).count() == 0
