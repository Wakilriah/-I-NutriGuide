from datetime import datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from celery import shared_task
from django.utils import timezone

from apps.accounts.models import DailyTracking
from apps.supplements.models import UserSupplement

from .models import NotificationLog, NotificationPreference
from .services import send_push_notification


WATER_TARGET_ML = 2200
REMINDER_WINDOW_MINUTES = 15


@shared_task
def send_daily_habit_reminders():
    sent = 0
    for preference in NotificationPreference.objects.select_related("user").filter(notifications_enabled=True):
        sent += _send_due_supplement_reminder(preference)
        sent += _send_due_water_reminder(preference)
    return {"sent": sent}


def _send_due_supplement_reminder(preference: NotificationPreference) -> int:
    if not preference.supplement_reminders_enabled or not _is_due_now(preference, preference.supplement_reminder_time):
        return 0
    today = _local_date(preference)
    if _already_sent(preference.user, NotificationLog.NotificationType.SUPPLEMENT_REMINDER, today):
        return 0
    active_supplements = list(
        UserSupplement.objects.filter(user=preference.user, active=True).values_list("supplement__name", flat=True)
    )
    if not active_supplements:
        return 0
    tracking = DailyTracking.objects.filter(user=preference.user, date=today).first()
    taken = set(tracking.supplements_taken if tracking else [])
    remaining = [name for name in active_supplements if name not in taken]
    if not remaining:
        return 0
    names = ", ".join(remaining[:3])
    suffix = "" if len(remaining) <= 3 else f" and {len(remaining) - 3} more"
    send_push_notification(
        preference.user,
        notification_type=NotificationLog.NotificationType.SUPPLEMENT_REMINDER,
        title="Supplement reminder",
        body=f"Time to take {names}{suffix}.",
        data={"screen": "tracking", "type": "supplement_reminder"},
    )
    return 1


def _send_due_water_reminder(preference: NotificationPreference) -> int:
    if not preference.water_reminders_enabled:
        return 0
    due_slots = [
        ("morning", preference.water_morning_time),
        ("afternoon", preference.water_afternoon_time),
        ("evening", preference.water_evening_time),
    ]
    due_slot = next((slot for slot, value in due_slots if _is_due_now(preference, value)), None)
    if due_slot is None:
        return 0
    today = _local_date(preference)
    notification_type = f"{NotificationLog.NotificationType.WATER_REMINDER}:{due_slot}"
    if _already_sent(preference.user, notification_type, today):
        return 0
    tracking = DailyTracking.objects.filter(user=preference.user, date=today).first()
    water_ml = tracking.water_ml if tracking else 0
    if water_ml >= WATER_TARGET_ML:
        return 0
    remaining = max(WATER_TARGET_ML - water_ml, 0)
    send_push_notification(
        preference.user,
        notification_type=notification_type,
        title="Water reminder",
        body=f"You are {remaining} ml below today's water goal. Log a glass when you can.",
        data={"screen": "tracking", "type": "water_reminder"},
    )
    return 1


def _is_due_now(preference: NotificationPreference, reminder_time) -> bool:
    now = _local_now(preference)
    if _in_quiet_hours(now.time(), preference.quiet_hours_start, preference.quiet_hours_end):
        return False
    reminder_at = now.replace(hour=reminder_time.hour, minute=reminder_time.minute, second=0, microsecond=0)
    return reminder_at <= now < reminder_at + timedelta(minutes=REMINDER_WINDOW_MINUTES)


def _already_sent(user, notification_type: str, local_date) -> bool:
    start = timezone.make_aware(datetime.combine(local_date, datetime.min.time()))
    end = start + timedelta(days=1)
    return NotificationLog.objects.filter(
        user=user,
        notification_type=notification_type,
        created_at__gte=start,
        created_at__lt=end,
        status__in=[NotificationLog.Status.SENT, NotificationLog.Status.QUEUED],
    ).exists()


def _local_now(preference: NotificationPreference):
    try:
        return timezone.now().astimezone(ZoneInfo(preference.timezone))
    except ZoneInfoNotFoundError:
        return timezone.now()


def _local_date(preference: NotificationPreference):
    return _local_now(preference).date()


def _in_quiet_hours(value, start, end) -> bool:
    if start == end:
        return False
    if start < end:
        return start <= value < end
    return value >= start or value < end
