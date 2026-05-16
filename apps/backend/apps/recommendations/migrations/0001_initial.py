# Generated for the I-NutriGuide Sprint 5 recommendation foundation.

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models

import apps.recommendations.models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("foods", "0001_initial"),
        ("supplements", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="RecommendationRun",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("input_snapshot", models.JSONField(default=dict)),
                ("profile_snapshot", models.JSONField(default=dict)),
                ("supplements_snapshot", models.JSONField(default=list)),
                ("disclaimer", models.TextField(default=apps.recommendations.models.DISCLAIMER)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="recommendation_runs", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [models.Index(fields=["user", "created_at"], name="recommenda_user_id_ddc3ad_idx")],
            },
        ),
        migrations.CreateModel(
            name="RecommendationItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("score", models.FloatField()),
                ("nutrient_score", models.FloatField(default=0)),
                ("rule_score", models.FloatField(default=0)),
                ("preference_score", models.FloatField(default=1)),
                ("matched_nutrients", models.JSONField(default=list)),
                ("matched_rules", models.JSONField(default=list)),
                ("explanation", models.TextField()),
                ("warnings", models.JSONField(default=list)),
                ("tags", models.JSONField(default=list)),
                ("rank", models.PositiveIntegerField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("food", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="recommendation_items", to="foods.food")),
                ("run", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="recommendations.recommendationrun")),
                ("supplement", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="recommendation_items", to="supplements.supplement")),
            ],
            options={
                "ordering": ["rank"],
                "constraints": [
                    models.UniqueConstraint(fields=("run", "rank"), name="unique_recommendation_rank_per_run"),
                    models.UniqueConstraint(fields=("run", "food"), name="unique_recommended_food_per_run"),
                ],
            },
        ),
    ]

