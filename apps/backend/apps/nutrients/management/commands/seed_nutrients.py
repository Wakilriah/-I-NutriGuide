from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.nutrients.models import Nutrient


SEED_NUTRIENTS = [
    ("Vitamin C", "mg", "Supports normal immune function and helps improve non-heme iron absorption."),
    ("Iron", "mg", "Essential mineral used in oxygen transport."),
    ("Calcium", "mg", "Supports normal bone and muscle function."),
    ("Vitamin D", "IU", "Helps the body absorb calcium and supports bone health."),
    ("Magnesium", "mg", "Supports muscle, nerve, and energy metabolism functions."),
    ("Zinc", "mg", "Supports normal immune function and metabolism."),
    ("Protein", "g", "Macronutrient needed for tissue repair and satiety."),
    ("Fiber", "g", "Supports digestive health and meal quality."),
    ("Healthy Fat", "g", "Dietary fat source that can aid absorption of fat-soluble vitamins."),
    ("Vitamin B12", "mcg", "Supports red blood cell formation and nervous system function."),
]


class Command(BaseCommand):
    help = "Seed baseline nutrients for recommendation and knowledge-base features."

    def handle(self, *args, **options):
        created = 0
        updated = 0

        for name, unit, description in SEED_NUTRIENTS:
            _nutrient, was_created = Nutrient.objects.update_or_create(
                slug=slugify(name),
                defaults={"name": name, "unit": unit, "description": description},
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(f"Seeded nutrients: {created} created, {updated} updated."))
