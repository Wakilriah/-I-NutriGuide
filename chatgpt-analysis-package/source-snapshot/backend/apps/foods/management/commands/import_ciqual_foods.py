import csv
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Count
from django.utils.text import slugify

from apps.foods.models import Food, FoodCategory, FoodNutrient
from apps.nutrients.models import Nutrient


CIQUAL_SOURCE = "CIQUAL 2020"
NULL_MARKERS = {"", "-", "traces"}


@dataclass(frozen=True)
class NutrientColumn:
    column: str
    name: str
    slug: str
    unit: str


CIQUAL_NUTRIENTS = [
    NutrientColumn("Energie, Règlement UE N° 1169/2011 (kcal/100 g)", "Calories", "calories", "kcal"),
    NutrientColumn("Eau (g/100 g)", "Water", "water", "g"),
    NutrientColumn("Protéines, N x facteur de Jones (g/100 g)", "Protein", "protein", "g"),
    NutrientColumn("Glucides (g/100 g)", "Carbohydrates", "carbohydrates", "g"),
    NutrientColumn("Lipides (g/100 g)", "Healthy Fat", "healthy-fat", "g"),
    NutrientColumn("Sucres (g/100 g)", "Sugars", "sugars", "g"),
    NutrientColumn("Fibres alimentaires (g/100 g)", "Fiber", "fiber", "g"),
    NutrientColumn("Calcium (mg/100 g)", "Calcium", "calcium", "mg"),
    NutrientColumn("Fer (mg/100 g)", "Iron", "iron", "mg"),
    NutrientColumn("Magnésium (mg/100 g)", "Magnesium", "magnesium", "mg"),
    NutrientColumn("Phosphore (mg/100 g)", "Phosphorus", "phosphorus", "mg"),
    NutrientColumn("Potassium (mg/100 g)", "Potassium", "potassium", "mg"),
    NutrientColumn("Sodium (mg/100 g)", "Sodium", "sodium", "mg"),
    NutrientColumn("Zinc (mg/100 g)", "Zinc", "zinc", "mg"),
    NutrientColumn("Vitamine C (mg/100 g)", "Vitamin C", "vitamin-c", "mg"),
    NutrientColumn("Vitamine D (µg/100 g)", "Vitamin D", "vitamin-d", "µg"),
    NutrientColumn("Vitamine E (mg/100 g)", "Vitamin E", "vitamin-e", "mg"),
    NutrientColumn("Vitamine K1 (µg/100 g)", "Vitamin K1", "vitamin-k1", "µg"),
    NutrientColumn("Vitamine B1 ou Thiamine (mg/100 g)", "Vitamin B1", "vitamin-b1", "mg"),
    NutrientColumn("Vitamine B2 ou Riboflavine (mg/100 g)", "Vitamin B2", "vitamin-b2", "mg"),
    NutrientColumn("Vitamine B3 ou PP ou Niacine (mg/100 g)", "Vitamin B3", "vitamin-b3", "mg"),
    NutrientColumn("Vitamine B5 ou Acide pantothénique (mg/100 g)", "Vitamin B5", "vitamin-b5", "mg"),
    NutrientColumn("Vitamine B6 (mg/100 g)", "Vitamin B6", "vitamin-b6", "mg"),
    NutrientColumn("Vitamine B9 ou Folates totaux (µg/100 g)", "Vitamin B9", "vitamin-b9", "µg"),
    NutrientColumn("Vitamine B12 (µg/100 g)", "Vitamin B12", "vitamin-b12", "µg"),
]


def parse_ciqual_decimal(value):
    if value is None:
        return None
    normalized = value.strip().lower().replace("\ufeff", "")
    if normalized in NULL_MARKERS:
        return None
    normalized = normalized.replace(",", ".")
    try:
        return Decimal(normalized)
    except InvalidOperation:
        return None


def read_ciqual_rows(path):
    with Path(path).open("r", encoding="utf-8-sig", newline="") as handle:
        yield from csv.DictReader(handle, delimiter=";")


def get_ciqual_nutrients(only_basic=False):
    # The mapped list intentionally contains calories, macros, core minerals, and vitamins used by recommendations.
    return CIQUAL_NUTRIENTS


def resolve_import_path(raw_path):
    path = Path(raw_path)
    if path.exists():
        return path

    backend_relative = Path("apps") / raw_path
    if backend_relative.exists():
        return backend_relative

    if raw_path.startswith("backend/"):
        app_backend_path = Path("apps") / raw_path
        if app_backend_path.exists():
            return app_backend_path
        backend_local_path = Path(raw_path.removeprefix("backend/"))
        if backend_local_path.exists():
            return backend_local_path

    raise CommandError(f"CIQUAL CSV file not found: {raw_path}")


