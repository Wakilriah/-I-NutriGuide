import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

from apps.feedback.models import RecommendationFeedback
from apps.recommendations.models import RecommendationRun
from apps.supplements.models import UserSupplement


pytestmark = pytest.mark.django_db


def test_seed_demo_creates_idempotent_demo_flow_data():
    call_command("seed_demo")
    call_command("seed_demo")

    user_model = get_user_model()
    admin = user_model.objects.get(email="riahwakil@gmail.com")
    demo_user = user_model.objects.get(email="demo.user@inutriguide.local")

    assert admin.is_staff is True
    assert admin.is_superuser is True
    assert admin.is_active is True
    assert demo_user.is_active is True
    assert demo_user.profile.goal == "general_health"
    assert demo_user.profile.allergies.filter(slug="shellfish").exists()
    assert demo_user.profile.dietary_restrictions.filter(slug="vegetarian").exists()
    assert demo_user.disliked_foods.filter(slug="soda").exists()
    assert UserSupplement.objects.filter(user=demo_user, active=True).count() == 1
    assert RecommendationRun.objects.filter(user=demo_user, items__isnull=False).distinct().exists()
    assert RecommendationFeedback.objects.filter(user=demo_user, rating=5, is_helpful=True).count() == 1
