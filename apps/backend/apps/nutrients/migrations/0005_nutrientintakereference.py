from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("nutrients", "0004_alter_nutrientinteraction_interaction_type"),
    ]

    operations = [
        migrations.CreateModel(
            name="NutrientIntakeReference",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "reference_type",
                    models.CharField(
                        choices=[
                            ("rda", "Recommended Dietary Allowance"),
                            ("ai", "Adequate Intake"),
                            ("ul", "Tolerable Upper Intake Level"),
                            ("dv", "Daily Value"),
                        ],
                        max_length=20,
                    ),
                ),
                ("life_stage", models.CharField(default="Adults", max_length=120)),
                ("sex", models.CharField(blank=True, max_length=40)),
                ("amount", models.DecimalField(decimal_places=3, max_digits=12)),
                ("unit", models.CharField(max_length=20)),
                ("note", models.TextField(blank=True)),
                ("source", models.CharField(blank=True, max_length=80)),
                ("source_url", models.URLField(blank=True, max_length=500)),
                ("active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "nutrient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="intake_references",
                        to="nutrients.nutrient",
                    ),
                ),
            ],
            options={
                "ordering": ["nutrient__name", "reference_type", "life_stage", "sex"],
            },
        ),
        migrations.AddIndex(
            model_name="nutrientintakereference",
            index=models.Index(fields=["reference_type"], name="nutr_intake_type_idx"),
        ),
        migrations.AddIndex(
            model_name="nutrientintakereference",
            index=models.Index(fields=["active"], name="nutr_intake_active_idx"),
        ),
        migrations.AddConstraint(
            model_name="nutrientintakereference",
            constraint=models.UniqueConstraint(
                fields=("nutrient", "reference_type", "life_stage", "sex"),
                name="unique_nutrient_intake_reference",
            ),
        ),
    ]
