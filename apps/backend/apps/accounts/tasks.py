from celery import shared_task
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.accounts.models import DailyTracking
from exponent_server_sdk import PushClient, PushMessage, PushServerError, DeviceNotRegisteredError
import logging
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

logger = logging.getLogger(__name__)
User = get_user_model()

@shared_task
def remind_users_to_track_nutrition():
    """
    Sends a push notification to users who haven't logged their daily calories/nutrition yet.
    Only sends at 8 PM (20:00) in the user's local timezone.
    """
    now_utc = timezone.now()
    users_with_tokens = User.objects.filter(profile__expo_push_token__isnull=False).exclude(profile__expo_push_token="")
    sent_count = 0
    
    for user in users_with_tokens:
        try:
            tz = ZoneInfo(user.profile.timezone or "UTC")
        except ZoneInfoNotFoundError:
            tz = ZoneInfo("UTC")
            
        local_time = now_utc.astimezone(tz)
        
        # Only send reminder if it's currently 8 PM locally
        if local_time.hour != 20:
            continue
            
        local_date = local_time.date()
        
        # Check if they have tracked something on their local "today"
        has_tracked = DailyTracking.objects.filter(
            user=user,
            date=local_date,
            calories__gt=0
        ).exists()
        
        if has_tracked:
            continue
            
        token = user.profile.expo_push_token
        try:
            PushClient().publish(
                PushMessage(
                    to=token,
                    title="Daily Nutrition Reminder",
                    body="Don't forget to log your daily calories and nutrition progress! Tap here to open the app.",
                    data={"url": "inutriguide://tabs/tracking"},
                )
            )
            sent_count += 1
        except PushServerError as exc:
            logger.error(f"PushServerError sending to {user.email}: {exc}")
        except DeviceNotRegisteredError:
            # Token is no longer valid, clear it
            user.profile.expo_push_token = ""
            user.profile.save(update_fields=["expo_push_token"])
            logger.info(f"Cleared invalid push token for {user.email}")
        except Exception as exc:
            logger.error(f"Failed to send push notification to {user.email}: {exc}")

    return f"Sent reminders to {sent_count} users."
