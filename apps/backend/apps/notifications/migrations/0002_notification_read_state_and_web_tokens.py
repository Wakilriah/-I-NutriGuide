from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="devicepushtoken",
            name="token",
            field=models.TextField(unique=True),
        ),
        migrations.AddField(
            model_name="notificationlog",
            name="read_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
