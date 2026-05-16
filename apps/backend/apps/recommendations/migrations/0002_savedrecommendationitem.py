from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("recommendations", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="SavedRecommendationItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "recommendation_item",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="saves", to="recommendations.recommendationitem"),
                ),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="saved_recommendation_items", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [models.Index(fields=["user", "created_at"], name="recommendat_user_id_68ee96_idx")],
                "constraints": [models.UniqueConstraint(fields=("user", "recommendation_item"), name="unique_saved_recommendation_item_user")],
            },
        ),
    ]
