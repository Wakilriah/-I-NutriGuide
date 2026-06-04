import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from openpyxl import Workbook

from apps.rules.models import (
    AssociationTransaction,
    AssociationTransactionItem,
    FoodSupplementSynergyRule,
    MinedAssociationRule,
    SafetyConstraint,
    SupplementCategory,
    SupplementNormalization,
)
from apps.recommendations.services.training import build_rules_from_database


pytestmark = pytest.mark.django_db


def build_workbook(path, *, include_all_sheets=True, normalization_count=105):
    workbook = Workbook()
    workbook.remove(workbook.active)
    if include_all_sheets:
        _sheet(workbook, "README", ["Section", "Content"], [["Purpose", "Test workbook"]])
        _sheet(
            workbook,
            "Supplement_Categories",
            ["category", "canonical_item", "keywords", "main_nutrient", "source_url"],
            [["Iron", "iron", "iron, ferrous", "Iron", "https://example.com/iron"]],
        )
        _sheet(
            workbook,
            "Normalization_105",
            ["map_id", "original_supplement_name", "normalized_category", "primary_keyword", "main_nutrient", "notes", "source_url"],
            [[index, f"Iron variant {index}", "Iron", "iron", "Iron", "test", "https://example.com/iron"] for index in range(1, normalization_count + 1)],
        )
        _sheet(
            workbook,
            "Synergy_Seed_Rules",
            ["rule_seed_id", "supplement_category", "supplement_item", "food", "food_item", "nutrient_relation", "association_type", "reason", "seed_weight", "source_url"],
            [[1, "Iron", "supp:iron", "spinach", "food:spinach", "iron_food", "positive", "Spinach is paired with iron in the seed dataset.", 0.8, "https://example.com/iron"]],
        )
        _sheet(
            workbook,
            "Safety_Constraints",
            ["supplement_category", "avoid_or_review_item", "constraint_type", "reason", "how_to_use", "source_url"],
            [["Iron", "tea", "avoid_timing", "Tea can reduce iron absorption.", "Separate timing.", "https://example.com/iron"]],
        )
        _sheet(
            workbook,
            "Transactions_Wide",
            ["transaction_id", "user_id", "items_pipe"],
            [["T1", "U1", "supp:iron|food:spinach"], ["T2", "U2", "supp:iron|food:spinach|food:beans"]],
        )
        _sheet(
            workbook,
            "Transactions_Long",
            ["transaction_id", "item_type", "item_value", "item"],
            [
                ["T1", "supp", "iron", "supp:iron"],
                ["T1", "food", "spinach", "food:spinach"],
                ["T2", "supp", "iron", "supp:iron"],
                ["T2", "food", "spinach", "food:spinach"],
                ["T2", "food", "beans", "food:beans"],
            ],
        )
        _sheet(
            workbook,
            "Apriori_OneHot",
            ["transaction_id", "supp:iron", "food:spinach", "food:beans"],
            [["T1", 1, 1, 0], ["T2", 1, 1, 1]],
        )
    else:
        _sheet(workbook, "Supplement_Categories", ["category"], [["Iron"]])
    workbook.save(path)


def _sheet(workbook, name, headers, rows):
    worksheet = workbook.create_sheet(name)
    worksheet.append(headers)
    for row in rows:
        worksheet.append(row)


def test_import_association_dataset_is_idempotent(tmp_path):
    workbook_path = tmp_path / "association.xlsx"
    build_workbook(workbook_path)

    call_command("import_association_dataset", str(workbook_path))
    call_command("import_association_dataset", str(workbook_path))

    assert SupplementCategory.objects.count() == 1
    assert SupplementNormalization.objects.count() == 105
    assert FoodSupplementSynergyRule.objects.count() == 1
    assert SafetyConstraint.objects.count() == 1
    assert AssociationTransaction.objects.count() == 2
    assert AssociationTransactionItem.objects.count() == 5


def test_import_association_dataset_missing_sheet_has_clear_error(tmp_path):
    workbook_path = tmp_path / "missing.xlsx"
    build_workbook(workbook_path, include_all_sheets=False)

    with pytest.raises(CommandError, match="Missing required sheet"):
        call_command("import_association_dataset", str(workbook_path))


def test_mining_generates_support_confidence_and_lift(tmp_path):
    workbook_path = tmp_path / "association.xlsx"
    build_workbook(workbook_path)
    call_command("import_association_dataset", str(workbook_path))

    call_command("mine_association_rules", min_support=0.1, min_confidence=0.1, min_lift=0.5)

    rule = MinedAssociationRule.objects.filter(antecedent_items=["supp:iron"], consequent_items=["food:spinach"]).first()
    assert rule is not None
    assert rule.support == 1.0
    assert rule.confidence == 1.0
    assert rule.lift == 1.0


def test_safety_constraints_are_not_positive_recommendation_rules(tmp_path):
    workbook_path = tmp_path / "association.xlsx"
    build_workbook(workbook_path)
    call_command("import_association_dataset", str(workbook_path))

    rules = build_rules_from_database()

    assert any(rule["consequent"] == "food:spinach" for rule in rules)
    assert not any("tea" in str(rule) for rule in rules)
