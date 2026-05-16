from django.core.management.base import BaseCommand

from apps.rules.models import AssociationRule


SEED_RULES = [
    (
        "supplement",
        "iron",
        "nutrient",
        "vitamin-c",
        0.32,
        0.84,
        1.45,
        "Vitamin C-rich foods may support non-heme iron absorption when paired with iron intake.",
    ),
    (
        "nutrient",
        "vitamin-c",
        "nutrient",
        "iron",
        0.30,
        0.80,
        1.35,
        "Vitamin C-containing foods are commonly paired with iron-rich foods because vitamin C may support non-heme iron absorption.",
    ),
    (
        "supplement",
        "vitamin-d",
        "nutrient",
        "calcium",
        0.28,
        0.78,
        1.30,
        "Calcium-rich foods can complement vitamin D intake because vitamin D supports calcium absorption.",
    ),
    (
        "supplement",
        "calcium",
        "nutrient",
        "vitamin-d",
        0.24,
        0.74,
        1.25,
        "Vitamin D-containing foods can complement calcium intake because vitamin D supports normal calcium absorption.",
    ),
    (
        "supplement",
        "magnesium",
        "nutrient",
        "magnesium",
        0.22,
        0.70,
        1.18,
        "Magnesium-rich foods can complement magnesium supplementation as part of an overall dietary pattern.",
    ),
    (
        "supplement",
        "zinc",
        "nutrient",
        "zinc",
        0.22,
        0.72,
        1.20,
        "Zinc-rich foods can complement zinc supplementation and support overall micronutrient intake.",
    ),
    (
        "supplement",
        "vitamin-b12",
        "nutrient",
        "vitamin-b12",
        0.20,
        0.70,
        1.18,
        "Vitamin B12-rich foods can complement B12 supplementation as part of balanced nutrition.",
    ),
    (
        "supplement",
        "omega-3",
        "category",
        "vegetables",
        0.18,
        0.62,
        1.10,
        "Colorful vegetables add fiber and micronutrients that round out meals with omega 3 supplementation.",
    ),
]


class Command(BaseCommand):
    help = "Seed baseline association rules used by the recommendation engine."

    def handle(self, *args, **options):
        created = 0
        updated = 0

        for antecedent_type, antecedent_slug, consequent_type, consequent_slug, support, confidence, lift, explanation in SEED_RULES:
            _rule, was_created = AssociationRule.objects.update_or_create(
                antecedent_type=antecedent_type,
                antecedent_slug=antecedent_slug,
                consequent_type=consequent_type,
                consequent_slug=consequent_slug,
                defaults={
                    "support": support,
                    "confidence": confidence,
                    "lift": lift,
                    "explanation": explanation,
                    "is_active": True,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(f"Seeded association rules: {created} created, {updated} updated."))
