from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("rules", "0002_association_dataset"),
    ]

    operations = [
        migrations.AddField(
            model_name="associationrule",
            name="score",
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name="minedassociationrule",
            name="score",
            field=models.FloatField(default=0),
        ),
    ]
