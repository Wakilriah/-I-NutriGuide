from django.core.management.base import BaseCommand
from django.db import transaction

from apps.recommendations.services.training import empty_artifacts, save_artifacts
from apps.rules.models import AssociationRule, FoodSupplementSynergyRule, MinedAssociationRule


class Command(BaseCommand):
    help = "Refresh recommendation rule cache from imported seed rules and mined association rules."

    def handle(self, *args, **options):
        summary = {"imported": 0, "updated": 0, "skipped": 0, "errors": 0}
        with transaction.atomic():
            self._sync_seed_rules(summary)
            self._sync_mined_rules(summary)

        from apps.recommendations.services.training import build_rules_from_database

        artifacts = empty_artifacts()
        artifacts["rules"] = build_rules_from_database()
        artifacts["stats"]["rules"] = len(artifacts["rules"])
        save_artifacts(artifacts)
        self.stdout.write(
            self.style.SUCCESS(
                f"Refresh complete: imported={summary['imported']}, updated={summary['updated']}, "
                f"skipped={summary['skipped']}, errors={summary['errors']}, cached_rules={len(artifacts['rules'])}"
            )
        )

    def _sync_seed_rules(self, summary):
        queryset = FoodSupplementSynergyRule.objects.filter(is_active=True, association_type="positive")
        for seed in queryset:
            antecedent_slug = self._item_slug(seed.supplement_item)
            consequent_slug = self._item_slug(seed.food_item)
            if not antecedent_slug or not consequent_slug:
                summary["skipped"] += 1
                continue
            _rule, created = AssociationRule.objects.update_or_create(
                antecedent_type=AssociationRule.EntityType.SUPPLEMENT,
                antecedent_slug=antecedent_slug,
                consequent_type=AssociationRule.EntityType.FOOD,
                consequent_slug=consequent_slug,
                defaults={
                    "support": max(min(seed.seed_weight, 1), 0),
                    "confidence": max(min(seed.seed_weight, 1), 0),
                    "lift": 1 + max(seed.seed_weight, 0),
                    "explanation": seed.reason,
                    "is_active": True,
                },
            )
            summary["imported" if created else "updated"] += 1

    def _sync_mined_rules(self, summary):
        queryset = MinedAssociationRule.objects.filter(is_active=True, rule_type="positive_synergy")
        for mined in queryset:
            supplement_items = [item for item in mined.antecedent_items if item.startswith(("supp:", "supplement:"))]
            food_items = [item for item in mined.consequent_items if item.startswith("food:")]
            if not supplement_items or not food_items:
                summary["skipped"] += 1
                continue
            _rule, created = AssociationRule.objects.update_or_create(
                antecedent_type=AssociationRule.EntityType.SUPPLEMENT,
                antecedent_slug=self._item_slug(supplement_items[0]),
                consequent_type=AssociationRule.EntityType.FOOD,
                consequent_slug=self._item_slug(food_items[0]),
                defaults={
                    "support": mined.support,
                    "confidence": mined.confidence,
                    "lift": mined.lift,
                    "explanation": mined.explanation,
                    "is_active": True,
                },
            )
            summary["imported" if created else "updated"] += 1

    def _item_slug(self, item):
        return item.split(":", 1)[1] if ":" in item else item
