import json

from rest_framework import serializers

from .models import DevicePushToken, NotificationCampaign, NotificationLog, NotificationPreference


class DevicePushTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DevicePushToken
        fields = ["id", "token", "platform", "device_id", "active", "last_seen_at", "created_at"]
        read_only_fields = ["id", "active", "last_seen_at", "created_at"]

    def validate(self, attrs):
        token = attrs["token"]
        if attrs["platform"] == DevicePushToken.Platform.WEB:
            try:
                subscription = json.loads(token)
                keys = subscription["keys"]
                if not subscription["endpoint"] or not keys["p256dh"] or not keys["auth"]:
                    raise KeyError
            except (TypeError, ValueError, KeyError):
                raise serializers.ValidationError({"token": "Token must be a valid web push subscription."})
        elif not token.startswith(("ExponentPushToken[", "ExpoPushToken[")):
            raise serializers.ValidationError({"token": "Token must be an Expo push token."})
        return attrs

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


class NotificationLogSerializer(serializers.ModelSerializer):
    data = serializers.SerializerMethodField()
    sent_at = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = NotificationLog
        fields = ["id", "notification_type", "title", "body", "data", "sent_at", "read_at"]
        read_only_fields = fields

    def get_data(self, obj):
        response = obj.provider_response if isinstance(obj.provider_response, dict) else {}
        return response.get("data", {})


class NotificationCampaignSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)

    class Meta:
        model = NotificationCampaign
        fields = [
            "id",
            "audience",
            "recipient_ids",
            "title",
            "body",
            "destination_url",
            "status",
            "recipient_count",
            "sent_count",
            "failed_count",
            "skipped_count",
            "error_message",
            "created_by_email",
            "created_at",
            "started_at",
            "completed_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "recipient_count",
            "sent_count",
            "failed_count",
            "skipped_count",
            "error_message",
            "created_by_email",
            "created_at",
            "started_at",
            "completed_at",
        ]

    def validate_recipient_ids(self, value):
        if not isinstance(value, list) or any(not isinstance(user_id, int) for user_id in value):
            raise serializers.ValidationError("Recipient IDs must be a list of integers.")
        return list(dict.fromkeys(value))

    def validate(self, attrs):
        audience = attrs.get("audience")
        recipient_ids = attrs.get("recipient_ids", [])
        if audience == NotificationCampaign.Audience.SPECIFIC_USERS and not recipient_ids:
            raise serializers.ValidationError({"recipient_ids": "Select at least one user."})
        if audience == NotificationCampaign.Audience.ENABLED_USERS:
            attrs["recipient_ids"] = []
        return attrs