class Command(BaseCommand):
    help = "Import French CIQUAL food composition CSV data into foods, nutrients, and food nutrient values."

    def add_arguments(self, parser):
        parser.add_argument("csv_path")
        parser.add_argument("--limit", type=int, default=None, help="Import at most this many CSV rows.")
        parser.add_argument("--dry-run", action="store_true", help="Parse and summarize without writing database changes.")
        parser.add_argument("--clear-ciqual", action="store_true", help="Remove existing CIQUAL-imported foods before import.")
        parser.add_argument(
            "--skip-empty-nutrients",
            action="store_true",
            help="Do not create FoodNutrient rows for blank, '-', traces, or invalid CIQUAL values.",
        )
        parser.add_argument(
            "--only-basic",
            action="store_true",
            help="Import the mapped calories, macros, minerals, and vitamins useful for recommendations.",
        )

    def handle(self, *args, **options):
        path = resolve_import_path(options["csv_path"])
        nutrients_to_import = get_ciqual_nutrients(options["only_basic"])
        summary = {
            "rows_seen": 0,
            "rows_skipped": 0,
            "bad_rows": 0,
            "foods_created": 0,
            "foods_updated": 0,
            "categories_created": 0,
            "categories_updated": 0,
            "nutrients_created": 0,
            "nutrients_updated": 0,
            "food_nutrients_created": 0,
            "food_nutrients_updated": 0,
            "empty_nutrients_skipped": 0,
            "ciqual_foods_deleted": 0,
        }

        if options["dry_run"]:
            summary.update(self._dry_run(path, nutrients_to_import, options))
            self._write_summary(summary, dry_run=True)
            return

        with transaction.atomic():
            if options["clear_ciqual"]:
                summary["ciqual_foods_deleted"] = self._clear_ciqual()

            nutrients = self._ensure_nutrients(nutrients_to_import, summary)
            rows, foods_by_code = self._import_food_rows(path, options, summary)
            self._sync_food_nutrients(rows, nutrients_to_import, nutrients, foods_by_code, options, summary)

        self._write_summary(summary, dry_run=False)

    def _dry_run(self, path, nutrients_to_import, options):
        rows_seen = 0
        rows_skipped = 0
        non_empty_nutrients = 0
        for row in read_ciqual_rows(path):
            if options["limit"] is not None and rows_seen >= options["limit"]:
                break
            rows_seen += 1
            if not row.get("alim_code") or not row.get("alim_nom_fr"):
                rows_skipped += 1
                continue
            non_empty_nutrients += sum(
                1 for nutrient_column in nutrients_to_import if parse_ciqual_decimal(row.get(nutrient_column.column)) is not None
            )
        return {
            "rows_seen": rows_seen,
            "rows_skipped": rows_skipped,
            "food_nutrients_created": non_empty_nutrients,
        }

    def _clear_ciqual(self):
        queryset = Food.objects.filter(source=CIQUAL_SOURCE)
        deleted_count = queryset.count()
        queryset.delete()

        FoodCategory.objects.filter(source=CIQUAL_SOURCE).annotate(food_count=Count("foods")).filter(food_count=0).delete()
        Nutrient.objects.filter(source_column__gt="").annotate(
            food_count=Count("food_sources"),
            supplement_count=Count("supplement_sources"),
        ).filter(food_count=0, supplement_count=0).delete()
        return deleted_count

    def _ensure_nutrients(self, nutrient_columns, summary):
        nutrients = {}
        for nutrient_column in nutrient_columns:
            nutrient, created = Nutrient.objects.update_or_create(
                slug=nutrient_column.slug,
                defaults={
                    "name": nutrient_column.name,
                    "unit": nutrient_column.unit,
                    "original_name_fr": nutrient_column.column.split(" (", 1)[0],
                    "source_column": nutrient_column.column,
                    "is_active": True,
                },
            )
            nutrients[nutrient_column.slug] = nutrient
            if created:
                summary["nutrients_created"] += 1
            else:
                summary["nutrients_updated"] += 1
        return nutrients

    def _import_food_rows(self, path, options, summary):
        rows = []
        foods_by_code = {}

        for row in read_ciqual_rows(path):
            if options["limit"] is not None and summary["rows_seen"] >= options["limit"]:
                break
            summary["rows_seen"] += 1
            try:
                food = self._import_food_row(row, summary)
            except Exception as exc:  # pragma: no cover - defensive import safety
                summary["bad_rows"] += 1
                self.stderr.write(f"Skipped bad row {summary['rows_seen']}: {exc}")
                continue
            if food is None:
                continue
            rows.append(row)
            foods_by_code[food.ciqual_code] = food

        return rows, foods_by_code

    def _import_food_row(self, row, summary):
        ciqual_code = (row.get("alim_code") or "").strip()
        food_name = (row.get("alim_nom_fr") or "").strip()
        if not ciqual_code or not food_name:
            summary["rows_skipped"] += 1
            return None

        category, category_created = self._get_category(row)
        summary["categories_created" if category_created else "categories_updated"] += 1

        food, food_created = Food.objects.update_or_create(
            ciqual_code=ciqual_code,
            defaults={
                "name": food_name,
                "slug": self._food_slug(food_name, ciqual_code),
                "category": category,
                "description": self._food_description(row),
                "scientific_name": (row.get("alim_nom_sci") or "").strip(),
                "source": CIQUAL_SOURCE,
                "serving_size_g": Decimal("100.000"),
                "is_active": True,
            },
        )
        summary["foods_created" if food_created else "foods_updated"] += 1
        return food

    def _sync_food_nutrients(self, rows, nutrient_columns, nutrients, foods_by_code, options, summary):
        desired = {}
        empty_keys = set()
        for nutrient_column in nutrient_columns:
            nutrient = nutrients[nutrient_column.slug]
            for row in rows:
                food = foods_by_code.get((row.get("alim_code") or "").strip())
                if food is None:
                    continue
                key = (food.id, nutrient.id)
                value = parse_ciqual_decimal(row.get(nutrient_column.column))
                if value is None:
                    summary["empty_nutrients_skipped"] += 1
                    if not options["skip_empty_nutrients"]:
                        empty_keys.add(key)
                    continue
                desired[key] = {
                    "food": food,
                    "nutrient": nutrient,
                    "amount": value,
                    "unit": nutrient_column.unit,
                    "per_quantity": Decimal("100.000"),
                    "per_unit": "g",
                }

        if empty_keys:
            empty_food_ids = {food_id for food_id, _nutrient_id in empty_keys}
            empty_nutrient_ids = {nutrient_id for _food_id, nutrient_id in empty_keys}
            for existing in FoodNutrient.objects.filter(food_id__in=empty_food_ids, nutrient_id__in=empty_nutrient_ids):
                if (existing.food_id, existing.nutrient_id) in empty_keys:
                    existing.delete()

        if not desired:
            return

        existing_rows = {
            (row.food_id, row.nutrient_id): row
            for row in FoodNutrient.objects.filter(
                food_id__in={food_id for food_id, _nutrient_id in desired},
                nutrient_id__in={nutrient_id for _food_id, nutrient_id in desired},
            )
        }
        to_create = []
        to_update = []
        for key, values in desired.items():
            existing = existing_rows.get(key)
            if existing is None:
                to_create.append(FoodNutrient(**values))
                continue
            existing.amount = values["amount"]
            existing.unit = values["unit"]
            existing.per_quantity = values["per_quantity"]
            existing.per_unit = values["per_unit"]
            to_update.append(existing)

        if to_create:
            FoodNutrient.objects.bulk_create(to_create, batch_size=1000)
            summary["food_nutrients_created"] += len(to_create)
        if to_update:
            FoodNutrient.objects.bulk_update(to_update, ["amount", "unit", "per_quantity", "per_unit"], batch_size=1000)
            summary["food_nutrients_updated"] += len(to_update)

    def _get_category(self, row):
        category_name = self._category_name(row)
        category_slug = slugify(category_name) or "ciqual-uncategorized"
        return FoodCategory.objects.update_or_create(
            slug=category_slug,
            defaults={
                "name": category_name,
                "ciqual_group_code": (row.get("alim_grp_code") or "").strip(),
                "ciqual_subgroup_code": (row.get("alim_ssgrp_code") or "").strip(),
                "ciqual_subsubgroup_code": (row.get("alim_ssssgrp_code") or "").strip(),
                "source": CIQUAL_SOURCE,
            },
        )

    def _category_name(self, row):
        for column in ("alim_ssssgrp_nom_fr", "alim_ssgrp_nom_fr", "alim_grp_nom_fr"):
            value = (row.get(column) or "").strip()
            if value and value != "-":
                return value[:150]
        return "CIQUAL uncategorized"

    def _food_slug(self, food_name, ciqual_code):
        base_slug = slugify(food_name)[:180] or f"ciqual-{ciqual_code}"
        existing = Food.objects.filter(slug=base_slug).exclude(ciqual_code=ciqual_code).exists()
        if existing:
            return f"{base_slug}-{ciqual_code}"[:220]
        return base_slug

    def _food_description(self, row):
        group = (row.get("alim_grp_nom_fr") or "").strip()
        subgroup = (row.get("alim_ssgrp_nom_fr") or "").strip()
        parts = [part for part in (group, subgroup) if part and part != "-"]
        suffix = f" Category: {' / '.join(parts)}." if parts else ""
        return f"Imported from the French CIQUAL 2020 food composition table.{suffix}"

    def _write_summary(self, summary, dry_run):
        mode = "Dry run" if dry_run else "Import"
        self.stdout.write(
            self.style.SUCCESS(
                f"{mode} summary: "
                f"{summary['rows_seen']} rows seen, "
                f"{summary['rows_skipped']} skipped, "
                f"{summary['bad_rows']} bad, "
                f"{summary['foods_created']} foods created, "
                f"{summary['foods_updated']} foods updated, "
                f"{summary['nutrients_created']} nutrients created, "
                f"{summary['nutrients_updated']} nutrients updated, "
                f"{summary['food_nutrients_created']} food nutrients created, "
                f"{summary['food_nutrients_updated']} food nutrients updated, "
                f"{summary['empty_nutrients_skipped']} empty nutrient values skipped, "
                f"{summary['ciqual_foods_deleted']} CIQUAL foods deleted."
            )
        )
