# Generated manually for notification reminders.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="DevicePushToken",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("token", models.CharField(max_length=255, unique=True)),
                ("platform", models.CharField(choices=[("ios", "iOS"), ("android", "Android"), ("web", "Web")], max_length=20)),
                ("device_id", models.CharField(blank=True, max_length=120)),
                ("active", models.BooleanField(default=True)),
                ("last_seen_at", models.DateTimeField(auto_now=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="push_tokens", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-last_seen_at"]},
        ),
        migrations.CreateModel(
            name="NotificationPreference",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("notifications_enabled", models.BooleanField(default=False)),
                ("timezone", models.CharField(default="UTC", max_length=64)),
                ("supplement_reminders_enabled", models.BooleanField(default=True)),
                ("supplement_reminder_time", models.TimeField(default="09:00")),
                ("water_reminders_enabled", models.BooleanField(default=True)),
                ("water_morning_time", models.TimeField(default="11:00")),
                ("water_afternoon_time", models.TimeField(default="15:00")),
                ("water_evening_time", models.TimeField(default="19:00")),
                ("quiet_hours_start", models.TimeField(default="21:00")),
                ("quiet_hours_end", models.TimeField(default="08:00")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="notification_preference", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["user_id"]},
        ),
        migrations.CreateModel(
            name="NotificationLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("notification_type", models.CharField(choices=[("supplement_reminder", "Supplement reminder"), ("water_reminder", "Water reminder"), ("test", "Test")], max_length=40)),
                ("title", models.CharField(max_length=120)),
                ("body", models.CharField(max_length=255)),
                ("status", models.CharField(choices=[("queued", "Queued"), ("sent", "Sent"), ("failed", "Failed"), ("skipped", "Skipped")], default="queued", max_length=20)),
                ("provider_response", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="push_notification_logs", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(model_name="devicepushtoken", index=models.Index(fields=["user", "active"], name="notif_token_user_active_idx")),
        migrations.AddIndex(model_name="devicepushtoken", index=models.Index(fields=["token"], name="notif_token_token_idx")),
        migrations.AddIndex(model_name="notificationlog", index=models.Index(fields=["user", "notification_type", "created_at"], name="notif_log_user_type_idx")),
        migrations.AddIndex(model_name="notificationlog", index=models.Index(fields=["status"], name="notif_log_status_idx")),
    ]
