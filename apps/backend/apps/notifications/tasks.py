from datetime import datetime, time, timedelta
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
    if not preference.supplement_reminders_enabled:
        return 0
    now = _local_now(preference)
    if _in_quiet_hours(now.time(), preference.quiet_hours_start, preference.quiet_hours_end):
        return 0
    today = now.date()
    tracking = DailyTracking.objects.filter(user=preference.user, date=today).first()
    taken = set(tracking.supplements_taken if tracking else [])
    due_by_slot: dict[str, list[UserSupplement]] = {}
    active_supplements = UserSupplement.objects.filter(user=preference.user, active=True).select_related("supplement")
    for entry in active_supplements:
        if entry.supplement.name in taken or not _supplement_is_due_today(entry, now):
            continue
        for reminder_time in _supplement_reminder_times(entry.time_of_day, preference.supplement_reminder_time):
            if _time_is_due(now, reminder_time):
                due_by_slot.setdefault(reminder_time.strftime("%H:%M"), []).append(entry)

    sent = 0
    for slot, entries in due_by_slot.items():
        if _already_sent(preference.user, NotificationLog.NotificationType.SUPPLEMENT_REMINDER, today, slot=slot):
            continue
        names = ", ".join(entry.supplement.name for entry in entries[:3])
        suffix = "" if len(entries) <= 3 else f" and {len(entries) - 3} more"
        log = send_push_notification(
            preference.user,
            notification_type=NotificationLog.NotificationType.SUPPLEMENT_REMINDER,
            title="Supplement reminder",
            body=f"Time to take {names}{suffix}.",
            data={
                "url": "inutriguide://tabs/tracking",
                "screen": "tracking",
                "type": "supplement_reminder",
                "slot": slot,
                "supplement_ids": [entry.id for entry in entries],
            },
        )
        sent += int(log.status == NotificationLog.Status.SENT)
    return sent


def _supplement_is_due_today(entry: UserSupplement, now) -> bool:
    frequency = (entry.frequency or "daily").strip().lower()
    if frequency == "as needed":
        return False
    if frequency == "weekly":
        return entry.created_at.astimezone(now.tzinfo).weekday() == now.weekday()
    return True


def _supplement_reminder_times(value: str, fallback: time) -> list[time]:
    named_times = {
        "morning": time(8, 0),
        "breakfast": time(8, 0),
        "noon": time(12, 0),
        "lunch": time(12, 0),
        "afternoon": time(15, 0),
        "evening": time(19, 0),
        "dinner": time(19, 0),
        "night": time(21, 0),
        "bedtime": time(21, 0),
    }
    parsed = []
    for raw_value in (value or "").split(","):
        token = raw_value.strip().lower()
        if not token:
            continue
        if token in named_times:
            parsed.append(named_times[token])
            continue
        try:
            hour_text, minute_text = token.split(":", 1)
            parsed.append(time(int(hour_text), int(minute_text)))
        except (TypeError, ValueError):
            continue
    return list(dict.fromkeys(parsed or [fallback]))


def _time_is_due(now, reminder_time: time) -> bool:
    reminder_at = now.replace(hour=reminder_time.hour, minute=reminder_time.minute, second=0, microsecond=0)
    return reminder_at <= now < reminder_at + timedelta(minutes=REMINDER_WINDOW_MINUTES)


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
    notification_type = NotificationLog.NotificationType.WATER_REMINDER
    if _already_sent(preference.user, notification_type, today, slot=due_slot):
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
        data={"screen": "tracking", "type": "water_reminder", "slot": due_slot},
    )
    return 1


def _is_due_now(preference: NotificationPreference, reminder_time) -> bool:
    now = _local_now(preference)
    if _in_quiet_hours(now.time(), preference.quiet_hours_start, preference.quiet_hours_end):
        return False
    return _time_is_due(now, reminder_time)


def _already_sent(user, notification_type: str, local_date, *, slot: str | None = None) -> bool:
    preference = getattr(user, "notification_preference", None)
    tz = _timezone_for_preference(preference)
    start = datetime.combine(local_date, time.min, tzinfo=tz).astimezone(ZoneInfo("UTC"))
    end = start + timedelta(days=1)
    queryset = NotificationLog.objects.filter(
        user=user,
        notification_type=notification_type,
        created_at__gte=start,
        created_at__lt=end,
        status__in=[NotificationLog.Status.SENT, NotificationLog.Status.QUEUED],
    )
    if slot:
        queryset = queryset.filter(provider_response__data__slot=slot)
    return queryset.exists()


def _local_now(preference: NotificationPreference):
    try:
        return timezone.now().astimezone(_timezone_for_preference(preference))
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


def _timezone_for_preference(preference: NotificationPreference | None):
    if preference is None:
        return ZoneInfo("UTC")
    return ZoneInfo(preference.timezone)
