import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create or update a production superuser from ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_NAME."

    def handle(self, *args, **options):
        email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
        password = os.environ.get("ADMIN_PASSWORD", "")
        name = os.environ.get("ADMIN_NAME", "I-NutriGuide Admin").strip() or "I-NutriGuide Admin"

        if not email:
            raise CommandError("ADMIN_EMAIL is required.")
        if not password:
            raise CommandError("ADMIN_PASSWORD is required.")

        User = get_user_model()
        user, created = User.objects.get_or_create(
            email=email,
            defaults={"name": name, "is_staff": True, "is_superuser": True, "is_active": True},
        )

        user.name = name
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save(update_fields=["name", "password", "is_staff", "is_superuser", "is_active"])

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{action} superuser {email}."))
