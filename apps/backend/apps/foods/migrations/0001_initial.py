# Generated for the I-NutriGuide Sprint 3 foods foundation.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("nutrients", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="FoodCategory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100, unique=True)),
                ("slug", models.SlugField(blank=True, max_length=120, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Food",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=150)),
                ("slug", models.SlugField(blank=True, max_length=170, unique=True)),
                ("description", models.TextField(blank=True)),
                ("image_url", models.URLField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("category", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="foods", to="foods.foodcategory")),
            ],
            options={
                "ordering": ["name"],
                "indexes": [
                    models.Index(fields=["slug"], name="foods_food_slug_67fa50_idx"),
                    models.Index(fields=["is_active"], name="foods_food_is_acti_921c68_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="FoodNutrient",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("amount", models.DecimalField(decimal_places=3, max_digits=10)),
                ("unit", models.CharField(max_length=20)),
                ("per_quantity", models.DecimalField(decimal_places=3, default=100, max_digits=10)),
                ("per_unit", models.CharField(default="g", max_length=20)),
                ("food", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="nutrients", to="foods.food")),
                ("nutrient", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="food_sources", to="nutrients.nutrient")),
            ],
            options={
                "ordering": ["nutrient__name"],
                "constraints": [models.UniqueConstraint(fields=("food", "nutrient"), name="unique_nutrient_per_food")],
            },
        ),
    ]

