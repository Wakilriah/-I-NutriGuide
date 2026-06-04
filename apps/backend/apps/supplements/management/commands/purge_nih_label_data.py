from django.core.management.base import BaseCommand
from django.db.models import Q

from apps.common.neo4j_client import get_neo4j_driver
from apps.supplements.models import (
    Supplement,
    SupplementFactSheet,
    SupplementNutrient,
    UserSupplement,
)


class Command(BaseCommand):
    help = "Remove legacy NIH DSLD/DSID label-product data while keeping ODS fact sheets."

    def add_arguments(self, parser):
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Actually delete stale rows. Without this flag the command is a dry run.",
        )
        parser.add_argument(
            "--neo4j",
            action="store_true",
            help="Also remove legacy supplement-label nodes from Neo4j.",
        )

    def handle(self, *args, **options):
        old_supplements = Supplement.objects.filter(
            Q(source__in=["NIH DSLD", "NIH DSID"])
            | Q(slug__startswith="dsld-")
            | Q(description__icontains="Dietary Supplement Label Database")
        )
        old_ids = list(old_supplements.values_list("id", flat=True))
        referenced_ids = set(
            UserSupplement.objects.filter(supplement_id__in=old_ids).values_list(
                "supplement_id", flat=True
            )
        )
        deletable_ids = [item_id for item_id in old_ids if item_id not in referenced_ids]

        summary = {
            "legacy_supplements": len(old_ids),
            "legacy_supplements_deletable": len(deletable_ids),
            "legacy_supplements_kept_for_user_history": len(referenced_ids),
            "legacy_supplement_nutrient_links": SupplementNutrient.objects.filter(
                supplement_id__in=old_ids
            ).count(),
            "ods_fact_sheets_kept": SupplementFactSheet.objects.count(),
        }

        if not options["confirm"]:
            self.stdout.write(
                self.style.WARNING(
                    f"Dry run only. Re-run with --confirm to purge legacy label data: {summary}"
                )
            )
            return

        SupplementNutrient.objects.filter(supplement_id__in=deletable_ids).delete()
        deleted = Supplement.objects.filter(id__in=deletable_ids).delete()

        if referenced_ids:
            Supplement.objects.filter(id__in=referenced_ids).update(is_active=False)

        if options["neo4j"]:
            self._purge_neo4j()

        summary["deleted"] = deleted
        self.stdout.write(
            self.style.SUCCESS(
                f"Purged legacy NIH DSLD/DSID supplement-label data: {summary}"
            )
        )

    def _purge_neo4j(self):
        driver = get_neo4j_driver()
        with driver.session() as session:
            self._delete_neo4j_nodes(session, "SupplementIngredient", batch_size=1000)
            self._delete_neo4j_nodes(session, "IngredientGroup", batch_size=50)
            self._delete_neo4j_nodes(session, "ResearchEstimate", batch_size=1000)
            self._delete_neo4j_nodes(
                session,
                "Supplement",
                "WHERE n.slug STARTS WITH 'dsld-'",
                batch_size=1000,
            )

    def _delete_neo4j_nodes(self, session, label, where_clause="", batch_size=500):
        relationship_query = (
            f"MATCH (n:{label}) "
            f"{where_clause} "
            "MATCH (n)-[r]-() "
            f"CALL {{ WITH r DELETE r }} IN TRANSACTIONS OF {batch_size} ROWS"
        )
        node_query = (
            f"MATCH (n:{label}) "
            f"{where_clause} "
            f"CALL {{ WITH n DELETE n }} IN TRANSACTIONS OF {batch_size} ROWS"
        )
        session.run(relationship_query).consume()
        session.run(node_query).consume()
        self.stdout.write(f"Deleted legacy Neo4j {label} nodes.")
