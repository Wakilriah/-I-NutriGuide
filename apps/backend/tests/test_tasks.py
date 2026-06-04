from unittest.mock import patch
from datetime import datetime, timezone as dt_timezone
from zoneinfo import ZoneInfo

import pytest
from django.contrib.auth import get_user_model
from apps.accounts.models import DailyTracking, UserProfile
from apps.accounts.tasks import _matches_supplement_time, remind_users_to_track_nutrition

User = get_user_model()

@pytest.fixture
def test_user_ny(db):
    user = User.objects.create_user(email="ny@example.com", password="password")
    UserProfile.objects.create(
        user=user,
        expo_push_token="ExponentPushToken[mock_ny]",
        timezone="America/New_York"
    )
    return user

@pytest.fixture
def test_user_tokyo(db):
    user = User.objects.create_user(email="tokyo@example.com", password="password")
    UserProfile.objects.create(
        user=user,
        expo_push_token="ExponentPushToken[mock_tokyo]",
        timezone="Asia/Tokyo"
    )
    return user

@pytest.mark.django_db
@patch("apps.accounts.tasks.PushClient.publish")
@patch("apps.accounts.tasks.timezone.now")
def test_remind_users_timezone_aware(mock_now, mock_publish, test_user_ny, test_user_tokyo):
    # Set UTC time such that it is exactly 8 PM (20:00) in New York.
    # For America/New_York (assume standard time, UTC-5), 8 PM NY is 1 AM UTC the next day.
    # Example: 2024-01-02 01:00:00 UTC -> 2024-01-01 20:00:00 NY
    mock_utc_time = datetime(2024, 1, 2, 1, 0, 0, tzinfo=dt_timezone.utc)
    mock_now.return_value = mock_utc_time
    
    # Run task
    result = remind_users_to_track_nutrition()
    
    # Should only send to NY user, Tokyo is NOT 8 PM.
    # 01:00 UTC = 10:00 AM Tokyo.
    assert "Sent reminders to 1 users" in result
    mock_publish.assert_called_once()
    call_args = mock_publish.call_args[0][0]
    assert call_args.to == "ExponentPushToken[mock_ny]"

@pytest.mark.django_db
@patch("apps.accounts.tasks.PushClient.publish")
@patch("apps.accounts.tasks.timezone.now")
def test_skips_users_who_tracked(mock_now, mock_publish, test_user_ny):
    # Set UTC time to 8 PM NY
    mock_utc_time = datetime(2024, 1, 2, 1, 0, 0, tzinfo=dt_timezone.utc)
    mock_now.return_value = mock_utc_time
    
    local_date = mock_utc_time.astimezone(ZoneInfo("America/New_York")).date()
    
    # User tracked today
    DailyTracking.objects.create(
        user=test_user_ny,
        date=local_date,
        calories=1500,  # > 0 means tracked
        water_ml=500
    )
    
    result = remind_users_to_track_nutrition()
    
    # Should be 0 since the user already tracked calories
    assert "Sent reminders to 0 users" in result
    mock_publish.assert_not_called()

@pytest.mark.django_db
@patch("apps.accounts.tasks.PushClient.publish")
def test_skips_users_no_token(mock_publish, test_user_ny):
    # Clear token first to avoid mock interference on save()
    test_user_ny.profile.expo_push_token = ""
    test_user_ny.profile.save()
    
    mock_utc_time = datetime(2024, 1, 2, 1, 0, 0, tzinfo=dt_timezone.utc)
    
    with patch("apps.accounts.tasks.timezone.now") as mock_now:
        mock_now.return_value = mock_utc_time
        result = remind_users_to_track_nutrition()
    
    assert "Sent reminders to 0 users" in result
    mock_publish.assert_not_called()


def test_supplement_time_matches_exact_hour_and_minute():
    local_time = datetime(2024, 1, 1, 8, 30, tzinfo=ZoneInfo("UTC"))

    assert _matches_supplement_time("08:30", local_time)
    assert not _matches_supplement_time("08:00", local_time)


def test_named_supplement_time_matches_on_the_hour_only():
    assert _matches_supplement_time("morning", datetime(2024, 1, 1, 8, 0, tzinfo=ZoneInfo("UTC")))
    assert not _matches_supplement_time("morning", datetime(2024, 1, 1, 8, 30, tzinfo=ZoneInfo("UTC")))
