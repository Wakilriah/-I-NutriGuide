from rest_framework import serializers

from .models import DevicePushToken, NotificationPreference


class DevicePushTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DevicePushToken
        fields = ["id", "token", "platform", "device_id", "active", "last_seen_at", "created_at"]
        read_only_fields = ["id", "active", "last_seen_at", "created_at"]

    def validate_token(self, value):
        if not value.startswith("ExponentPushToken[") and not value.startswith("ExpoPushToken["):
            raise serializers.ValidationError("Token must be an Expo push token.")
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        token, _created = DevicePushToken.objects.update_or_create(
            token=validated_data["token"],
            defaults={
                "user": user,
                "platform": validated_data["platform"],
                "device_id": validated_data.get("device_id", ""),
                "active": True,
            },
        )
        return token


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            "notifications_enabled",
            "timezone",
            "supplement_reminders_enabled",
            "supplement_reminder_time",
            "water_reminders_enabled",
            "water_morning_time",
            "water_afternoon_time",
            "water_evening_time",
            "quiet_hours_start",
            "quiet_hours_end",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_timezone(self, value):
        from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise serializers.ValidationError("Unsupported timezone.") from exc
        return value
