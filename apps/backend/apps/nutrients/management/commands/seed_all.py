from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed all baseline knowledge-base data."

    def handle(self, *args, **options):
        call_command("seed_nutrients")
        call_command("seed_foods")
        call_command("seed_supplements")
        call_command("seed_rules")
        self.stdout.write(self.style.SUCCESS("Seeded all baseline data."))
