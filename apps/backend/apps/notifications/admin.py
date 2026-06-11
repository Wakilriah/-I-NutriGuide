from django.contrib import admin

from .models import DevicePushToken, NotificationCampaign, NotificationLog, NotificationPreference


@admin.register(DevicePushToken)
class DevicePushTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "platform", "active", "device_id", "last_seen_at", "created_at")
    list_filter = ("platform", "active", "created_at", "last_seen_at")
    search_fields = ("user__email", "user__name", "device_id", "token")
    readonly_fields = ("last_seen_at", "created_at")
    list_select_related = ("user",)


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ("user", "notifications_enabled", "supplement_reminders_enabled", "water_reminders_enabled", "timezone", "updated_at")
    list_filter = ("notifications_enabled", "supplement_reminders_enabled", "water_reminders_enabled")
    search_fields = ("user__email", "user__name", "timezone")
    list_select_related = ("user",)


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ("user", "notification_type", "title", "status", "created_at", "sent_at", "read_at")
    list_filter = ("notification_type", "status", "created_at", "read_at")
    search_fields = ("user__email", "user__name", "title", "body")
    readonly_fields = ("created_at", "sent_at")
    list_select_related = ("user",)


@admin.register(NotificationCampaign)
class NotificationCampaignAdmin(admin.ModelAdmin):
    list_display = ("title", "audience", "status", "recipient_count", "sent_count", "failed_count", "skipped_count", "created_by", "created_at")
    list_filter = ("audience", "status", "created_at")
    search_fields = ("title", "body", "created_by__email")
    readonly_fields = ("created_at", "started_at", "completed_at")
    list_select_related = ("created_by",)
