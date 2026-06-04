from datetime import timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import DailyTracking, NotificationLog, UserProfile
from apps.supplements.models import Supplement, UserSupplement


DEFAULT_EMAIL = "notify.tester@inutriguide.local"
DEFAULT_PASSWORD = "NotifyTest!2026"
DEFAULT_NAME = "Notification Tester"
DEFAULT_TIMEZONE = "UTC"


class Command(BaseCommand):
    help = "Seed a reusable account and near-future reminder for notification testing."

    def add_arguments(self, parser):
        parser.add_argument("--email", default=DEFAULT_EMAIL)
        parser.add_argument("--password", default=DEFAULT_PASSWORD)
        parser.add_argument("--name", default=DEFAULT_NAME)
        parser.add_argument("--timezone", default=DEFAULT_TIMEZONE)
        parser.add_argument("--expo-token", default="", help="Optional real Expo push token from a physical device.")
        parser.add_argument(
            "--reminder-offset-minutes",
            type=int,
            default=2,
            help="Schedule the seeded supplement reminder this many minutes from now in the user's timezone.",
        )
        parser.add_argument(
            "--skip-history-log",
            action="store_true",
            help="Do not create the sample notification history row.",
        )

    def handle(self, *args, **options):
        user_model = get_user_model()
        email = options["email"].lower()
        password = options["password"]
        profile_timezone = self._valid_timezone(options["timezone"])
        reminder_offset = max(options["reminder_offset_minutes"], 1)
        reminder_time = self._local_reminder_time(profile_timezone, reminder_offset)

        user, _created = user_model.objects.get_or_create(email=email, defaults={"name": options["name"]})
        user.name = options["name"]
        user.is_active = True
        user.set_password(password)
        user.save(update_fields=["name", "is_active", "password"])

        profile, _created = UserProfile.objects.get_or_create(user=user)
        profile.age = 30
        profile.gender = "female"
        profile.height_cm = 170
        profile.weight_kg = 70
        profile.goal = "general_health"
        profile.activity_level = "moderate"
        profile.timezone = profile_timezone
        if options["expo_token"]:
            profile.expo_push_token = options["expo_token"]
        profile.save()

        supplement, _created = Supplement.objects.get_or_create(
            slug="notification-test-vitamin-d",
            defaults={
                "name": "Notification Test Vitamin D",
                "description": "Seeded supplement used to test push reminder delivery.",
                "common_dose": "1000 IU",
                "is_active": True,
            },
        )
        UserSupplement.objects.update_or_create(
            user=user,
            supplement=supplement,
            defaults={
                "dose": supplement.common_dose or "1000 IU",
                "frequency": "daily",
                "time_of_day": reminder_time,
                "active": True,
            },
        )

        local_date = timezone.now().astimezone(ZoneInfo(profile_timezone)).date()
        DailyTracking.objects.filter(user=user, date=local_date).delete()

        if not options["skip_history_log"]:
            log = NotificationLog.objects.filter(user=user, title="Notification test account ready").first()
            if log is None:
                NotificationLog.objects.create(
                    user=user,
                    notification_type=NotificationLog.NotificationType.GENERAL,
                    title="Notification test account ready",
                    body="This seeded notification proves the history screen is connected.",
                    data={"url": "inutriguide://tabs/notifications"},
                )
            else:
                log.notification_type = NotificationLog.NotificationType.GENERAL
                log.body = "This seeded notification proves the history screen is connected."
                log.data = {"url": "inutriguide://tabs/notifications"}
                log.save(update_fields=["notification_type", "body", "data"])

        self.stdout.write(self.style.SUCCESS("Seeded notification test account."))
        self.stdout.write(f"Email: {email}")
        self.stdout.write(f"Password: {password}")
        self.stdout.write(f"Timezone: {profile_timezone}")
        self.stdout.write(f"Supplement reminder time: {reminder_time}")
        if profile.expo_push_token:
            self.stdout.write("Expo token: saved")
            self.stdout.write("Run now: python manage.py test_push " + email)
            self.stdout.write("Or wait for celery beat to send the seeded supplement reminder.")
        else:
            self.stdout.write("Expo token: not saved yet")
            self.stdout.write("Log in on a physical mobile device first, then rerun this command or use test_push.")

    def _valid_timezone(self, value):
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError:
            self.stdout.write(self.style.WARNING(f"Unknown timezone '{value}', using UTC."))
            return DEFAULT_TIMEZONE
        return value

    def _local_reminder_time(self, profile_timezone, offset_minutes):
        local_time = timezone.now().astimezone(ZoneInfo(profile_timezone)) + timedelta(minutes=offset_minutes)
        return local_time.strftime("%H:%M")
