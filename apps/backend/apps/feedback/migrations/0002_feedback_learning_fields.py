from django.db import migrations, models
import django.db.models.deletion


def backfill_feedback(apps, schema_editor):
    RecommendationFeedback = apps.get_model("feedback", "RecommendationFeedback")
    for feedback in RecommendationFeedback.objects.select_related("recommendation_item"):
        if not feedback.food_id:
            feedback.food_id = feedback.recommendation_item.food_id
        feedback.feedback_type = "helpful" if feedback.is_helpful else "not_helpful"
        feedback.save(update_fields=["food", "feedback_type"])


class Migration(migrations.Migration):
    dependencies = [
        ("feedback", "0001_initial"),
        ("foods", "0002_ciqual_metadata"),
    ]

    operations = [
        migrations.AddField(
            model_name="recommendationfeedback",
            name="context",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="recommendationfeedback",
            name="feedback_type",
            field=models.CharField(choices=[("liked", "Liked"), ("disliked", "Disliked"), ("saved", "Saved"), ("tried", "Tried"), ("not_interested", "Not interested"), ("unsafe_for_me", "Unsafe for me"), ("too_expensive", "Too expensive"), ("bad_taste", "Bad taste"), ("allergy_issue", "Allergy issue"), ("helpful", "Helpful"), ("not_helpful", "Not helpful")], default="helpful", max_length=30),
        ),
        migrations.AddField(
            model_name="recommendationfeedback",
            name="food",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="recommendation_feedback", to="foods.food"),
        ),
        migrations.AlterField(
            model_name="recommendationfeedback",
            name="rating",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.RunPython(backfill_feedback, migrations.RunPython.noop),
    ]
