# Generated for the I-NutriGuide Sprint 3 association rules foundation.

from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="AssociationRule",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("antecedent_type", models.CharField(choices=[("supplement", "Supplement"), ("nutrient", "Nutrient"), ("food", "Food"), ("category", "Category")], max_length=50)),
                ("antecedent_slug", models.CharField(max_length=150)),
                ("consequent_type", models.CharField(choices=[("supplement", "Supplement"), ("nutrient", "Nutrient"), ("food", "Food"), ("category", "Category")], max_length=50)),
                ("consequent_slug", models.CharField(max_length=150)),
                ("support", models.FloatField(default=0)),
                ("confidence", models.FloatField(default=0)),
                ("lift", models.FloatField(default=0)),
                ("explanation", models.TextField()),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["antecedent_type", "antecedent_slug", "consequent_type", "consequent_slug"],
                "indexes": [
                    models.Index(fields=["antecedent_slug"], name="rules_assoc_anteced_c00a27_idx"),
                    models.Index(fields=["consequent_slug"], name="rules_assoc_consequ_d728d5_idx"),
                    models.Index(fields=["is_active"], name="rules_assoc_is_acti_a6dff9_idx"),
                ],
                "constraints": [
                    models.UniqueConstraint(fields=("antecedent_type", "antecedent_slug", "consequent_type", "consequent_slug"), name="unique_association_rule")
                ],
            },
        ),
    ]

