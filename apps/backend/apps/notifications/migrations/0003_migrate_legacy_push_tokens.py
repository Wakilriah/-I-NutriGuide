from django.db import migrations


def migrate_legacy_push_tokens(apps, schema_editor):
    UserProfile = apps.get_model("accounts", "UserProfile")
    DevicePushToken = apps.get_model("notifications", "DevicePushToken")
    NotificationPreference = apps.get_model("notifications", "NotificationPreference")

    for profile in UserProfile.objects.exclude(expo_push_token="").iterator():
        DevicePushToken.objects.update_or_create(
            token=profile.expo_push_token,
            defaults={
                "user_id": profile.user_id,
                "platform": "android",
                "device_id": "legacy-profile-token",
                "active": True,
            },
        )
        NotificationPreference.objects.update_or_create(
            user_id=profile.user_id,
            defaults={
                "notifications_enabled": True,
                "timezone": profile.timezone or "UTC",
            },
        )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0005_userprofile_timezone"),
        ("notifications", "0002_notification_read_state_and_web_tokens"),
    ]

    operations = [
        migrations.RunPython(migrate_legacy_push_tokens, migrations.RunPython.noop),
    ]
