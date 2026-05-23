import json
import os
import re
import time
from decimal import Decimal, InvalidOperation
from urllib.parse import urlencode
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from apps.foods.models import Food, FoodCategory, FoodNutrient
from apps.nutrients.models import Nutrient
from apps.supplements.models import Supplement, SupplementNutrient


USDA_SOURCE = "USDA FDC"
OPEN_FOOD_FACTS_SOURCE = "Open Food Facts"
DSLD_SOURCE = "NIH DSLD"
DEFAULT_CIQUAL_PATH = "seed_data/raw/Table_Ciqual_2020_FR_20250223.csv"
USER_AGENT = "I-NutriGuide data import local validation (admin@matchcesoir.pro)"

DEFAULT_USDA_QUERIES = ["spinach", "salmon", "oats", "orange", "almonds", "yogurt"]
DEFAULT_OPEN_FOOD_FACTS_QUERIES = ["oat milk", "peanut butter", "breakfast cereal"]
DEFAULT_DSLD_QUERIES = ["Vitamin D", "Vitamin C", "Iron", "Magnesium", "Zinc"]

USDA_NUTRIENT_PATTERNS = [
    ("energy", "Calories", "calories", "kcal"),
    ("protein", "Protein", "protein", "g"),
    ("carbohydrate", "Carbohydrates", "carbohydrates", "g"),
    ("total lipid", "Healthy Fat", "healthy-fat", "g"),
    ("total sugars", "Sugars", "sugars", "g"),
    ("fiber", "Fiber", "fiber", "g"),
    ("calcium", "Calcium", "calcium", "mg"),
    ("iron", "Iron", "iron", "mg"),
    ("magnesium", "Magnesium", "magnesium", "mg"),
    ("phosphorus", "Phosphorus", "phosphorus", "mg"),
    ("potassium", "Potassium", "potassium", "mg"),
    ("sodium", "Sodium", "sodium", "mg"),
    ("zinc", "Zinc", "zinc", "mg"),
    ("vitamin c", "Vitamin C", "vitamin-c", "mg"),
    ("vitamin d", "Vitamin D", "vitamin-d", "µg"),
    ("vitamin e", "Vitamin E", "vitamin-e", "mg"),
    ("vitamin k", "Vitamin K1", "vitamin-k1", "µg"),
    ("thiamin", "Vitamin B1", "vitamin-b1", "mg"),
    ("riboflavin", "Vitamin B2", "vitamin-b2", "mg"),
    ("niacin", "Vitamin B3", "vitamin-b3", "mg"),
    ("vitamin b-6", "Vitamin B6", "vitamin-b6", "mg"),
    ("folate", "Vitamin B9", "vitamin-b9", "µg"),
    ("vitamin b-12", "Vitamin B12", "vitamin-b12", "µg"),
]

OPEN_FOOD_FACTS_NUTRIENTS = [
    ("energy-kcal_100g", "Calories", "calories", "kcal", Decimal("1")),
    ("proteins_100g", "Protein", "protein", "g", Decimal("1")),
    ("carbohydrates_100g", "Carbohydrates", "carbohydrates", "g", Decimal("1")),
    ("fat_100g", "Healthy Fat", "healthy-fat", "g", Decimal("1")),
    ("sugars_100g", "Sugars", "sugars", "g", Decimal("1")),
    ("fiber_100g", "Fiber", "fiber", "g", Decimal("1")),
    ("calcium_100g", "Calcium", "calcium", "mg", Decimal("1000")),
    ("iron_100g", "Iron", "iron", "mg", Decimal("1000")),
    ("magnesium_100g", "Magnesium", "magnesium", "mg", Decimal("1000")),
    ("sodium_100g", "Sodium", "sodium", "mg", Decimal("1000")),
    ("zinc_100g", "Zinc", "zinc", "mg", Decimal("1000")),
    ("vitamin-c_100g", "Vitamin C", "vitamin-c", "mg", Decimal("1000")),
    ("vitamin-d_100g", "Vitamin D", "vitamin-d", "µg", Decimal("1000000")),
    ("vitamin-b12_100g", "Vitamin B12", "vitamin-b12", "µg", Decimal("1000000")),
]

SUPPLEMENT_NUTRIENT_PATTERNS = [
    ("vitamin d", "Vitamin D", "vitamin-d"),
    ("vitamin c", "Vitamin C", "vitamin-c"),
    ("ascorbic", "Vitamin C", "vitamin-c"),
    ("iron", "Iron", "iron"),
    ("calcium", "Calcium", "calcium"),
    ("magnesium", "Magnesium", "magnesium"),
    ("zinc", "Zinc", "zinc"),
    ("vitamin b12", "Vitamin B12", "vitamin-b12"),
    ("vitamin b-12", "Vitamin B12", "vitamin-b12"),
    ("folic acid", "Vitamin B9", "vitamin-b9"),
    ("folate", "Vitamin B9", "vitamin-b9"),
    ("omega", "Healthy Fat", "healthy-fat"),
]


