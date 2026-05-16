from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("nutrients", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="nutrient",
            name="original_name_fr",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="nutrient",
            name="source_column",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="nutrient",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        migrations.AddIndex(
            model_name="nutrient",
            index=models.Index(fields=["is_active"], name="nutrients_n_is_acti_4b56a7_idx"),
        ),
    ]
