from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("nutrients", "0003_nutrientinteraction"),
    ]

    operations = [
        migrations.AlterField(
            model_name="nutrientinteraction",
            name="interaction_type",
            field=models.CharField(
                choices=[
                    ("enhances", "Enhances"),
                    ("inhibits", "Inhibits"),
                    ("requires", "Requires"),
                    ("should_not_combine", "Should not combine"),
                    ("supports", "Supports"),
                    ("competes_with", "Competes with"),
                ],
                max_length=30,
            ),
        ),
    ]
