from django.db import migrations


PDF_HYBRID_WEIGHTS = {
    "new_user": {"alpha": 0.60, "beta": 0.30, "gamma": 0.10},
    "active_user": {"alpha": 0.40, "beta": 0.30, "gamma": 0.30},
    "complex_medical_case": {"alpha": 0.50, "beta": 0.35, "gamma": 0.15},
}

PREVIOUS_HYBRID_WEIGHTS = {
    "new_user": {"alpha": 0.25, "beta": 0.60, "gamma": 0.15},
    "active_user": {"alpha": 0.25, "beta": 0.60, "gamma": 0.15},
    "complex_medical_case": {"alpha": 0.25, "beta": 0.60, "gamma": 0.15},
}


def set_weights(apps, weights):
    RecommendationWeightProfile = apps.get_model("recommendations", "RecommendationWeightProfile")
    for user_type, values in weights.items():
        RecommendationWeightProfile.objects.update_or_create(
            user_type=user_type,
            defaults={**values, "is_active": True},
        )


def apply_pdf_weights(apps, schema_editor):
    set_weights(apps, PDF_HYBRID_WEIGHTS)


def restore_previous_weights(apps, schema_editor):
    set_weights(apps, PREVIOUS_HYBRID_WEIGHTS)


class Migration(migrations.Migration):
    dependencies = [
        ("recommendations", "0004_recommendation_weight_profile"),
    ]

    operations = [
        migrations.RunPython(apply_pdf_weights, restore_previous_weights),
    ]
