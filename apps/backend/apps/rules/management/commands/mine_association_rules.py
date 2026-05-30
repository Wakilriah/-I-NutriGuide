from collections import Counter
from itertools import combinations

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.rules.models import AssociationTransaction, MinedAssociationRule
from apps.rules.services import normalize_rule_item, rule_key


class Command(BaseCommand):
    help = "Mine association rules from imported I-NutriGuide transaction data."

    def add_arguments(self, parser):
        parser.add_argument("--mode", choices=["long", "one_hot"], default="long")
        parser.add_argument("--min-support", type=float, default=0.02)
        parser.add_argument("--min-confidence", type=float, default=0.2)
        parser.add_argument("--min-lift", type=float, default=1.05)
        parser.add_argument("--max-antecedent-size", type=int, default=2)

    def handle(self, *args, **options):
        transactions = self._load_transactions(options["mode"])
        rules = self._mine(
            transactions,
            min_support=options["min_support"],
            min_confidence=options["min_confidence"],
            min_lift=options["min_lift"],
            max_antecedent_size=options["max_antecedent_size"],
            source=f"mined_{options['mode']}",
        )
        summary = {"imported": 0, "updated": 0, "skipped": 0, "errors": 0}
        with transaction.atomic():
            for rule in rules:
                _obj, created = MinedAssociationRule.objects.update_or_create(
                    rule_key=rule["rule_key"],
                    defaults=rule,
                )
                summary["imported" if created else "updated"] += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"Mining complete: imported={summary['imported']}, updated={summary['updated']}, "
                f"skipped={summary['skipped']}, errors={summary['errors']}"
            )
        )

    def _load_transactions(self, mode):
        queryset = AssociationTransaction.objects.prefetch_related("items")
        transactions = []
        for transaction in queryset:
            if mode == "one_hot":
                items = {normalize_rule_item(item) for item in transaction.one_hot_items or [] if normalize_rule_item(item)}
            else:
                items = {normalize_rule_item(item.item) for item in transaction.items.all() if normalize_rule_item(item.item)}
            if len(items) >= 2:
                transactions.append(items)
        return transactions

    def _mine(self, transactions, *, min_support, min_confidence, min_lift, max_antecedent_size, source):
        total = max(len(transactions), 1)
        item_counts = Counter(item for transaction in transactions for item in transaction)
        antecedent_counts = Counter()
        rule_counts = Counter()
        for transaction in transactions:
            foods = sorted(item for item in transaction if item.startswith("food:"))
            antecedent_pool = sorted(item for item in transaction if not item.startswith("food:"))
            for size in range(1, max(1, max_antecedent_size) + 1):
                for antecedent in combinations(antecedent_pool, size):
                    antecedent_counts[antecedent] += 1
                    for food_item in foods:
                        rule_counts[(antecedent, food_item)] += 1

        rules = []
        for (antecedent, food_item), count in rule_counts.items():
            support = count / total
            confidence = count / max(antecedent_counts[antecedent], 1)
            consequent_support = item_counts[food_item] / total
            lift = confidence / max(consequent_support, 0.0001)
            if support < min_support or confidence < min_confidence or lift < min_lift:
                continue
            score = confidence if lift >= 1 else 0.0
            antecedent_items = list(antecedent)
            consequent_items = [food_item]
            has_supplement = any(item.startswith(("supp:", "supplement:")) for item in antecedent_items)
            rule_type = "positive_synergy" if has_supplement else "neutral_pattern"
            explanation = self._explanation(antecedent_items, food_item, confidence, lift)
            rules.append(
                {
                    "rule_key": rule_key(antecedent_items, consequent_items, source=source, rule_type=rule_type),
                    "antecedent_items": antecedent_items,
                    "consequent_items": consequent_items,
                    "support": round(support, 4),
                    "confidence": round(confidence, 4),
                    "lift": round(lift, 4),
                    "score": round(score, 4),
                    "rule_type": rule_type,
                    "source": source,
                    "explanation": explanation,
                    "is_active": True,
                }
            )
        return sorted(rules, key=lambda rule: (rule["confidence"], rule["lift"], rule["support"]), reverse=True)

    def _explanation(self, antecedent_items, food_item, confidence, lift):
        readable_antecedent = ", ".join(item.replace(":", " ").replace("_", " ") for item in antecedent_items)
        readable_food = food_item.split(":", 1)[1].replace("_", " ")
        return (
            f"{readable_food.title()} appears with {readable_antecedent} in the association dataset "
            f"(confidence {confidence:.2f}, lift {lift:.2f})."
        )
