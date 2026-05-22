from django.core.management.base import BaseCommand

from apps.recommendations.services.training import save_artifacts, train_from_database


class Command(BaseCommand):
    help = "Train the hybrid food recommender from database profiles, supplements, rules, and interactions."

    def handle(self, *args, **options):
        artifacts = train_from_database()
        path = save_artifacts(artifacts)
        stats = artifacts["stats"]
        self.stdout.write(self.style.SUCCESS("Hybrid recommender trained"))
        self.stdout.write(f"Artifacts: {path}")
        self.stdout.write(f"Users: {stats['users']}")
        self.stdout.write(f"Foods: {stats['foods']}")
        self.stdout.write(f"Interactions: {stats['interactions']}")
        self.stdout.write(f"Rules: {stats['rules']}")
