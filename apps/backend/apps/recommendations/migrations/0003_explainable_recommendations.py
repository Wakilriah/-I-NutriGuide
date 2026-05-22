from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("recommendations", "0002_savedrecommendationitem"),
    ]

    operations = [
        migrations.AddField(
            model_name="recommendationitem",
            name="confidence_score",
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name="recommendationitem",
            name="confidence_label",
            field=models.CharField(default="Medium", max_length=20),
        ),
        migrations.AddField(
            model_name="recommendationitem",
            name="score_breakdown",
            field=models.JSONField(default=dict),
        ),
        migrations.AddField(
            model_name="recommendationitem",
            name="explanation_details",
            field=models.JSONField(default=dict),
        ),
    ]