class Command(BaseCommand):
    help = "Import a focused local validation set from CIQUAL, USDA FoodData Central, Open Food Facts, and NIH DSLD."

    def add_arguments(self, parser):
        parser.add_argument("--ciqual-path", default=DEFAULT_CIQUAL_PATH)
        parser.add_argument("--ciqual-limit", type=int, default=None)
        parser.add_argument("--skip-ciqual", action="store_true")
        parser.add_argument("--usda-query", action="append", dest="usda_queries")
        parser.add_argument("--usda-limit", type=int, default=2)
        parser.add_argument("--fdc-api-key", default=os.getenv("FDC_API_KEY", "DEMO_KEY"))
        parser.add_argument("--skip-usda", action="store_true")
        parser.add_argument("--openfoodfacts-query", action="append", dest="openfoodfacts_queries")
        parser.add_argument("--openfoodfacts-limit", type=int, default=2)
        parser.add_argument("--skip-openfoodfacts", action="store_true")
        parser.add_argument("--dsld-query", action="append", dest="dsld_queries")
        parser.add_argument("--dsld-limit", type=int, default=1)
        parser.add_argument("--skip-dsld", action="store_true")
        parser.add_argument("--sync-neo4j", action="store_true")

    def handle(self, *args, **options):
        summary = {
            "ciqual_imported": 0,
            "usda_foods": 0,
            "openfoodfacts_foods": 0,
            "dsld_supplements": 0,
            "nutrient_links": 0,
            "supplement_links": 0,
        }

        call_command("seed_nutrients")
        call_command("seed_supplements")
        call_command("seed_rules")
        call_command("seed_interactions")

        if not options["skip_ciqual"]:
            args = [options["ciqual_path"], "--skip-empty-nutrients"]
            if options["ciqual_limit"]:
                args.extend(["--limit", str(options["ciqual_limit"])])
            call_command("import_ciqual_foods", *args)
            summary["ciqual_imported"] = options["ciqual_limit"] or -1

        if not options["skip_usda"]:
            for query in options["usda_queries"] or DEFAULT_USDA_QUERIES:
                try:
                    summary["usda_foods"] += self._import_usda_foods(query, options["usda_limit"], options["fdc_api_key"], summary)
                except (HTTPError, URLError, TimeoutError) as exc:
                    self.stderr.write(f"Skipped USDA query '{query}': {exc}")

        if not options["skip_openfoodfacts"]:
            for query in options["openfoodfacts_queries"] or DEFAULT_OPEN_FOOD_FACTS_QUERIES:
                try:
                    summary["openfoodfacts_foods"] += self._import_open_food_facts(query, options["openfoodfacts_limit"], summary)
                except (HTTPError, URLError, TimeoutError) as exc:
                    self.stderr.write(f"Skipped Open Food Facts query '{query}': {exc}")

        if not options["skip_dsld"]:
            for query in options["dsld_queries"] or DEFAULT_DSLD_QUERIES:
                try:
                    summary["dsld_supplements"] += self._import_dsld_products(query, options["dsld_limit"], summary)
                except (HTTPError, URLError, TimeoutError) as exc:
                    self.stderr.write(f"Skipped DSLD query '{query}': {exc}")

        if options["sync_neo4j"]:
            call_command("sync_to_neo4j")

        self.stdout.write(self.style.SUCCESS(f"Public nutrition import summary: {summary}"))

    def _import_usda_foods(self, query, limit, api_key, summary):
        params = urlencode({"api_key": api_key, "query": query, "pageSize": limit})
        payload = self._get_json(f"https://api.nal.usda.gov/fdc/v1/foods/search?{params}")
        imported = 0
        for item in payload.get("foods", [])[:limit]:
            food = self._upsert_food(
                name=item.get("description") or f"USDA food {item.get('fdcId')}",
                slug_base=f"usda-{item.get('fdcId')}-{item.get('description', '')}",
                category_name=item.get("foodCategory") or item.get("dataType") or "USDA foods",
                source=USDA_SOURCE,
                description=self._usda_description(item),
                image_url="",
            )
            imported += 1
            for nutrient_row in item.get("foodNutrients", []):
                nutrient_info = self._map_usda_nutrient(nutrient_row.get("nutrientName", ""))
                value = decimal_or_none(nutrient_row.get("value"))
                if nutrient_info is None or value is None:
                    continue
                name, slug, unit = nutrient_info
                nutrient = ensure_nutrient(name=name, slug=slug, unit=unit)
                self._upsert_food_nutrient(food, nutrient, value, normalize_unit(nutrient_row.get("unitName") or unit), summary)
        return imported

    def _import_open_food_facts(self, query, limit, summary):
        params = urlencode(
            {
                "search_terms": query,
                "search_simple": 1,
                "action": "process",
                "json": 1,
                "page_size": limit,
                "fields": "code,product_name,brands,categories,nutriments,nutriscore_grade,nova_group,allergens,ingredients_text,image_url",
            }
        )
        payload = self._get_json(f"https://world.openfoodfacts.org/cgi/search.pl?{params}")
        imported = 0
        for product in payload.get("products", [])[:limit]:
            name = product.get("product_name") or f"Open Food Facts product {product.get('code')}"
            food = self._upsert_food(
                name=name,
                slug_base=f"off-{product.get('code')}-{name}",
                category_name=first_csv_value(product.get("categories")) or "Packaged foods",
                source=OPEN_FOOD_FACTS_SOURCE,
                description=self._open_food_facts_description(product),
                image_url=product.get("image_url") or "",
            )
            imported += 1
            nutriments = product.get("nutriments") or {}
            for key, name, slug, unit, multiplier in OPEN_FOOD_FACTS_NUTRIENTS:
                value = decimal_or_none(nutriments.get(key))
                if value is None:
                    continue
                nutrient = ensure_nutrient(name=name, slug=slug, unit=unit)
                self._upsert_food_nutrient(food, nutrient, value * multiplier, unit, summary)
        return imported

    def _import_dsld_products(self, query, limit, summary):
        params = urlencode({"q": query, "size": limit})
        payload = self._get_json(f"https://api.ods.od.nih.gov/dsld/v9/search-filter?{params}")
        imported = 0
        for hit in payload.get("hits", [])[:limit]:
            dsld_id = hit.get("_id")
            if not dsld_id:
                continue
            label = self._get_json(f"https://api.ods.od.nih.gov/dsld/v9/label/{dsld_id}")
            supplement = self._upsert_supplement(label)
            imported += 1
            for row in label.get("ingredientRows", []):
                nutrient_info = self._map_supplement_ingredient(row.get("ingredientGroup") or row.get("name") or "")
                if nutrient_info is None:
                    continue
                name, slug = nutrient_info
                quantity = first_quantity(row.get("quantity") or [])
                nutrient = ensure_nutrient(name=name, slug=slug, unit=quantity["unit"] or "mg")
                SupplementNutrient.objects.update_or_create(
                    supplement=supplement,
                    nutrient=nutrient,
                    defaults={"amount": quantity["amount"], "unit": quantity["unit"]},
                )
                summary["supplement_links"] += 1
        return imported

    def _upsert_food(self, *, name, slug_base, category_name, source, description, image_url):
        category_slug = slugify(category_name)[:120] or slugify(source) or "imported-foods"
        category, _ = FoodCategory.objects.update_or_create(
            slug=category_slug,
            defaults={"name": category_name[:150], "source": source},
        )
        slug = slugify(slug_base)[:220] or slugify(name)[:220]
        with transaction.atomic():
            food, _ = Food.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": name[:255],
                    "category": category,
                    "description": description,
                    "source": source,
                    "serving_size_g": Decimal("100.000"),
                    "image_url": image_url[:200],
                    "is_active": True,
                },
            )
        return food

    def _upsert_food_nutrient(self, food, nutrient, amount, unit, summary):
        FoodNutrient.objects.update_or_create(
            food=food,
            nutrient=nutrient,
            defaults={
                "amount": round_decimal(amount),
                "unit": unit,
                "per_quantity": Decimal("100.000"),
                "per_unit": "g",
            },
        )
        summary["nutrient_links"] += 1

    def _upsert_supplement(self, label):
        name = label.get("fullName") or f"DSLD supplement {label.get('id')}"
        brand = label.get("brandName") or ""
        slug = slugify(f"dsld-{label.get('id')}-{name}")[:170]
        common_dose = self._serving_text(label)
        supplement, _ = Supplement.objects.update_or_create(
            slug=slug,
            defaults={
                "name": name[:150],
                "description": self._dsld_description(label, brand),
                "common_dose": common_dose[:100],
                "is_active": True,
            },
        )
        return supplement

    def _map_usda_nutrient(self, raw_name):
        key = normalize_text(raw_name)
        for pattern, name, slug, unit in USDA_NUTRIENT_PATTERNS:
            if pattern in key:
                return name, slug, unit
        return None

    def _map_supplement_ingredient(self, raw_name):
        key = normalize_text(raw_name)
        for pattern, name, slug in SUPPLEMENT_NUTRIENT_PATTERNS:
            if pattern in key:
                return name, slug
        return None

    def _usda_description(self, item):
        parts = [
            "Imported from USDA FoodData Central.",
            f"FDC ID: {item.get('fdcId')}.",
            f"Data type: {item.get('dataType')}.",
        ]
        if item.get("brandName") or item.get("brandOwner"):
            parts.append(f"Brand: {item.get('brandName') or item.get('brandOwner')}.")
        if item.get("gtinUpc"):
            parts.append(f"Barcode: {item.get('gtinUpc')}.")
        if item.get("ingredients"):
            parts.append(f"Ingredients: {clean_text(item.get('ingredients'))}.")
        return " ".join(part for part in parts if part and "None" not in part)

    def _open_food_facts_description(self, product):
        parts = [
            "Imported from Open Food Facts.",
            f"Barcode: {product.get('code')}.",
            f"Brand: {product.get('brands')}.",
            f"Nutri-Score: {product.get('nutriscore_grade')}.",
            f"NOVA group: {product.get('nova_group')}.",
            f"Allergens: {product.get('allergens')}.",
            f"Ingredients: {clean_text(product.get('ingredients_text'))}.",
        ]
        return " ".join(part for part in parts if part and "None" not in part)

    def _dsld_description(self, label, brand):
        warnings = [
            clean_text(statement.get("notes"))
            for statement in label.get("statements", [])
            if "precaution" in str(statement.get("type", "")).lower() or "warning" in str(statement.get("notes", "")).lower()
        ][:3]
        ingredient_names = [row.get("ingredientGroup") or row.get("name") for row in label.get("ingredientRows", [])]
        parts = [
            "Imported from NIH Dietary Supplement Label Database.",
            f"DSLD ID: {label.get('id')}.",
            f"Brand: {brand}.",
            f"UPC: {label.get('upcSku')}.",
            f"Product type: {(label.get('productType') or {}).get('langualCodeDescription')}.",
            f"Ingredients: {', '.join(name for name in ingredient_names if name)}.",
            "Label data is not an endorsement and should be used for educational nutrition guidance.",
        ]
        if warnings:
            parts.append(f"Label warnings: {' '.join(warnings)}")
        return " ".join(part for part in parts if part and "None" not in part)

    def _serving_text(self, label):
        serving = (label.get("servingSizes") or [{}])[0]
        quantity = serving.get("minQuantity") or serving.get("maxQuantity") or ""
        unit = serving.get("unit") or ""
        return f"{quantity} {unit}".strip()

    def _get_json(self, url):
        request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
        last_error = None
        for attempt in range(3):
            try:
                with urlopen(request, timeout=30) as response:
                    return json.loads(response.read().decode("utf-8"))
            except (HTTPError, URLError, TimeoutError) as exc:
                last_error = exc
                if attempt == 2:
                    raise
                time.sleep(1 + attempt)
        raise last_error


