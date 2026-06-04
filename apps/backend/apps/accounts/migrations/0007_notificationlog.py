from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("accounts", "0006_dailytracking_food_entries"),
    ]

    operations = [
        migrations.CreateModel(
            name="NotificationLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "notification_type",
                    models.CharField(
                        choices=[
                            ("food_reminder", "Food reminder"),
                            ("supplement_reminder", "Supplement reminder"),
                            ("recommendation_ready", "Recommendation ready"),
                            ("general", "General"),
                        ],
                        default="general",
                        max_length=40,
                    ),
                ),
                ("title", models.CharField(max_length=160)),
                ("body", models.TextField()),
                ("data", models.JSONField(blank=True, default=dict)),
                ("sent_at", models.DateTimeField(auto_now_add=True)),
                ("read_at", models.DateTimeField(blank=True, null=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="notification_logs", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-sent_at"],
            },
        ),
        migrations.AddIndex(
            model_name="notificationlog",
            index=models.Index(fields=["user", "sent_at"], name="notif_log_user_sent_idx"),
        ),
        migrations.AddIndex(
            model_name="notificationlog",
            index=models.Index(fields=["notification_type"], name="notif_log_type_idx"),
        ),
    ]
