from pathlib import Path
from decimal import Decimal

import pytest
from django.core.management import call_command
from django.urls import reverse

from apps.accounts.models import Allergy, DislikedFood, UserProfile
from apps.foods.management.commands.import_ciqual_foods import parse_ciqual_decimal, read_ciqual_rows
from apps.foods.models import Food
from apps.nutrients.models import Nutrient
from apps.rules.models import AssociationRule
from apps.supplements.models import Supplement, SupplementNutrient, UserSupplement


pytestmark = pytest.mark.django_db


CIQUAL_HEADER = (
    "alim_grp_code;alim_ssgrp_code;alim_ssssgrp_code;alim_grp_nom_fr;alim_ssgrp_nom_fr;alim_ssssgrp_nom_fr;"
    "alim_code;alim_nom_fr;alim_nom_sci;Energie, Règlement UE N° 1169/2011 (kcal/100 g);Eau (g/100 g);"
    "Protéines, N x facteur de Jones (g/100 g);Glucides (g/100 g);Lipides (g/100 g);Sucres (g/100 g);"
    "Fibres alimentaires (g/100 g);Calcium (mg/100 g);Fer (mg/100 g);Magnésium (mg/100 g);"
    "Phosphore (mg/100 g);Potassium (mg/100 g);Sodium (mg/100 g);Zinc (mg/100 g);Vitamine C (mg/100 g);"
    "Vitamine D (µg/100 g);Vitamine E (mg/100 g);Vitamine K1 (µg/100 g);"
    "Vitamine B1 ou Thiamine (mg/100 g);Vitamine B2 ou Riboflavine (mg/100 g);"
    "Vitamine B3 ou PP ou Niacine (mg/100 g);Vitamine B5 ou Acide pantothénique (mg/100 g);"
    "Vitamine B6 (mg/100 g);Vitamine B9 ou Folates totaux (µg/100 g);Vitamine B12 (µg/100 g)"
)


def write_ciqual_csv(tmp_path: Path) -> Path:
    row_1 = (
        "01;0101;000000;fruits, légumes, légumineuses et oléagineux;fruits;-;10001;Kiwi;Actinidia;"
        "61;83,9;1,14;14,7;0,52;8,99;3;34;0,31;17;34;312;3;0,14;92,7;0;1,46;40;"
        "0,027;0,025;0,37;0,18;0,063;25;0"
    )
    row_2 = (
        "01;0101;000000;fruits, légumes, légumineuses et oléagineux;légumes;-;10002;Epinard;;"
        "23;91,4;2,9;3,6;0,4;0,4;2,2;99;2,71;79;49;558;79;0,53;28,1;-;2,03;traces;"
        "0,078;0,189;0,724;0,065;0,195;194;0"
    )
    path = tmp_path / "ciqual.csv"
    path.write_text(f"{CIQUAL_HEADER}\n{row_1}\n{row_2}\n", encoding="utf-8-sig")
    return path


def test_ciqual_reader_uses_semicolon_and_utf8_sig(tmp_path):
    path = write_ciqual_csv(tmp_path)

    rows = list(read_ciqual_rows(path))

    assert rows[0]["alim_nom_fr"] == "Kiwi"
    assert rows[0]["Vitamine C (mg/100 g)"] == "92,7"


def test_parse_ciqual_decimal_handles_comma_and_null_values():
    assert parse_ciqual_decimal("4,88") == Decimal("4.88")
    assert parse_ciqual_decimal("-") is None
    assert parse_ciqual_decimal("") is None
    assert parse_ciqual_decimal("traces") is None
    assert parse_ciqual_decimal("< 0,3") is None


def test_import_ciqual_is_idempotent_and_creates_nutrient_values(tmp_path):
    path = write_ciqual_csv(tmp_path)

    call_command("import_ciqual_foods", str(path))
    call_command("import_ciqual_foods", str(path))

    assert Food.objects.filter(source="CIQUAL 2020").count() == 2
    assert Nutrient.objects.filter(slug="vitamin-c", source_column="Vitamine C (mg/100 g)").exists()
    kiwi = Food.objects.get(ciqual_code="10001")
    assert kiwi.source == "CIQUAL 2020"
    assert kiwi.serving_size_g == Decimal("100.000")
    assert kiwi.nutrients.filter(nutrient__slug="vitamin-c", amount="92.700", per_quantity="100.000").exists()


def test_import_limit_dry_run_and_clear_ciqual(tmp_path):
    path = write_ciqual_csv(tmp_path)

    call_command("import_ciqual_foods", str(path), "--limit", "1")
    assert Food.objects.filter(source="CIQUAL 2020").count() == 1

    call_command("import_ciqual_foods", str(path), "--dry-run", "--clear-ciqual")
    assert Food.objects.filter(source="CIQUAL 2020").count() == 1

    call_command("import_ciqual_foods", str(path), "--clear-ciqual")
    assert Food.objects.filter(source="CIQUAL 2020").count() == 2


def test_recommendations_use_imported_ciqual_foods_and_keep_filters(authenticated_client, user, tmp_path):
    path = write_ciqual_csv(tmp_path)
    call_command("import_ciqual_foods", str(path))

    iron = Nutrient.objects.get(slug="iron")
    iron_supplement = Supplement.objects.create(name="Iron", slug="iron", common_dose="18 mg")
    SupplementNutrient.objects.create(supplement=iron_supplement, nutrient=iron, amount="18.000", unit="mg")
    UserSupplement.objects.create(user=user, supplement=iron_supplement, dose="18 mg", frequency="daily")
    AssociationRule.objects.create(
        antecedent_type="supplement",
        antecedent_slug="iron",
        consequent_type="nutrient",
        consequent_slug="vitamin-c",
        support=0.3,
        confidence=0.9,
        lift=1.6,
        explanation="vitamin C-rich foods may support iron absorption.",
    )
    profile = UserProfile.objects.create(user=user, goal="general_health")
    allergy = Allergy.objects.create(name="Epinard", slug="epinard")
    profile.allergies.add(allergy)
    DislikedFood.objects.create(user=user, name="Some Other Food", slug="some-other-food")

    response = authenticated_client.post(reverse("recommendation-generate"), {"limit": 5}, format="json")

    assert response.status_code == 201
    slugs = [item["food"]["slug"] for item in response.json()["items"]]
    assert "kiwi" in slugs
    assert "epinard" not in slugs
    first = response.json()["items"][0]
    assert "vitamine_c" in first["matched_nutrients"]
    assert response.json()["disclaimer"].startswith("Recommendations are nutritional suggestions")