def ensure_nutrient(*, name, slug, unit):
    nutrient, created = Nutrient.objects.get_or_create(
        slug=slug,
        defaults={"name": name, "unit": unit, "is_active": True},
    )
    if not created and not nutrient.is_active:
        nutrient.is_active = True
        nutrient.save(update_fields=["is_active", "updated_at"])
    return nutrient


def decimal_or_none(value):
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None


def round_decimal(value):
    return Decimal(value).quantize(Decimal("0.001"))


def normalize_unit(value):
    unit = str(value or "").strip().lower()
    if unit in {"kcal"}:
        return "kcal"
    if unit in {"g", "gram", "grams"}:
        return "g"
    if unit in {"mg", "milligram", "milligrams"}:
        return "mg"
    if unit in {"ug", "mcg", "µg"}:
        return "µg"
    if unit in {"iu"}:
        return "IU"
    return unit or "mg"


def normalize_text(value):
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def clean_text(value):
    return re.sub(r"\s+", " ", str(value or "").replace("_", "")).strip()


def first_csv_value(value):
    return (str(value or "").split(",", 1)[0] or "").strip()


def first_quantity(rows):
    if not rows:
        return {"amount": None, "unit": ""}
    row = rows[0]
    return {
        "amount": decimal_or_none(row.get("quantity")),
        "unit": normalize_unit(row.get("unit") or ""),
    }
