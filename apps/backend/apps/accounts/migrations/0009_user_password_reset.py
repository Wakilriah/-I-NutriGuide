from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0008_user_email_verification_google"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="password_reset_code_hash",
            field=models.CharField(blank=True, max_length=128),
        ),
        migrations.AddField(
            model_name="user",
            name="password_reset_expires_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="password_reset_sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
