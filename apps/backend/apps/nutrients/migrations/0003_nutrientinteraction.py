from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("nutrients", "0002_ciqual_metadata"),
    ]

    operations = [
        migrations.CreateModel(
            name="NutrientInteraction",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("source_type", models.CharField(choices=[("supplement", "Supplement"), ("nutrient", "Nutrient"), ("food", "Food")], max_length=20)),
                ("source_key", models.SlugField(max_length=160)),
                ("target_type", models.CharField(choices=[("supplement", "Supplement"), ("nutrient", "Nutrient"), ("food", "Food")], max_length=20)),
                ("target_key", models.SlugField(max_length=160)),
                ("interaction_type", models.CharField(choices=[("enhances", "Enhances"), ("inhibits", "Inhibits"), ("requires", "Requires"), ("should_not_combine", "Should not combine"), ("supports", "Supports")], max_length=30)),
                ("mechanism", models.TextField()),
                ("evidence_level", models.CharField(choices=[("low", "Low"), ("medium", "Medium"), ("high", "High")], default="medium", max_length=20)),
                ("severity", models.CharField(choices=[("info", "Info"), ("caution", "Caution"), ("warning", "Warning")], default="info", max_length=20)),
                ("active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["source_type", "source_key", "target_type", "target_key"],
            },
        ),
        migrations.AddIndex(
            model_name="nutrientinteraction",
            index=models.Index(fields=["source_type", "source_key"], name="nutr_inter_source_idx"),
        ),
        migrations.AddIndex(
            model_name="nutrientinteraction",
            index=models.Index(fields=["target_type", "target_key"], name="nutr_inter_target_idx"),
        ),
        migrations.AddIndex(
            model_name="nutrientinteraction",
            index=models.Index(fields=["interaction_type"], name="nutr_inter_type_idx"),
        ),
        migrations.AddIndex(
            model_name="nutrientinteraction",
            index=models.Index(fields=["severity"], name="nutr_inter_severity_idx"),
        ),
        migrations.AddIndex(
            model_name="nutrientinteraction",
            index=models.Index(fields=["active"], name="nutr_inter_active_idx"),
        ),
        migrations.AddConstraint(
            model_name="nutrientinteraction",
            constraint=models.UniqueConstraint(fields=("source_type", "source_key", "target_type", "target_key", "interaction_type"), name="unique_nutrient_interaction"),
        ),
    ]
