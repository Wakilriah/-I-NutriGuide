from django.contrib.auth import get_user_model
from django.core.management import call_command

import pytest

from apps.accounts.models import Allergy, DislikedFood, UserProfile
from apps.recommendations.services.training import build_user_profile
from apps.supplements.models import UserSupplement


pytestmark = pytest.mark.django_db


def _write_survey_csv(path):
    path.write_text(
        "\n".join(
            [
                "user_id,country,age,gender,height_cm,weight_kg,sports_days_per_week,bmi,allergies__gluten,disease__anemia,disease__no_illness,disliked_foods__red_meat,supplements__iron,supplements__no_supplements,nutritional_goals__weight_loss,nutritional_goals__healthy_lifestyle",
                "101,algeria,34,female,165,68,3,24.98,1,1,0,1,1,0,1,1",
            ]
        ),
        encoding="utf-8",
    )


def test_google_form_import_dry_run_does_not_write_rows(tmp_path):
    csv_path = tmp_path / "survey.csv"
    _write_survey_csv(csv_path)

    call_command("import_google_form_users", str(csv_path), "--dry-run")

    assert get_user_model().objects.count() == 0
    assert UserProfile.objects.count() == 0


def test_google_form_import_creates_anonymized_profile_context(tmp_path):
    csv_path = tmp_path / "survey.csv"
    _write_survey_csv(csv_path)

    call_command("import_google_form_users", str(csv_path), "--skip-seed-knowledge-base", "--skip-train-recommender")

    user = get_user_model().objects.get(email="form-user-101@google-form.local")
    assert not user.has_usable_password()
    assert user.name == "Survey User 101"
    assert user.is_active is True

    profile = user.profile
    assert profile.country == "algeria"
    assert profile.age == 34
    assert profile.gender == "female"
    assert str(profile.height_cm) == "165.00"
    assert str(profile.weight_kg) == "68.00"
    assert str(profile.bmi) == "24.98"
    assert profile.sports_days_per_week == 3
    assert profile.activity_level == "moderate"
    assert profile.goal == "weight_loss"
    assert profile.goals == ["weight_loss", "healthy_lifestyle"]
    assert profile.health_conditions == ["anemia"]
    assert list(profile.allergies.values_list("slug", flat=True)) == ["gluten"]
    assert Allergy.objects.filter(slug="gluten").exists()
    assert DislikedFood.objects.filter(user=user, slug="red_meat").count() == 1
    assert UserSupplement.objects.filter(user=user, supplement__slug="iron", active=True).count() == 1

    recommender_profile = build_user_profile(user)
    assert recommender_profile["supplements"] == ["iron"]
    assert recommender_profile["goals"] == ["weight_loss", "healthy_lifestyle"]
    assert recommender_profile["maladies"] == ["anemia"]
    assert recommender_profile["allergies"] == ["gluten"]
    assert recommender_profile["aliments_exclus"] == ["red_meat"]
    assert recommender_profile["imc"] == 24.98


def test_google_form_import_can_be_run_more_than_once(tmp_path):
    csv_path = tmp_path / "survey.csv"
    _write_survey_csv(csv_path)

    call_command("import_google_form_users", str(csv_path), "--skip-seed-knowledge-base", "--skip-train-recommender")
    call_command("import_google_form_users", str(csv_path), "--skip-seed-knowledge-base", "--skip-train-recommender")

    user = get_user_model().objects.get(email="form-user-101@google-form.local")
    assert get_user_model().objects.filter(email="form-user-101@google-form.local").count() == 1
    assert DislikedFood.objects.filter(user=user, slug="red_meat").count() == 1
    assert UserSupplement.objects.filter(user=user, supplement__slug="iron", active=True).count() == 1
