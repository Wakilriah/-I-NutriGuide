import csv
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from apps.foods.models import Food, FoodCategory


REQUIRED_COLUMNS = {
    "food_name",
    "slug",
    "category",
    "image_path",
    "image_alt",
    "recommended_for_supplements",
    "nutrient_tags",
    "synergy_reason",
    "avoid_or_caution",
    "allergen_tags",
    "diet_tags",
    "association_rule_items",
    "is_active",
}

ALLOWED_MEDIA_PREFIXES = {
    "/media/foods/fruits/",
    "/media/foods/vegetables/",
    "/media/foods/proteins/",
    "/media/foods/legumes/",
    "/media/foods/grains/",
    "/media/foods/dairy/",
    "/media/foods/dairy_alternatives/",
    "/media/foods/healthy_fats/",
    "/media/foods/nuts_and_seeds/",
    "/media/foods/fermented_foods/",
    "/media/foods/",
}

TRUTHY = {"1", "true", "t", "yes", "y", "active"}
FALSY = {"0", "false", "f", "no", "n", "inactive"}


class Command(BaseCommand):
    help = "Import the I-NutriGuide food image and recommendation metadata seed CSV."

    def add_arguments(self, parser):
        parser.add_argument("csv_path")
        parser.add_argument("--dry-run", action="store_true", help="Validate and summarize without writing changes.")

    def handle(self, *args, **options):
        path = self._resolve_path(options["csv_path"])
        summary = {"imported": 0, "updated": 0, "skipped": 0, "errors": 0}

        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            self._validate_columns(reader.fieldnames or [])
            with transaction.atomic():
                for line_number, row in enumerate(reader, start=2):
                    try:
                        result = self._import_row(row, dry_run=options["dry_run"])
                    except ValueError as exc:
                        summary["errors"] += 1
                        self.stderr.write(f"Line {line_number}: {exc}")
                        continue
                    summary[result] += 1

                if options["dry_run"]:
                    transaction.set_rollback(True)

        label = "Dry-run" if options["dry_run"] else "Import"
        self.stdout.write(
            self.style.SUCCESS(
                f"{label} complete: imported={summary['imported']}, updated={summary['updated']}, "
                f"skipped={summary['skipped']}, errors={summary['errors']}"
            )
        )

    def _resolve_path(self, raw_path):
        candidates = [
            Path(raw_path),
            Path.cwd() / raw_path,
            Path.cwd() / "data" / Path(raw_path).name,
        ]
        for path in candidates:
            if path.exists():
                return path
        raise CommandError(f"CSV file not found: {raw_path}")

    def _validate_columns(self, fieldnames):
        missing = sorted(REQUIRED_COLUMNS - set(fieldnames))
        if missing:
            raise CommandError(f"Missing required column(s): {', '.join(missing)}")

    def _import_row(self, row, *, dry_run):
        food_name = (row.get("food_name") or "").strip()
        if not food_name:
            return "skipped"

        slug = slugify((row.get("slug") or food_name).strip())
        if not slug:
            raise ValueError("slug could not be normalized")

        category_name = (row.get("category") or "").strip()
        if not category_name:
            raise ValueError(f"{slug}: category is required")

        image_path = (row.get("image_path") or "").strip()
        if image_path and not self._is_allowed_image_path(image_path):
            raise ValueError(f"{slug}: image_path must be under /media/foods/")

        is_active = self._parse_bool(row.get("is_active"), slug)
        category_slug = slugify(category_name)
        category, _created = FoodCategory.objects.get_or_create(
            slug=category_slug,
            defaults={"name": category_name, "source": "I-NutriGuide seed"},
        )

        defaults = {
            "name": food_name,
            "category": category,
            "image_path": image_path,
            "image_alt": (row.get("image_alt") or "").strip(),
            "recommended_for_supplements": self._split_list(row.get("recommended_for_supplements")),
            "nutrient_tags": self._split_list(row.get("nutrient_tags")),
            "synergy_reason": (row.get("synergy_reason") or "").strip(),
            "avoid_or_caution": (row.get("avoid_or_caution") or "").strip(),
            "allergen_tags": self._split_list(row.get("allergen_tags")),
            "diet_tags": self._split_list(row.get("diet_tags")),
            "association_rule_items": self._split_list(row.get("association_rule_items"), separators=("|", ",")),
            "is_active": is_active,
        }

        if dry_run:
            return "updated" if Food.objects.filter(slug=slug).exists() else "imported"

        _food, created = Food.objects.update_or_create(slug=slug, defaults=defaults)
        return "imported" if created else "updated"

    def _parse_bool(self, raw_value, slug):
        normalized = (raw_value or "").strip().lower()
        if normalized in TRUTHY:
            return True
        if normalized in FALSY:
            return False
        raise ValueError(f"{slug}: is_active must be true or false")

    def _split_list(self, raw_value, *, separators=(",",)):
        values = [raw_value or ""]
        for separator in separators:
            next_values = []
            for value in values:
                next_values.extend(value.split(separator))
            values = next_values
        return [value.strip() for value in values if value.strip()]

    def _is_allowed_image_path(self, image_path):
        normalized = image_path.replace("\\", "/")
        return any(normalized.startswith(prefix) for prefix in ALLOWED_MEDIA_PREFIXES)
