from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.accounts.models import Allergy, DietaryRestriction, DislikedFood, UserProfile
from apps.feedback.models import RecommendationFeedback
from apps.recommendations.services.engine import generate_recommendations
from apps.supplements.models import Supplement, UserSupplement


ADMIN_EMAIL = "riahwakil@gmail.com"
ADMIN_PASSWORD = "NutriGuide!2026-Riah"
DEMO_EMAIL = "demo.user@inutriguide.local"
DEMO_PASSWORD = "DemoUser!2026"


class Command(BaseCommand):
    help = "Seed deterministic demo users, profile, supplement, recommendation, and feedback data."

    def handle(self, *args, **options):
        call_command("seed_all")
        user_model = get_user_model()

        admin, admin_created = user_model.objects.get_or_create(
            email=ADMIN_EMAIL,
            defaults={"name": "Riah Wakil", "is_staff": True, "is_superuser": True},
        )
        admin.is_staff = True
        admin.is_superuser = True
        admin.is_active = True
        admin.name = admin.name or "Riah Wakil"
        admin.set_password(ADMIN_PASSWORD)
        admin.save(update_fields=["is_staff", "is_superuser", "is_active", "name", "password"])

        demo_user, demo_created = user_model.objects.get_or_create(
            email=DEMO_EMAIL,
            defaults={"name": "Demo User"},
        )
        demo_user.name = "Demo User"
        demo_user.is_active = True
        demo_user.set_password(DEMO_PASSWORD)
        demo_user.save(update_fields=["name", "is_active", "password"])

        profile, _created = UserProfile.objects.get_or_create(user=demo_user)
        profile.age = 34
        profile.gender = "female"
        profile.height_cm = 168
        profile.weight_kg = 64
        profile.goal = "general_health"
        profile.activity_level = "moderate"
        profile.diet_type = UserProfile.DietType.VEGETARIAN
        profile.save()

        allergy = self._named_record(Allergy, "Shellfish")
        restriction = self._named_record(DietaryRestriction, "Vegetarian")
        profile.allergies.set([allergy])
        profile.dietary_restrictions.set([restriction])

        DislikedFood.objects.update_or_create(
            user=demo_user,
            slug="soda",
            defaults={"name": "Soda"},
        )

        supplement = Supplement.objects.filter(slug="vitamin-d").first() or Supplement.objects.filter(is_active=True).first()
        if supplement is None:
            raise RuntimeError("No active supplements available after seed_all.")

        UserSupplement.objects.update_or_create(
            user=demo_user,
            supplement=supplement,
            defaults={"dose": supplement.common_dose or "1000 IU", "frequency": "daily", "time_of_day": "morning", "active": True},
        )

        run = demo_user.recommendation_runs.prefetch_related("items").order_by("-created_at").first()
        if run is None or not run.items.exists():
            run = generate_recommendations(demo_user, limit=5)

        first_item = run.items.order_by("rank").first()
        if first_item is None:
            raise RuntimeError("Demo recommendation run did not produce any items.")

        RecommendationFeedback.objects.update_or_create(
            user=demo_user,
            recommendation_item=first_item,
            defaults={"rating": 5, "is_helpful": True, "comment": "Useful recommendation for the demo flow."},
        )

        self.stdout.write(self.style.SUCCESS("Seeded demo data."))
        self.stdout.write(f"Admin: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        self.stdout.write(f"Demo user: {DEMO_EMAIL} / {DEMO_PASSWORD}")

    def _named_record(self, model, name):
        record, _created = model.objects.get_or_create(slug=slugify(name), defaults={"name": name})
        return record
