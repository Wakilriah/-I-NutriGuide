# Generated for the I-NutriGuide Sprint 3 supplements foundation.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("nutrients", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Supplement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=150)),
                ("slug", models.SlugField(blank=True, max_length=170, unique=True)),
                ("description", models.TextField(blank=True)),
                ("common_dose", models.CharField(blank=True, max_length=100)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["name"],
                "indexes": [
                    models.Index(fields=["slug"], name="supplemen_s_slug_5de8fe_idx"),
                    models.Index(fields=["is_active"], name="supplemen_s_is_act_7b677d_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="SupplementNutrient",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("amount", models.DecimalField(blank=True, decimal_places=3, max_digits=10, null=True)),
                ("unit", models.CharField(blank=True, max_length=20)),
                ("nutrient", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="supplement_sources", to="nutrients.nutrient")),
                ("supplement", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="nutrients", to="supplements.supplement")),
            ],
            options={
                "ordering": ["nutrient__name"],
                "constraints": [models.UniqueConstraint(fields=("supplement", "nutrient"), name="unique_nutrient_per_supplement")],
            },
        ),
        migrations.CreateModel(
            name="UserSupplement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("dose", models.CharField(blank=True, max_length=100)),
                ("frequency", models.CharField(blank=True, max_length=100)),
                ("time_of_day", models.CharField(blank=True, max_length=100)),
                ("active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("supplement", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="user_entries", to="supplements.supplement")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="supplements", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [models.Index(fields=["user", "active"], name="supplemen_u_user_id_210bbc_idx")],
            },
        ),
    ]

