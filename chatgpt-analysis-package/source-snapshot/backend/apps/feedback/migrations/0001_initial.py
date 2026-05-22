# Generated for the I-NutriGuide Sprint 6 feedback foundation.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("recommendations", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="RecommendationFeedback",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("rating", models.PositiveSmallIntegerField()),
                ("is_helpful", models.BooleanField(default=True)),
                ("comment", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("recommendation_item", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="feedback", to="recommendations.recommendationitem")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="recommendation_feedback", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-created_at"],
                "constraints": [models.UniqueConstraint(fields=("user", "recommendation_item"), name="unique_feedback_per_item_user")],
            },
        ),
    ]

