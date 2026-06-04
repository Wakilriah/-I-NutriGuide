from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("recommendations", "0003_explainable_recommendations"),
    ]

    operations = [
        migrations.CreateModel(
            name="RecommendationWeightProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "user_type",
                    models.CharField(
                        choices=[
                            ("new_user", "New user"),
                            ("active_user", "Active user"),
                            ("complex_medical_case", "Complex medical case"),
                        ],
                        max_length=40,
                        unique=True,
                    ),
                ),
                ("alpha", models.FloatField()),
                ("beta", models.FloatField()),
                ("gamma", models.FloatField()),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["user_type"]},
        ),
    ]
