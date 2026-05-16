import csv
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify

from apps.accounts.models import Allergy, DislikedFood, UserProfile
from apps.supplements.models import Supplement, UserSupplement


DISLIKED_PREFIX = "disliked_foods__"
DISEASE_PREFIX = "disease__"
ALLERGY_PREFIX = "allergies__"
SUPPLEMENT_PREFIX = "supplements__"
GOAL_PREFIX = "nutritional_goals__"

SKIP_VALUES = {"no_allergy", "no_illness", "no_supplements"}

GOAL_PRIORITY = [
    "weight_loss",
    "muscle_gain",
    "weight_gain",
    "improve_energy",
    "improve_overall_health",
    "healthy_lifestyle",
]

SUPPLEMENT_SLUGS = {
    "iron": "iron",
    "magnesium": "magnesium",
    "omega_3": "omega-3",
    "vitamin_c": "vitamin-c",
    "vitamin_d": "vitamin-d",
    "zinc": "zinc",
}


@dataclass
class ImportSummary:
    rows_seen: int = 0
    users_created: int = 0
    users_updated: int = 0
    profiles_updated: int = 0
    supplements_linked: int = 0
    allergies_linked: int = 0
    disliked_foods_linked: int = 0


class Command(BaseCommand):
    help = "Import anonymized Google Form user survey rows into local users, profiles, and supplement entries."

    def add_arguments(self, parser):
        parser.add_argument("csv_path", help="Path to the preprocessed Google Form CSV.")
        parser.add_argument("--dry-run", action="store_true", help="Validate and summarize without writing to the database.")
        parser.add_argument("--limit", type=int, help="Import at most this many rows.")
        parser.add_argument(
            "--email-domain",
            default="google-form.local",
            help="Domain used for anonymized generated user emails.",
        )
        parser.add_argument(
            "--skip-seed-supplements",
            action="store_true",
            help="Deprecated alias for --skip-seed-knowledge-base.",
        )
        parser.add_argument(
            "--skip-seed-knowledge-base",
            action="store_true",
            help="Do not seed baseline foods, supplements, nutrients, and association rules before importing.",
        )
        parser.add_argument(
            "--skip-train-recommender",
            action="store_true",
            help="Do not rebuild hybrid recommender artifacts after importing.",
        )

    def handle(self, *args, **options):
        path = Path(options["csv_path"]).expanduser()
        if not path.exists():
            raise CommandError(f"CSV file does not exist: {path}")

        dry_run = options["dry_run"]
        skip_seed = options["skip_seed_knowledge_base"] or options["skip_seed_supplements"]
        if not dry_run and not skip_seed:
            call_command("seed_all")

        rows = list(self._read_rows(path))
        if options["limit"]:
            rows = rows[: options["limit"]]

        summary = ImportSummary(rows_seen=len(rows))
        for row in rows:
            self._import_row(row, summary, dry_run=dry_run, email_domain=options["email_domain"])

        prefix = "Dry run complete" if dry_run else "Import complete"
        self.stdout.write(self.style.SUCCESS(prefix))
        self.stdout.write(
            "Rows: {rows_seen}; users created: {users_created}; users updated: {users_updated}; "
            "profiles updated: {profiles_updated}; supplements linked: {supplements_linked}; "
            "allergies linked: {allergies_linked}; disliked foods linked: {disliked_foods_linked}".format(**summary.__dict__)
        )
        if not dry_run and not options["skip_train_recommender"]:
            call_command("train_recommender")

    def _read_rows(self, path):
        with path.open(newline="", encoding="utf-8-sig") as csv_file:
            reader = csv.DictReader(csv_file)
            required = {"user_id", "age", "gender", "height_cm", "weight_kg", "sports_days_per_week", "bmi"}
            missing = required.difference(reader.fieldnames or [])
            if missing:
                raise CommandError(f"CSV is missing required columns: {', '.join(sorted(missing))}")
            yield from reader

    def _import_row(self, row, summary: ImportSummary, *, dry_run: bool, email_domain: str):
        user_id = str(row.get("user_id", "")).strip()
        if not user_id:
            raise CommandError("Encountered a row without user_id.")

        selected_goals = self._selected_from_prefix(row, GOAL_PREFIX)
        selected_conditions = self._selected_from_prefix(row, DISEASE_PREFIX)
        selected_conditions = [condition for condition in selected_conditions if condition != "no_illness"]
        selected_allergies = [allergy for allergy in self._selected_from_prefix(row, ALLERGY_PREFIX) if allergy != "no_allergy"]
        selected_disliked = self._selected_from_prefix(row, DISLIKED_PREFIX)
        selected_supplements = [
            supplement for supplement in self._selected_from_prefix(row, SUPPLEMENT_PREFIX) if supplement != "no_supplements"
        ]

        if dry_run:
            summary.users_updated += 1
            summary.profiles_updated += 1
            summary.supplements_linked += len(selected_supplements)
            summary.allergies_linked += len(selected_allergies)
            summary.disliked_foods_linked += len(selected_disliked)
            return

        email = f"form-user-{slugify(user_id)}@{email_domain}"
        user_model = get_user_model()
        user, created = user_model.objects.get_or_create(
            email=email,
            defaults={"name": f"Survey User {user_id}", "is_active": True},
        )
        if created:
            user.set_unusable_password()
            summary.users_created += 1
        else:
            summary.users_updated += 1
        user.name = user.name or f"Survey User {user_id}"
        user.is_active = True
        user.save()

        profile, _profile_created = UserProfile.objects.get_or_create(user=user)
        profile.country = str(row.get("country", "")).strip().lower()
        profile.age = self._int_or_none(row.get("age"))
        profile.gender = str(row.get("gender", "")).strip().lower()
        profile.height_cm = self._decimal_or_none(row.get("height_cm"))
        profile.weight_kg = self._decimal_or_none(row.get("weight_kg"))
        profile.bmi = self._decimal_or_none(row.get("bmi"))
        profile.sports_days_per_week = self._int_or_none(row.get("sports_days_per_week"))
        profile.activity_level = self._activity_level(profile.sports_days_per_week)
        profile.goals = selected_goals
        profile.goal = self._primary_goal(selected_goals)
        profile.health_conditions = selected_conditions
        profile.save()
        summary.profiles_updated += 1

        allergies = [self._named_record(Allergy, self._label(value)) for value in selected_allergies]
        profile.allergies.set(allergies)
        summary.allergies_linked += len(allergies)

        user.disliked_foods.all().delete()
        for value in selected_disliked:
            DislikedFood.objects.create(user=user, name=self._label(value), slug=slugify(value))
            summary.disliked_foods_linked += 1

        user.supplements.all().delete()
        for value in selected_supplements:
            supplement = self._get_or_create_supplement(value)
            UserSupplement.objects.create(
                user=user,
                supplement=supplement,
                dose=supplement.common_dose,
                frequency="survey",
                active=True,
            )
            summary.supplements_linked += 1

    def _selected_from_prefix(self, row, prefix):
        selected = []
        for column, value in row.items():
            if column.startswith(prefix) and self._is_truthy(value):
                selected.append(column.removeprefix(prefix))
        return selected

    def _is_truthy(self, value):
        try:
            return Decimal(str(value).strip()) > 0
        except (InvalidOperation, ValueError):
            return str(value).strip().lower() in {"true", "yes", "y"}

    def _int_or_none(self, value):
        try:
            return int(float(str(value).strip()))
        except (TypeError, ValueError):
            return None

    def _decimal_or_none(self, value):
        try:
            return Decimal(str(value).strip()).quantize(Decimal("0.01"))
        except (InvalidOperation, ValueError):
            return None

    def _activity_level(self, sports_days):
        if sports_days is None or sports_days <= 0:
            return "sedentary"
        if sports_days == 1:
            return "light"
        if sports_days <= 3:
            return "moderate"
        return "active"

    def _primary_goal(self, goals):
        for goal in GOAL_PRIORITY:
            if goal in goals:
                return goal
        return goals[0] if goals else ""

    def _named_record(self, model, label):
        record, _created = model.objects.get_or_create(slug=slugify(label), defaults={"name": label})
        return record

    def _get_or_create_supplement(self, value):
        slug = SUPPLEMENT_SLUGS.get(value, slugify(value))
        supplement = Supplement.objects.filter(slug=slug).first()
        if supplement:
            return supplement
        return Supplement.objects.create(name=self._label(value), slug=slug, is_active=True)

    def _label(self, value):
        return str(value).replace("_", " ").title()
