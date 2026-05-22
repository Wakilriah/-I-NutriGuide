from django.core.management.base import BaseCommand

from apps.nutrients.models import NutrientInteraction


INTERACTIONS = [
    ("nutrient", "vitamin_c", "nutrient", "iron", "enhances", "Vitamin C may improve non-heme iron absorption.", "high", "info"),
    ("nutrient", "calcium", "nutrient", "iron", "inhibits", "Calcium can reduce iron absorption when taken at the same time.", "high", "caution"),
    ("nutrient", "caffeine", "nutrient", "iron", "inhibits", "Caffeine-containing drinks may reduce iron absorption around meals.", "medium", "caution"),
    ("nutrient", "vitamin_d", "nutrient", "calcium", "supports", "Vitamin D is commonly associated with normal calcium absorption.", "high", "info"),
    ("nutrient", "fat", "nutrient", "vitamin_d", "supports", "Dietary fat can help absorption of fat-soluble vitamin D.", "medium", "info"),
    ("nutrient", "zinc", "nutrient", "copper", "should_not_combine", "High zinc intake may compete with copper over time.", "medium", "caution"),
    ("nutrient", "magnesium", "nutrient", "muscle_relaxation", "supports", "Magnesium is commonly associated with normal muscle function.", "medium", "info"),
    ("nutrient", "vitamin_k", "supplement", "anticoagulants", "should_not_combine", "Vitamin K intake may matter for people using anticoagulant medication. Ask a clinician for personal advice.", "high", "warning"),
]


class Command(BaseCommand):
    help = "Seed baseline nutrient and supplement interaction knowledge."

    def handle(self, *args, **options):
        created = 0
        updated = 0
        for source_type, source_key, target_type, target_key, interaction_type, mechanism, evidence_level, severity in INTERACTIONS:
            _item, was_created = NutrientInteraction.objects.update_or_create(
                source_type=source_type,
                source_key=source_key,
                target_type=target_type,
                target_key=target_key,
                interaction_type=interaction_type,
                defaults={
                    "mechanism": mechanism,
                    "evidence_level": evidence_level,
                    "severity": severity,
                    "active": True,
                },
            )
            created += int(was_created)
            updated += int(not was_created)
        self.stdout.write(self.style.SUCCESS(f"Seeded nutrient interactions: {created} created, {updated} updated."))
