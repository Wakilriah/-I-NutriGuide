import pytest
from django.core.management import call_command

from apps.foods.models import Food
from apps.nutrients.models import Nutrient
from apps.rules.models import AssociationRule
from apps.supplements.models import Supplement


pytestmark = pytest.mark.django_db


def test_seed_all_command_populates_baseline_data():
    call_command("seed_all")

    assert Nutrient.objects.count() == 10
    assert Food.objects.count() == 21
    assert Supplement.objects.count() == 10
    assert AssociationRule.objects.count() == 8
