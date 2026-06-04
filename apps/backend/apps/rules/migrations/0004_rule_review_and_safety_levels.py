from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("rules", "0003_association_rule_scores"),
    ]

    operations = [
        migrations.AddField(
            model_name="safetyconstraint",
            name="safety_level",
            field=models.CharField(
                choices=[("LOW", "Low"), ("MEDIUM", "Medium"), ("HIGH", "High")],
                default="MEDIUM",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="minedassociationrule",
            name="admin_note",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="minedassociationrule",
            name="review_status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("approved", "Approved"),
                    ("rejected", "Rejected"),
                    ("needs_review", "Needs review"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="minedassociationrule",
            name="safety_conflict_details",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="minedassociationrule",
            name="safety_conflict_status",
            field=models.CharField(default="unchecked", max_length=40),
        ),
    ]
