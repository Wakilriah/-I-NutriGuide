from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("accounts", "0002_userprofile_survey_fields"),
    ]

    operations = [
        migrations.AlterField(
            model_name="userprofile",
            name="diet_type",
            field=models.CharField(
                choices=[
                    ("none", "None"),
                    ("vegetarian", "Vegetarian"),
                    ("vegan", "Vegan"),
                    ("halal", "Halal"),
                    ("pescatarian", "Pescatarian"),
                    ("keto", "Keto"),
                    ("mediterranean", "Mediterranean"),
                    ("gluten_free", "Gluten free"),
                    ("lactose_free", "Lactose free"),
                ],
                default="none",
                max_length=30,
            ),
        ),
        migrations.CreateModel(
            name="DailyTracking",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField()),
                ("weight_kg", models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ("water_ml", models.PositiveIntegerField(default=0)),
                ("calories", models.PositiveIntegerField(default=0)),
                ("protein_g", models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ("fiber_g", models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ("steps", models.PositiveIntegerField(default=0)),
                ("supplements_taken", models.JSONField(blank=True, default=list)),
                ("goals_completed", models.BooleanField(default=False)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="daily_tracking", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-date"],
                "constraints": [models.UniqueConstraint(fields=("user", "date"), name="unique_daily_tracking_per_user")],
            },
        ),
    ]
