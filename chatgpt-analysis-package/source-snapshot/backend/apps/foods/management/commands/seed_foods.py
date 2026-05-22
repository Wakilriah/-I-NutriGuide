from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.foods.models import Food, FoodCategory, FoodNutrient
from apps.nutrients.models import Nutrient


SEED_FOODS = [
    ("Orange", "Fruits", "Vitamin C", 53.2, "mg"),
    ("Strawberries", "Fruits", "Vitamin C", 58.8, "mg"),
    ("Kiwi", "Fruits", "Vitamin C", 92.7, "mg"),
    ("Banana", "Fruits", "Magnesium", 27, "mg"),
    ("Spinach", "Vegetables", "Iron", 2.7, "mg"),
    ("Kale", "Vegetables", "Calcium", 150, "mg"),
    ("Broccoli", "Vegetables", "Vitamin C", 89.2, "mg"),
    ("Carrot", "Vegetables", "Fiber", 2.8, "g"),
    ("Lentils", "Legumes", "Iron", 3.3, "mg"),
    ("Chickpeas", "Legumes", "Protein", 8.9, "g"),
    ("Black Beans", "Legumes", "Fiber", 8.7, "g"),
    ("Chicken Breast", "Meat", "Protein", 31, "g"),
    ("Lean Beef", "Meat", "Iron", 2.6, "mg"),
    ("Salmon", "Fish", "Healthy Fat", 6.3, "g"),
    ("Sardines", "Fish", "Calcium", 382, "mg"),
    ("Greek Yogurt", "Dairy", "Protein", 10, "g"),
    ("Milk", "Dairy", "Calcium", 125, "mg"),
    ("Almonds", "Nuts and seeds", "Magnesium", 270, "mg"),
    ("Pumpkin Seeds", "Nuts and seeds", "Zinc", 7.8, "mg"),
    ("Oats", "Grains", "Fiber", 10.6, "g"),
    ("Quinoa", "Grains", "Protein", 4.4, "g"),
]


class Command(BaseCommand):
    help = "Seed baseline foods and their primary nutrient links."

    def handle(self, *args, **options):
        call_command("seed_nutrients")
        created = 0
        updated = 0

        for food_name, category_name, nutrient_name, amount, unit in SEED_FOODS:
            category, _ = FoodCategory.objects.get_or_create(
                slug=slugify(category_name),
                defaults={"name": category_name},
            )
            food, was_created = Food.objects.update_or_create(
                slug=slugify(food_name),
                defaults={
                    "name": food_name,
                    "category": category,
                    "description": f"{food_name} is included as a practical source of {nutrient_name.lower()}.",
                    "is_active": True,
                },
            )
            nutrient = Nutrient.objects.get(slug=slugify(nutrient_name))
            FoodNutrient.objects.update_or_create(
                food=food,
                nutrient=nutrient,
                defaults={"amount": amount, "unit": unit, "per_quantity": 100, "per_unit": "g"},
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(f"Seeded foods: {created} created, {updated} updated."))
