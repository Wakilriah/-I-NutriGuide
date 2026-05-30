import math

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.recommendations.services.association import AssociationRulesEngine
from apps.recommendations.services.training import build_transactions, save_artifacts, train_from_database
from apps.rules.models import MinedAssociationRule
from apps.rules.services import rule_key


class Command(BaseCommand):
    help = "Generate data-driven association rules and refresh hybrid recommender artifacts."

    def add_arguments(self, parser):
        parser.add_argument("--min-support", type=float, default=0.01)
        parser.add_argument("--min-confidence", type=float, default=0.2)
        parser.add_argument("--min-lift", type=float, default=1.0)
        parser.add_argument("--skip-artifacts", action="store_true")

    def handle(self, *args, **options):
        transactions = build_transactions()
        engine = AssociationRulesEngine().fit(
            transactions,
            min_support=options["min_support"],
            min_confidence=options["min_confidence"],
            min_lift=options["min_lift"],
        )
        max_lift = max([rule.get("lift", 1) for rule in engine.rules] + [1.0001])
        imported = 0
        updated = 0

        with transaction.atomic():
            for mined in engine.rules:
                antecedents = [mined["antecedent"]]
                consequents = [mined["consequent"]]
                score = self._score(mined["confidence"], mined["lift"], max_lift)
                _obj, created = MinedAssociationRule.objects.update_or_create(
                    rule_key=rule_key(antecedents, consequents, source="generated_hybrid", rule_type="positive_synergy"),
                    defaults={
                        "antecedent_items": antecedents,
                        "consequent_items": consequents,
                        "support": mined["support"],
                        "confidence": mined["confidence"],
                        "lift": mined["lift"],
                        "score": score,
                        "rule_type": MinedAssociationRule.RuleType.POSITIVE_SYNERGY,
                        "source": "generated_hybrid",
                        "explanation": self._explanation(antecedents, consequents, mined, score),
                        "is_active": True,
                    },
                )
                imported += int(created)
                updated += int(not created)

        artifact_path = None
        if not options["skip_artifacts"]:
            artifacts = train_from_database()
            artifact_path = save_artifacts(artifacts)

        self.stdout.write(
            self.style.SUCCESS(
                f"Generated association rules: imported={imported}, updated={updated}, "
                f"transactions={len(transactions)}, artifacts={artifact_path or 'skipped'}"
            )
        )

    def _score(self, confidence, lift, max_lift):
        if lift < 1 or max_lift <= 1:
            return 0.0
        return round(max(min(confidence * (math.log(max(lift, 1.0001)) / math.log(max(max_lift, 1.0001))), 1.0), 0.0), 4)

    def _explanation(self, antecedents, consequents, mined, score):
        readable_antecedent = ", ".join(item.replace(":", " ").replace("_", " ") for item in antecedents)
        readable_consequent = ", ".join(item.replace(":", " ").replace("_", " ") for item in consequents)
        return (
            f"{readable_consequent.title()} is associated with {readable_antecedent} "
            f"(support {mined['support']:.2f}, confidence {mined['confidence']:.2f}, "
            f"lift {mined['lift']:.2f}, score {score:.2f})."
        )
