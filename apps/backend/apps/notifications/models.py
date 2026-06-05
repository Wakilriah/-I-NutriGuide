from django.conf import settings
from django.db import models


class DevicePushToken(models.Model):
    class Platform(models.TextChoices):
        IOS = "ios", "iOS"
        ANDROID = "android", "Android"
        WEB = "web", "Web"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="push_tokens", on_delete=models.CASCADE)
    token = models.CharField(max_length=255, unique=True)
    platform = models.CharField(max_length=20, choices=Platform.choices)
    device_id = models.CharField(max_length=120, blank=True)
    active = models.BooleanField(default=True)
    last_seen_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-last_seen_at"]
        indexes = [
            models.Index(fields=["user", "active"], name="notif_token_user_active_idx"),
            models.Index(fields=["token"], name="notif_token_token_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.user_id} {self.platform} token"


class NotificationPreference(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, related_name="notification_preference", on_delete=models.CASCADE)
    notifications_enabled = models.BooleanField(default=False)
    timezone = models.CharField(max_length=64, default="UTC")
    supplement_reminders_enabled = models.BooleanField(default=True)
    supplement_reminder_time = models.TimeField(default="09:00")
    water_reminders_enabled = models.BooleanField(default=True)
    water_morning_time = models.TimeField(default="11:00")
    water_afternoon_time = models.TimeField(default="15:00")
    water_evening_time = models.TimeField(default="19:00")
    quiet_hours_start = models.TimeField(default="21:00")
    quiet_hours_end = models.TimeField(default="08:00")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["user_id"]

    def __str__(self) -> str:
        return f"{self.user_id} notification preferences"


class NotificationLog(models.Model):
    class NotificationType(models.TextChoices):
        FOOD_REMINDER = "food_reminder", "Food reminder"
        SUPPLEMENT_REMINDER = "supplement_reminder", "Supplement reminder"
        WATER_REMINDER = "water_reminder", "Water reminder"
        RECOMMENDATION_READY = "recommendation_ready", "Recommendation ready"
        GENERAL = "general", "General"
        TEST = "test", "Test"

    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"
        SKIPPED = "skipped", "Skipped"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="push_notification_logs", on_delete=models.CASCADE)
    notification_type = models.CharField(max_length=40, choices=NotificationType.choices)
    title = models.CharField(max_length=120)
    body = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.QUEUED)
    provider_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "notification_type", "created_at"], name="notif_log_user_type_idx"),
            models.Index(fields=["status"], name="notif_log_status_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.user_id} {self.notification_type} {self.status}"
