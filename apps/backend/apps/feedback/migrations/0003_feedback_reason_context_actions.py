from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("feedback", "0002_feedback_learning_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="recommendationfeedback",
            name="reason",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="recommendationfeedback",
            name="supplement_context",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AlterField(
            model_name="recommendationfeedback",
            name="feedback_type",
            field=models.CharField(
                choices=[
                    ("liked", "Liked"),
                    ("disliked", "Disliked"),
                    ("saved", "Saved"),
                    ("tried", "Tried"),
                    ("not_interested", "Not interested"),
                    ("unsafe_for_me", "Unsafe for me"),
                    ("too_expensive", "Too expensive"),
                    ("not_available", "Not available"),
                    ("bad_taste", "Bad taste"),
                    ("allergy_issue", "Allergy issue"),
                    ("do_not_eat", "I do not eat this food"),
                    ("already_tried", "Already tried"),
                    ("good_recommendation", "Good recommendation"),
                    ("helpful", "Helpful"),
                    ("not_helpful", "Not helpful"),
                ],
                default="helpful",
                max_length=30,
            ),
        ),
    ]
