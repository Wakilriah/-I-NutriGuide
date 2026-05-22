from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.nutrients.models import Nutrient
from apps.supplements.models import Supplement, SupplementNutrient


SEED_SUPPLEMENTS = [
    ("Iron", "18 mg", "Iron supplement commonly used to support iron intake.", "Iron", 18, "mg"),
    ("Vitamin C", "500 mg", "Vitamin C supplement.", "Vitamin C", 500, "mg"),
    ("Vitamin D", "1000 IU", "Vitamin D supplement.", "Vitamin D", 1000, "IU"),
    ("Calcium", "500 mg", "Calcium supplement.", "Calcium", 500, "mg"),
    ("Magnesium", "200 mg", "Magnesium supplement.", "Magnesium", 200, "mg"),
    ("Zinc", "15 mg", "Zinc supplement.", "Zinc", 15, "mg"),
    ("Omega 3", "1000 mg", "Omega 3 supplement.", "Healthy Fat", 1, "g"),
    ("Vitamin B12", "1000 mcg", "Vitamin B12 supplement.", "Vitamin B12", 1000, "mcg"),
    ("Multivitamin", "1 tablet", "Broad micronutrient supplement.", "Vitamin C", 60, "mg"),
    ("Folate", "400 mcg", "Folate supplement.", "Vitamin B12", 0, "mcg"),
]


class Command(BaseCommand):
    help = "Seed baseline supplements and their primary nutrient links."

    def handle(self, *args, **options):
        call_command("seed_nutrients")
        created = 0
        updated = 0

        for name, common_dose, description, nutrient_name, amount, unit in SEED_SUPPLEMENTS:
            supplement, was_created = Supplement.objects.update_or_create(
                slug=slugify(name),
                defaults={
                    "name": name,
                    "common_dose": common_dose,
                    "description": description,
                    "is_active": True,
                },
            )
            nutrient = Nutrient.objects.get(slug=slugify(nutrient_name))
            SupplementNutrient.objects.update_or_create(
                supplement=supplement,
                nutrient=nutrient,
                defaults={"amount": amount, "unit": unit},
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(f"Seeded supplements: {created} created, {updated} updated."))
