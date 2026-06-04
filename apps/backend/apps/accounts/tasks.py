import logging
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from celery import shared_task
from django.contrib.auth import get_user_model
from django.utils import timezone
from exponent_server_sdk import DeviceNotRegisteredError, PushClient, PushMessage, PushServerError

from apps.accounts.models import DailyTracking, NotificationLog
from apps.supplements.models import UserSupplement

logger = logging.getLogger(__name__)
User = get_user_model()


def send_user_push(user, *, title, body, data=None, notification_type=NotificationLog.NotificationType.GENERAL):
    data = data or {}
    NotificationLog.objects.create(user=user, title=title, body=body, data=data, notification_type=notification_type)

    token = getattr(user.profile, "expo_push_token", "")
    if not token:
        return False

    try:
        PushClient().publish(PushMessage(to=token, title=title, body=body, data=data))
        return True
    except PushServerError as exc:
        logger.error(f"PushServerError sending to {user.email}: {exc}")
    except DeviceNotRegisteredError:
        user.profile.expo_push_token = ""
        user.profile.save(update_fields=["expo_push_token"])
        logger.info(f"Cleared invalid push token for {user.email}")
    except Exception as exc:
        logger.error(f"Failed to send push notification to {user.email}: {exc}")
    return False


def _user_local_time(user, now_utc):
    try:
        tz = ZoneInfo(user.profile.timezone or "UTC")
    except ZoneInfoNotFoundError:
        tz = ZoneInfo("UTC")
    return now_utc.astimezone(tz)


def _matches_supplement_time(time_of_day, local_time):
    value = (time_of_day or "").strip().lower()
    time_map = {
        "morning": 8,
        "breakfast": 8,
        "noon": 12,
        "lunch": 12,
        "afternoon": 15,
        "evening": 19,
        "dinner": 19,
        "night": 21,
        "bedtime": 21,
    }
    if value in time_map:
        return local_time.hour == time_map[value] and local_time.minute == 0
    if ":" in value:
        try:
            hour_text, minute_text = value.split(":", 1)
            return local_time.hour == int(hour_text) and local_time.minute == int(minute_text)
        except ValueError:
            return False
    return False


@shared_task
def remind_users_to_track_nutrition():
    """
    Sends local-time reminders for missing food logs and scheduled supplements.
    Runs hourly; each user is evaluated in their configured timezone.
    """
    now_utc = timezone.now()
    users_with_tokens = User.objects.filter(profile__expo_push_token__isnull=False).exclude(profile__expo_push_token="")
    sent_count = 0

    for user in users_with_tokens:
        local_time = _user_local_time(user, now_utc)
        local_date = local_time.date()
        tracking = DailyTracking.objects.filter(user=user, date=local_date).first()
        logged_food = bool(tracking and tracking.calories > 0)

        if local_time.minute == 0 and local_time.hour in {12, 19, 20} and not logged_food:
            if send_user_push(
                user,
                title="Log your food",
                body="Add your latest meal so today's calories and nutrients stay accurate.",
                data={"url": "inutriguide://tabs/log-food"},
                notification_type=NotificationLog.NotificationType.FOOD_REMINDER,
            ):
                sent_count += 1

        taken = set(tracking.supplements_taken if tracking else [])
        for entry in UserSupplement.objects.filter(user=user, active=True).select_related("supplement"):
            if entry.supplement.name in taken or not _matches_supplement_time(entry.time_of_day, local_time):
                continue
            if send_user_push(
                user,
                title=f"Time for {entry.supplement.name}",
                body=f"Take {entry.dose or 'your dose'} {entry.frequency or 'as planned'} and mark it complete.",
                data={"url": "inutriguide://tabs/log-food", "supplement_id": entry.id},
                notification_type=NotificationLog.NotificationType.SUPPLEMENT_REMINDER,
            ):
                sent_count += 1

    return f"Sent reminders to {sent_count} users."
