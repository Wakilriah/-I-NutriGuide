import hashlib
import re
import tempfile
import time
import zipfile
from datetime import date
from decimal import Decimal, InvalidOperation
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from xml.etree import ElementTree

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from django.utils.text import slugify

from apps.nutrients.models import Nutrient
from apps.recommendations.services.normalizer import normalize_token
from apps.supplements.models import (
    Supplement,
    SupplementDataImportCheckpoint,
    SupplementIngredient,
    SupplementIngredientGroup,
    SupplementLabelStatement,
    SupplementNutrient,
    SupplementResearchEstimate,
)


DSLD_SOURCE = "NIH DSLD"
DSID_SOURCE = "NIH DSID"
DSLD_API_BASE = "https://api.ods.od.nih.gov/dsld/v9"
DSID_RELEASE = "DSID-4"
DSID_COMBINED_XLSX_URL = (
    "https://api.ods.od.nih.gov/dsid-dev/s3/dsid_database/DSID4CombinedDataFiles.xlsx"
)
USER_AGENT = "I-NutriGuide/1.0 nutrition data importer"
DSLD_BROWSE_MAX_WINDOW = 10000

INGREDIENT_GROUP_TERMS = ["5", *list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")]
DSLD_PRODUCT_TERMS = ["Other", *list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")]
DSLD_PRODUCT_TYPE_CODES = [
    "a1305",  # Amino Acid/Protein
    "a1306",  # Botanical
    "a1326",  # Fiber and Other Nutrients
    "a1310",  # Omega 3 and Other Fatty Acids
    "a1302",  # Vitamin
    "a1299",  # Mineral
    "a1316",  # Single Vitamin and Mineral
    "a1315",  # Multi-Vitamin and Mineral
    "a1317",  # Botanicals with Nutrients
    "a1309",  # Non-Nutrient/Non-Botanical
    "a1325",  # Other Combinations
]
DSLD_SUPPLEMENT_FORM_CODES = [
    "e0164",  # Bars
    "e0159",  # Capsules
    "e0161",  # Softgel Capsules
    "e0155",  # Tablets and Pills
    "e0176",  # Gummies and Jellies
    "e0165",  # Liquids
    "e0174",  # Lozenges
    "e0162",  # Powders
    "e0172",  # Other
    "e0177",  # Unknown
]
DSLD_TARGET_GROUP_CODES = ["p0250", "p0192", "p0266", "p0253"]


class Command(BaseCommand):
    help = "Import full NIH DSLD supplement data, DSLD ingredient groups/fact sources, and DSID research estimates."

    def add_arguments(self, parser):
        parser.add_argument("--skip-dsld-products", action="store_true")
        parser.add_argument("--skip-ingredient-groups", action="store_true")
        parser.add_argument("--skip-dsid", action="store_true")
        parser.add_argument("--dsld-page-size", type=int, default=5000)
        parser.add_argument("--dsld-start", type=int, default=0)
        parser.add_argument(
            "--dsld-limit",
            type=int,
            default=0,
            help="0 means import all available DSLD labels.",
        )
        parser.add_argument(
            "--dsld-mode",
            choices=["letters", "search", "search-partitions"],
            default="letters",
        )
        parser.add_argument("--resume", action="store_true")
        parser.add_argument("--include-label-details", action="store_true")
        parser.add_argument(
            "--detail-limit",
            type=int,
            default=0,
            help="0 means no limit when --include-label-details is set.",
        )
        parser.add_argument("--ingredient-group-page-size", type=int, default=1000)
        parser.add_argument("--dsid-url", default=DSID_COMBINED_XLSX_URL)
        parser.add_argument("--sync-neo4j", action="store_true")

    def handle(self, *args, **options):
        summary = {
            "dsld_products": 0,
            "dsld_label_details": 0,
            "dsld_ingredients": 0,
            "dsld_statements": 0,
            "dsld_ingredient_groups": 0,
            "dsid_estimates": 0,
        }

        if not options["skip_ingredient_groups"]:
            summary["dsld_ingredient_groups"] = self._import_ingredient_groups(
                options["ingredient_group_page_size"]
            )

        if not options["skip_dsid"]:
            summary["dsid_estimates"] = self._import_dsid_estimates(options["dsid_url"])

        if not options["skip_dsld_products"]:
            product_summary = self._import_dsld_products(options)
            summary.update(product_summary)

        if options["sync_neo4j"]:
            call_command("sync_to_neo4j")

        self.stdout.write(
            self.style.SUCCESS(f"NIH supplement import complete: {summary}")
        )

    def _import_dsld_products(self, options):
        if options["dsld_mode"] == "letters":
            return self._import_dsld_products_by_terms(options)
        if options["dsld_mode"] == "search-partitions":
            return self._import_dsld_products_by_search_partitions(options)
        checkpoint, _created = SupplementDataImportCheckpoint.objects.get_or_create(
            source="NIH DSLD products search"
        )
        cursor = checkpoint.cursor if options["resume"] else options["dsld_start"]
        limit = options["dsld_limit"]
        page_size = max(1, min(options["dsld_page_size"], 5000))
        imported = 0
        detail_imported = 0
        ingredients = 0
        statements = 0
        total_count = checkpoint.total_count

        checkpoint.status = "running"
        checkpoint.metadata = {
            "include_label_details": options["include_label_details"],
            "limit": limit,
        }
        checkpoint.save(update_fields=["status", "metadata", "updated_at"])

        while True:
            if limit and imported >= limit:
                break
            current_page_size = min(page_size, limit - imported) if limit else page_size
            params = urlencode({"q": "*", "size": current_page_size, "from": cursor})
            payload = self._get_json(f"{DSLD_API_BASE}/search-filter?{params}")
            hits = payload.get("hits", [])
            total_count = int(
                payload.get("stats", {}).get("count") or total_count or len(hits)
            )
            if not hits:
                break

            page_summary = self._upsert_dsld_hits(
                hits,
                include_details=options["include_label_details"],
                detail_remaining=(
                    max(options["detail_limit"] - detail_imported, 0)
                    if options["detail_limit"]
                    else None
                ),
            )
            imported += len(hits)
            detail_imported += page_summary["details"]
            ingredients += page_summary["ingredients"]
            statements += page_summary["statements"]
            cursor += len(hits)

            checkpoint.cursor = cursor
            checkpoint.total_count = total_count
            checkpoint.status = "partial" if limit and imported >= limit else "running"
            checkpoint.metadata = {
                "last_page_size": len(hits),
                "imported_this_run": imported,
                "include_label_details": options["include_label_details"],
            }
            checkpoint.save(
                update_fields=[
                    "cursor",
                    "total_count",
                    "status",
                    "metadata",
                    "updated_at",
                ]
            )
            self.stdout.write(
                f"Imported DSLD products through cursor {cursor}/{total_count}"
            )

            if options["detail_limit"] and detail_imported >= options["detail_limit"]:
                options["include_label_details"] = False
            if cursor >= total_count:
                break

        checkpoint.status = "complete" if cursor >= total_count else "partial"
        checkpoint.total_count = total_count
        checkpoint.save(update_fields=["status", "total_count", "updated_at"])
        return {
            "dsld_products": imported,
            "dsld_label_details": detail_imported,
            "dsld_ingredients": ingredients,
            "dsld_statements": statements,
        }

    def _import_dsld_products_by_terms(self, options):
        checkpoint, _created = SupplementDataImportCheckpoint.objects.get_or_create(
            source="NIH DSLD products letters"
        )
        metadata = checkpoint.metadata or {}
        start_term_index = (
            int(metadata.get("term_index", 0)) if options["resume"] else 0
        )
        cursor = checkpoint.cursor if options["resume"] else options["dsld_start"]
        limit = options["dsld_limit"]
        page_size = max(1, min(options["dsld_page_size"], 5000))
        imported = 0
        detail_imported = 0
        ingredients = 0
        statements = 0
        capped_terms = {}

        checkpoint.status = "running"
        checkpoint.metadata = {
            "mode": "letters",
            "term_index": start_term_index,
            "term": (
                DSLD_PRODUCT_TERMS[start_term_index]
                if start_term_index < len(DSLD_PRODUCT_TERMS)
                else ""
            ),
            "include_label_details": options["include_label_details"],
            "limit": limit,
        }
        checkpoint.save(update_fields=["status", "metadata", "updated_at"])

        for term_index in range(start_term_index, len(DSLD_PRODUCT_TERMS)):
            term = DSLD_PRODUCT_TERMS[term_index]
            if term_index != start_term_index:
                cursor = 0
            while True:
                if limit and imported >= limit:
                    break
                if cursor >= DSLD_BROWSE_MAX_WINDOW:
                    capped_terms[term] = cursor
                    self.stderr.write(
                        f"DSLD browse-products term '{term}' reached the API window limit at {cursor}; "
                        "continuing with the next term."
                    )
                    break
                current_page_size = (
                    min(page_size, limit - imported) if limit else page_size
                )
                params = urlencode(
                    {
                        "method": "by_letter",
                        "q": term,
                        "size": current_page_size,
                        "from": cursor,
                    }
                )
                try:
                    payload = self._get_json(
                        f"{DSLD_API_BASE}/browse-products/?{params}"
                    )
                except Exception as exc:
                    self.stderr.write(
                        f"Skipped DSLD product term '{term}' at cursor {cursor}: {exc}"
                    )
                    break
                if isinstance(payload, list):
                    hits = []
                    total_for_term = cursor
                else:
                    hits = payload.get("hits", [])
                    total_for_term = int(
                        payload.get("total", {}).get("value") or cursor
                    )
                if not hits:
                    break
                page_summary = self._upsert_dsld_hits(
                    hits,
                    include_details=options["include_label_details"],
                    detail_remaining=(
                        max(options["detail_limit"] - detail_imported, 0)
                        if options["detail_limit"]
                        else None
                    ),
                )
                imported += len(hits)
                detail_imported += page_summary["details"]
                ingredients += page_summary["ingredients"]
                statements += page_summary["statements"]
                cursor += len(hits)

                checkpoint.cursor = cursor
                checkpoint.total_count = total_for_term
                checkpoint.status = "partial"
                checkpoint.metadata = {
                    "mode": "letters",
                    "term_index": term_index,
                    "term": term,
                    "imported_this_run": imported,
                    "term_cursor": cursor,
                    "term_total": total_for_term,
                    "include_label_details": options["include_label_details"],
                }
                checkpoint.save(
                    update_fields=[
                        "cursor",
                        "total_count",
                        "status",
                        "metadata",
                        "updated_at",
                    ]
                )
                self.stdout.write(
                    f"Imported DSLD products term {term} through cursor {cursor}/{total_for_term}"
                )

                if (
                    options["detail_limit"]
                    and detail_imported >= options["detail_limit"]
                ):
                    options["include_label_details"] = False
                if cursor >= total_for_term:
                    break
            if limit and imported >= limit:
                break

        checkpoint.status = "complete" if not limit or imported >= limit else "partial"
        checkpoint.metadata = {
            **(checkpoint.metadata or {}),
            "imported_this_run": imported,
            "completed_terms": len(DSLD_PRODUCT_TERMS),
            "capped_terms": capped_terms,
        }
        checkpoint.save(update_fields=["status", "metadata", "updated_at"])
        return {
            "dsld_products": imported,
            "dsld_label_details": detail_imported,
            "dsld_ingredients": ingredients,
            "dsld_statements": statements,
        }

    def _import_dsld_products_by_search_partitions(self, options):
        checkpoint, _created = SupplementDataImportCheckpoint.objects.get_or_create(
            source="NIH DSLD product search partitions"
        )
        metadata = checkpoint.metadata or {}
        completed = (
            set(metadata.get("completed_partitions", []))
            if options["resume"]
            else set()
        )
        current_key = metadata.get("current_partition_key") if options["resume"] else ""
        current_cursor = (
            checkpoint.cursor if options["resume"] else options["dsld_start"]
        )
        years = range(2011, date.today().year + 1)
        summary = {
            "dsld_products": 0,
            "dsld_label_details": 0,
            "dsld_ingredients": 0,
            "dsld_statements": 0,
        }
        capped_partitions = (
            metadata.get("capped_partitions", {}) if options["resume"] else {}
        )

        checkpoint.status = "running"
        checkpoint.metadata = {
            "mode": "search-partitions",
            "completed_partitions": sorted(completed),
            "include_label_details": options["include_label_details"],
            "limit": options["dsld_limit"],
            "capped_partitions": capped_partitions,
        }
        checkpoint.save(update_fields=["status", "metadata", "updated_at"])

        for year in years:
            for market_status in (0, 1):
                for partition in self._search_partitions_for(
                    {"date_start": year, "date_end": year, "status": market_status}
                ):
                    if (
                        options["dsld_limit"]
                        and summary["dsld_products"] >= options["dsld_limit"]
                    ):
                        break
                    partition_key = self._partition_key(partition)
                    if partition_key in completed:
                        continue
                    cursor = current_cursor if partition_key == current_key else 0
                    total = self._search_count(partition)
                    if total > DSLD_BROWSE_MAX_WINDOW:
                        capped_partitions[partition_key] = total
                        self.stderr.write(
                            f"DSLD search partition {partition_key} still exceeds the API window ({total}); "
                            f"importing first {DSLD_BROWSE_MAX_WINDOW} rows."
                        )
                        total = DSLD_BROWSE_MAX_WINDOW

                    partition_summary = self._import_dsld_search_partition(
                        partition,
                        cursor,
                        total,
                        options,
                        checkpoint,
                        completed,
                        capped_partitions,
                    )
                    for key in summary:
                        summary[key] += partition_summary[key]
                    completed.add(partition_key)
                    current_key = ""
                    current_cursor = 0
                    checkpoint.status = "running"
                    checkpoint.metadata = {
                        "mode": "search-partitions",
                        "completed_partitions": sorted(completed),
                        "current_partition_key": "",
                        "current_partition": {},
                        "include_label_details": options["include_label_details"],
                        "limit": options["dsld_limit"],
                        "capped_partitions": capped_partitions,
                    }
                    checkpoint.save(update_fields=["status", "metadata", "updated_at"])
                if (
                    options["dsld_limit"]
                    and summary["dsld_products"] >= options["dsld_limit"]
                ):
                    break
            if (
                options["dsld_limit"]
                and summary["dsld_products"] >= options["dsld_limit"]
            ):
                break

        checkpoint.status = "complete" if not capped_partitions else "partial"
        checkpoint.cursor = 0
        checkpoint.total_count = 0
        checkpoint.metadata = {
            "mode": "search-partitions",
            "completed_partitions": sorted(completed),
            "imported_this_run": summary["dsld_products"],
            "include_label_details": options["include_label_details"],
            "capped_partitions": capped_partitions,
        }
        checkpoint.save(
            update_fields=["cursor", "total_count", "status", "metadata", "updated_at"]
        )
        return summary

    def _search_partitions_for(self, base_partition):
        total = self._search_count(base_partition)
        if total <= DSLD_BROWSE_MAX_WINDOW:
            yield base_partition
            return

        for product_type in DSLD_PRODUCT_TYPE_CODES:
            product_partition = {**base_partition, "product_type": product_type}
            product_total = self._search_count(product_partition)
            if not product_total:
                continue
            if product_total <= DSLD_BROWSE_MAX_WINDOW:
                yield product_partition
                continue

            for supplement_form in DSLD_SUPPLEMENT_FORM_CODES:
                form_partition = {
                    **product_partition,
                    "supplement_form": supplement_form,
                }
                form_total = self._search_count(form_partition)
                if not form_total:
                    continue
                if form_total <= DSLD_BROWSE_MAX_WINDOW:
                    yield form_partition
                    continue

                for target_group in DSLD_TARGET_GROUP_CODES:
                    target_partition = {**form_partition, "target_group": target_group}
                    if self._search_count(target_partition):
                        yield target_partition

    def _import_dsld_search_partition(
        self,
        partition,
        cursor,
        total,
        options,
        checkpoint,
        completed,
        capped_partitions,
    ):
        page_size = max(1, min(options["dsld_page_size"], 5000))
        imported = 0
        detail_imported = 0
        ingredients = 0
        statements = 0
        partition_key = self._partition_key(partition)

        while cursor < total:
            if options["dsld_limit"] and imported >= options["dsld_limit"]:
                break
            current_page_size = min(page_size, total - cursor)
            if options["dsld_limit"]:
                current_page_size = min(
                    current_page_size, options["dsld_limit"] - imported
                )
            params = urlencode(
                {"q": "*", "size": current_page_size, "from": cursor, **partition}
            )
            payload = self._get_json(f"{DSLD_API_BASE}/search-filter?{params}")
            hits = payload.get("hits", [])
            if not hits:
                break
            page_summary = self._upsert_dsld_hits(
                hits,
                include_details=options["include_label_details"],
                detail_remaining=(
                    max(options["detail_limit"] - detail_imported, 0)
                    if options["detail_limit"]
                    else None
                ),
            )
            imported += len(hits)
            detail_imported += page_summary["details"]
            ingredients += page_summary["ingredients"]
            statements += page_summary["statements"]
            cursor += len(hits)

            checkpoint.cursor = cursor
            checkpoint.total_count = total
            checkpoint.status = "partial"
            checkpoint.metadata = {
                "mode": "search-partitions",
                "completed_partitions": sorted(completed),
                "current_partition_key": partition_key,
                "current_partition": partition,
                "partition_total": total,
                "imported_this_partition": imported,
                "include_label_details": options["include_label_details"],
                "limit": options["dsld_limit"],
                "capped_partitions": capped_partitions,
            }
            checkpoint.save(
                update_fields=[
                    "cursor",
                    "total_count",
                    "status",
                    "metadata",
                    "updated_at",
                ]
            )
            self.stdout.write(
                f"Imported DSLD search partition {partition_key} through cursor {cursor}/{total}"
            )

            if options["detail_limit"] and detail_imported >= options["detail_limit"]:
                options["include_label_details"] = False

        return {
            "dsld_products": imported,
            "dsld_label_details": detail_imported,
            "dsld_ingredients": ingredients,
            "dsld_statements": statements,
        }

    def _search_count(self, partition):
        params = urlencode({"q": "*", "size": 1, "from": 0, **partition})
        payload = self._get_json(f"{DSLD_API_BASE}/search-filter?{params}")
        return int(
            payload.get("stats", {}).get("count") or len(payload.get("hits", []))
        )

    def _partition_key(self, partition):
        return "|".join(f"{key}={partition[key]}" for key in sorted(partition))

    def _upsert_dsld_hits(self, hits, *, include_details, detail_remaining):
        labels = []
        details = 0
        for hit in hits:
            label_id = str(hit.get("_id") or "")
            source = hit.get("_source") or {}
            source["id"] = source.get("id") or label_id
            if include_details and (
                detail_remaining is None or details < detail_remaining
            ):
                try:
                    source = self._get_json(f"{DSLD_API_BASE}/label/{label_id}")
                    details += 1
                except Exception as exc:
                    self.stderr.write(f"Skipped DSLD label detail {label_id}: {exc}")
                    source["id"] = label_id
            labels.append(source)

        source_ids = [str(label.get("id")) for label in labels if label.get("id")]
        slugs = [self._dsld_slug(label) for label in labels]
        existing = Supplement.objects.filter(
            Q(source=DSLD_SOURCE, source_id__in=source_ids) | Q(slug__in=slugs)
        )
        existing_by_source = {
            (item.source, item.source_id): item for item in existing if item.source_id
        }
        existing_by_slug = {item.slug: item for item in existing}

        to_create = []
        label_by_key = {}
        for label in labels:
            source_id = str(label.get("id") or "")
            slug = self._dsld_slug(label)
            label_by_key[(DSLD_SOURCE, source_id)] = label
            if (
                DSLD_SOURCE,
                source_id,
            ) in existing_by_source or slug in existing_by_slug:
                continue
            to_create.append(self._supplement_from_dsld(label))

        if to_create:
            Supplement.objects.bulk_create(
                to_create, batch_size=1000, ignore_conflicts=True
            )

        supplements = Supplement.objects.filter(
            Q(source=DSLD_SOURCE, source_id__in=source_ids) | Q(slug__in=slugs)
        )
        update_rows = []
        supplement_by_source_id = {}
        for supplement in supplements:
            label = label_by_key.get((supplement.source, supplement.source_id)) or next(
                (item for item in labels if self._dsld_slug(item) == supplement.slug),
                None,
            )
            if not label:
                continue
            self._apply_dsld_to_supplement(supplement, label)
            supplement_by_source_id[str(label.get("id"))] = supplement
            update_rows.append(supplement)
        if update_rows:
            Supplement.objects.bulk_update(
                update_rows,
                [
                    "name",
                    "slug",
                    "description",
                    "common_dose",
                    "source",
                    "source_id",
                    "brand_name",
                    "manufacturer",
                    "product_type",
                    "upc",
                    "physical_state",
                    "off_market",
                    "target_groups",
                    "raw_data",
                    "is_active",
                ],
                batch_size=1000,
            )

        with transaction.atomic():
            supplements_with_ingredients = [
                supplement_by_source_id[str(label.get("id"))]
                for label in labels
                if str(label.get("id")) in supplement_by_source_id
                and self._has_dsld_ingredient_data(label)
            ]
            supplements_with_statements = [
                supplement_by_source_id[str(label.get("id"))]
                for label in labels
                if str(label.get("id")) in supplement_by_source_id
                and self._has_dsld_statement_data(label)
            ]
            if supplements_with_ingredients:
                SupplementIngredient.objects.filter(
                    supplement__in=supplements_with_ingredients, source=DSLD_SOURCE
                ).delete()
                SupplementNutrient.objects.filter(
                    supplement__in=supplements_with_ingredients
                ).delete()
            if supplements_with_statements:
                SupplementLabelStatement.objects.filter(
                    supplement__in=supplements_with_statements, source=DSLD_SOURCE
                ).delete()

            ingredient_rows = []
            statement_rows = []
            nutrient_rows = {}
            nutrients_by_key = self._nutrients_by_key()
            for label in labels:
                supplement = supplement_by_source_id.get(str(label.get("id")))
                if not supplement:
                    continue
                for row in self._dsld_ingredient_rows(label):
                    ingredient_rows.append(
                        SupplementIngredient(supplement=supplement, **row)
                    )
                    nutrient = self._nutrient_for_ingredient(row, nutrients_by_key)
                    if nutrient:
                        nutrient_rows[(supplement.id, nutrient.id)] = (
                            SupplementNutrient(
                                supplement=supplement,
                                nutrient=nutrient,
                                amount=row.get("amount"),
                                unit=row.get("unit") or nutrient.unit,
                            )
                        )
                for row in self._dsld_statement_rows(label):
                    statement_rows.append(
                        SupplementLabelStatement(supplement=supplement, **row)
                    )

            if ingredient_rows:
                SupplementIngredient.objects.bulk_create(
                    ingredient_rows, batch_size=2000, ignore_conflicts=True
                )
            if statement_rows:
                SupplementLabelStatement.objects.bulk_create(
                    statement_rows, batch_size=1000, ignore_conflicts=True
                )
            if nutrient_rows:
                SupplementNutrient.objects.bulk_create(
                    list(nutrient_rows.values()), batch_size=1000, ignore_conflicts=True
                )

        return {
            "details": details,
            "ingredients": len(ingredient_rows),
            "statements": len(statement_rows),
        }

    def _has_dsld_ingredient_data(self, label):
        other = label.get("otheringredients") or {}
        return bool(
            label.get("ingredientRows")
            or label.get("allIngredients")
            or other.get("ingredients")
        )

    def _has_dsld_statement_data(self, label):
        return bool(label.get("statements") or label.get("claims"))

    def _import_ingredient_groups(self, page_size):
        imported = 0
        for term in INGREDIENT_GROUP_TERMS:
            cursor = 0
            while True:
                params = urlencode(
                    {
                        "method": "by_letter",
                        "term": term,
                        "size": page_size,
                        "from": cursor,
                    }
                )
                try:
                    payload = self._get_json(
                        f"{DSLD_API_BASE}/ingredient-groups/?{params}"
                    )
                except Exception as exc:
                    self.stderr.write(f"Skipped ingredient group term '{term}': {exc}")
                    break
                hits = payload.get("hits", [])
                if not hits:
                    break
                rows = []
                for hit in hits:
                    source = hit.get("_source") or {}
                    source_id = str(source.get("groupId") or hit.get("_id") or "")
                    name = source.get("groupName") or source_id
                    rows.append(
                        SupplementIngredientGroup(
                            source=DSLD_SOURCE,
                            source_id=source_id,
                            name=name[:255],
                            slug=slugify(name)[:180],
                            categories=[
                                item for item in source.get("category", []) if item
                            ],
                            synonyms=source.get("synonyms") or [],
                            fact_sheets=source.get("factsheets") or [],
                            nutrient_info=source.get("nutrientInfo") or [],
                            raw_data=self._compact_json(source),
                        )
                    )
                SupplementIngredientGroup.objects.bulk_create(
                    rows,
                    update_conflicts=True,
                    update_fields=[
                        "name",
                        "slug",
                        "categories",
                        "synonyms",
                        "fact_sheets",
                        "nutrient_info",
                        "raw_data",
                        "updated_at",
                    ],
                    unique_fields=["source", "source_id"],
                    batch_size=1000,
                )
                imported += len(rows)
                cursor += len(hits)
                total = int(payload.get("total", {}).get("value") or cursor)
                if cursor >= total:
                    break
        return imported

    def _import_dsid_estimates(self, url):
        with tempfile.NamedTemporaryFile(suffix=".xlsx") as handle:
            self._download(url, handle.name)
            rows = list(self._xlsx_rows(handle.name, "Table2"))

        if not rows:
            return 0
        header_index = next(
            (
                index
                for index, row in enumerate(rows)
                if any(str(value).strip() == "DSID Ingredient Name" for value in row)
            ),
            None,
        )
        if header_index is None:
            return 0
        header = [str(value).strip() for value in rows[header_index]]
        data_rows = rows[header_index + 1 :]
        estimates = []
        for index, row in enumerate(data_rows, start=2):
            item = self._row_dict(header, row)
            ingredient_name = self._get_first(
                item,
                "DSID Ingredient Name",
                "Ingredient Name",
            )
            if not ingredient_name:
                continue
            labeled_amount = self._decimal_or_none(
                self._get_first(item, "NHANES Supplement Label Value per Serving")
            )
            labeled_unit = self._get_first(item, "Unit per Serving")
            linking_code = self._get_first(
                item, "DSID Linking Code", "DSID_Linking_Code"
            ) or self._stable_row_key(item, index)
            estimates.append(
                SupplementResearchEstimate(
                    source=DSID_SOURCE,
                    release=DSID_RELEASE,
                    table_name="Table2",
                    study_code=self._get_first(item, "DSID Study Category Code"),
                    ingredient_name=ingredient_name[:180],
                    ingredient_key=normalize_token(ingredient_name)[:180],
                    labeled_amount=labeled_amount,
                    labeled_unit=labeled_unit[:40],
                    predicted_amount=self._decimal_or_none(
                        self._get_first(item, "Predicted Mean Value per Serving")
                    ),
                    predicted_unit=labeled_unit[:40],
                    predicted_percent_difference=self._decimal_or_none(
                        self._get_first(
                            item, "Predicted % Difference from Label for Predicted Mean"
                        )
                    ),
                    standard_error_mean=self._decimal_or_none(
                        self._get_first(item, "Standard Error of Predicted Mean Value")
                    ),
                    standard_error_observation=self._decimal_or_none(
                        self._get_first(
                            item, "Standard Error of Predicted Observation Value"
                        )
                    ),
                    linking_code=str(linking_code)[:120],
                    raw_data=item,
                )
            )

        with transaction.atomic():
            SupplementResearchEstimate.objects.filter(
                source=DSID_SOURCE, release=DSID_RELEASE, table_name="Table2"
            ).delete()
            if estimates:
                SupplementResearchEstimate.objects.bulk_create(
                    estimates, batch_size=2000, ignore_conflicts=True
                )
        return len(estimates)

    def _supplement_from_dsld(self, label):
        supplement = Supplement()
        self._apply_dsld_to_supplement(supplement, label)
        return supplement

    def _apply_dsld_to_supplement(self, supplement, label):
        name = label.get("fullName") or f"DSLD supplement {label.get('id')}"
        supplement.name = str(name)[:150]
        supplement.slug = self._dsld_slug(label)
        supplement.description = self._dsld_description(label)
        supplement.common_dose = self._serving_display(label)[:100]
        supplement.source = DSLD_SOURCE
        supplement.source_id = str(label.get("id") or "")
        supplement.brand_name = str(label.get("brandName") or "")[:180]
        supplement.manufacturer = self._manufacturer(label)[:180]
        supplement.product_type = self._langual_description(label.get("productType"))[
            :120
        ]
        supplement.upc = str(label.get("upcSku") or "")[:120]
        supplement.physical_state = self._langual_description(
            label.get("physicalState")
        )[:120]
        supplement.off_market = self._bool_or_none(label.get("offMarket"))
        supplement.target_groups = label.get("targetGroups") or [
            item.get("langualCodeDescription")
            for item in label.get("userGroups", [])
            if item.get("langualCodeDescription")
        ]
        supplement.raw_data = self._compact_json(
            {
                "entryDate": label.get("entryDate"),
                "events": label.get("events") or [],
                "claims": label.get("claims") or [],
                "netContents": label.get("netContents") or [],
                "servingSizes": label.get("servingSizes") or [],
                "pdf": label.get("pdf"),
                "thumbnail": label.get("thumbnail"),
                "nhanesId": label.get("nhanesId"),
            }
        )
        supplement.is_active = True

    def _dsld_ingredient_rows(self, label):
        rows = []
        if label.get("ingredientRows"):
            for ingredient in label.get("ingredientRows") or []:
                rows.extend(self._detail_ingredient_rows(ingredient, is_other=False))
                for nested in ingredient.get("nestedRows") or []:
                    rows.extend(self._detail_ingredient_rows(nested, is_other=False))
        elif label.get("allIngredients"):
            for index, ingredient in enumerate(
                label.get("allIngredients") or [], start=1
            ):
                rows.append(self._summary_ingredient_row(ingredient, index))

        other = label.get("otheringredients") or {}
        for ingredient in other.get("ingredients") or []:
            rows.append(
                self._summary_ingredient_row(
                    ingredient, ingredient.get("order") or 0, is_other=True
                )
            )
        return rows

    def _detail_ingredient_rows(self, ingredient, *, is_other):
        quantities = ingredient.get("quantity") or [None]
        rows = []
        for index, quantity in enumerate(quantities, start=1):
            quantity = quantity or {}
            percent = None
            dv_items = quantity.get("dailyValueTargetGroup") or []
            if dv_items:
                percent = self._decimal_or_none(dv_items[0].get("percent"))
            rows.append(
                {
                    "source": DSLD_SOURCE,
                    "source_id": str(
                        ingredient.get("ingredientId")
                        or f"{ingredient.get('name')}-{index}"
                    )[:120],
                    "name": str(ingredient.get("name") or "")[:255],
                    "ingredient_group": str(ingredient.get("ingredientGroup") or "")[
                        :255
                    ],
                    "category": str(ingredient.get("category") or "")[:100],
                    "amount": self._decimal_or_none(quantity.get("quantity")),
                    "unit": str(quantity.get("unit") or "")[:40],
                    "percent_daily_value": percent,
                    "serving_size_order": self._int_or_none(
                        quantity.get("servingSizeOrder")
                    ),
                    "is_other_ingredient": is_other,
                    "notes": str(ingredient.get("notes") or "")[:2000],
                    "raw_data": self._compact_json(ingredient),
                }
            )
        return rows

    def _summary_ingredient_row(self, ingredient, index, *, is_other=False):
        return {
            "source": DSLD_SOURCE,
            "source_id": str(
                ingredient.get("ingredientId")
                or f"{index}-{ingredient.get('name', '')}"
            )[:120],
            "name": str(ingredient.get("name") or "")[:255],
            "ingredient_group": str(ingredient.get("ingredientGroup") or "")[:255],
            "category": str(ingredient.get("category") or "")[:100],
            "amount": None,
            "unit": "",
            "percent_daily_value": None,
            "serving_size_order": None,
            "is_other_ingredient": is_other,
            "notes": str(ingredient.get("notes") or "")[:2000],
            "raw_data": self._compact_json(ingredient),
        }

    def _dsld_statement_rows(self, label):
        rows = []
        for statement in label.get("statements") or []:
            text = str(statement.get("notes") or "").strip()
            if text:
                rows.append(
                    {
                        "source": DSLD_SOURCE,
                        "statement_type": str(
                            statement.get("type") or "Label statement"
                        )[:160],
                        "text": text,
                        "raw_data": self._compact_json(statement),
                    }
                )
        for claim in label.get("claims") or []:
            text = str(claim.get("langualCodeDescription") or "").strip()
            if text:
                rows.append(
                    {
                        "source": DSLD_SOURCE,
                        "statement_type": "Claim category",
                        "text": text,
                        "raw_data": self._compact_json(claim),
                    }
                )
        return rows

    def _nutrients_by_key(self):
        return {
            normalize_token(nutrient.slug or nutrient.name): nutrient
            for nutrient in Nutrient.objects.filter(is_active=True)
        }

    def _nutrient_for_ingredient(self, row, nutrients_by_key):
        keys = [
            normalize_token(row.get("ingredient_group")),
            normalize_token(row.get("name")),
        ]
        for key in keys:
            if key in nutrients_by_key:
                return nutrients_by_key[key]
        return None

    def _dsld_slug(self, label):
        return slugify(
            f"dsld-{label.get('id')}-{label.get('fullName') or 'supplement'}"
        )[:170]

    def _dsld_description(self, label):
        parts = [
            "Imported from NIH Dietary Supplement Label Database.",
            f"DSLD ID: {label.get('id')}.",
        ]
        if label.get("brandName"):
            parts.append(f"Brand: {label.get('brandName')}.")
        product_type = self._langual_description(label.get("productType"))
        if product_type:
            parts.append(f"Product type: {product_type}.")
        ingredient_names = [
            item.get("name")
            for item in (label.get("allIngredients") or [])[:20]
            if item.get("name")
        ]
        if not ingredient_names:
            ingredient_names = [
                item.get("name")
                for item in (label.get("ingredientRows") or [])[:20]
                if item.get("name")
            ]
        if ingredient_names:
            parts.append(f"Ingredients: {', '.join(ingredient_names)}.")
        parts.append(
            "Label data is not an endorsement and should be used for educational nutrition guidance."
        )
        return " ".join(parts)

    def _serving_display(self, label):
        serving = next(
            (item for item in label.get("servingSizes", []) if item.get("inSFB")), None
        )
        if serving:
            min_quantity = serving.get("minQuantity")
            max_quantity = serving.get("maxQuantity")
            unit = serving.get("unit") or ""
            if min_quantity and max_quantity and min_quantity != max_quantity:
                return f"{min_quantity}-{max_quantity} {unit}".strip()
            if min_quantity:
                return f"{min_quantity} {unit}".strip()
        net_content = next(iter(label.get("netContents") or []), {})
        return str(net_content.get("display") or "")

    def _manufacturer(self, label):
        for contact in label.get("contacts") or []:
            details = contact.get("contactDetails") or {}
            name = details.get("name")
            if name:
                return name
        return label.get("brandName") or ""

    def _langual_description(self, value):
        if isinstance(value, dict):
            return str(
                value.get("langualCodeDescription") or value.get("langualCode") or ""
            )
        return ""

    def _bool_or_none(self, value):
        if value in {None, ""}:
            return None
        return (
            bool(int(value))
            if isinstance(value, int | str) and str(value).isdigit()
            else bool(value)
        )

    def _int_or_none(self, value):
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    def _decimal_or_none(self, value):
        if value in {None, ""}:
            return None
        try:
            return Decimal(str(value).replace(",", "").replace("%", "").strip())
        except (InvalidOperation, ValueError):
            return None

    def _get_first(self, row, *names):
        for name in names:
            value = row.get(name)
            if value not in {None, ""}:
                return value
        return ""

    def _row_dict(self, header, row):
        return {
            header[index]: row[index] if index < len(row) else ""
            for index in range(len(header))
            if header[index]
        }

    def _stable_row_key(self, row, index):
        digest = hashlib.sha1(repr(sorted(row.items())).encode("utf-8")).hexdigest()[
            :16
        ]
        return f"row-{index}-{digest}"

    def _compact_json(self, value):
        return value if isinstance(value, dict | list) else {}

    def _get_json(self, url):
        last_error = None
        for attempt in range(8):
            try:
                request = Request(
                    url,
                    headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
                )
                with urlopen(request, timeout=90) as response:
                    import json

                    return json.loads(response.read().decode("utf-8"))
            except Exception as exc:
                last_error = exc
                time.sleep(min(30, 2**attempt))
        raise last_error

    def _download(self, url, path):
        request = Request(url, headers={"User-Agent": USER_AGENT})
        with urlopen(request, timeout=180) as response, open(path, "wb") as handle:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                handle.write(chunk)

    def _xlsx_rows(self, path, sheet_name):
        ns = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
        rel_ns = {"rel": "http://schemas.openxmlformats.org/package/2006/relationships"}
        office_rel = (
            "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
        )
        with zipfile.ZipFile(path) as archive:
            shared_strings = self._xlsx_shared_strings(archive, ns)
            workbook = ElementTree.fromstring(archive.read("xl/workbook.xml"))
            rels = ElementTree.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
            rel_targets = {
                rel.attrib["Id"]: rel.attrib["Target"]
                for rel in rels.findall("rel:Relationship", rel_ns)
            }
            sheet_target = None
            for sheet in workbook.findall("main:sheets/main:sheet", ns):
                if sheet.attrib.get("name") == sheet_name:
                    sheet_target = rel_targets[sheet.attrib[office_rel]]
                    break
            if not sheet_target:
                return
            sheet_path = f"xl/{sheet_target.lstrip('/')}"
            sheet = ElementTree.fromstring(archive.read(sheet_path))
            for row in sheet.findall("main:sheetData/main:row", ns):
                values = []
                for cell in row.findall("main:c", ns):
                    index = self._cell_index(cell.attrib.get("r", "A1"))
                    while len(values) <= index:
                        values.append("")
                    values[index] = self._xlsx_cell_value(cell, shared_strings, ns)
                while values and values[-1] == "":
                    values.pop()
                if values:
                    yield values

    def _xlsx_shared_strings(self, archive, ns):
        try:
            root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
        except KeyError:
            return []
        values = []
        for item in root.findall("main:si", ns):
            parts = [text.text or "" for text in item.findall(".//main:t", ns)]
            values.append("".join(parts))
        return values

    def _xlsx_cell_value(self, cell, shared_strings, ns):
        value = cell.find("main:v", ns)
        if cell.attrib.get("t") == "inlineStr":
            return "".join(text.text or "" for text in cell.findall(".//main:t", ns))
        if value is None:
            return ""
        raw = value.text or ""
        if cell.attrib.get("t") == "s":
            return shared_strings[int(raw)] if raw else ""
        return raw

    def _cell_index(self, cell_ref):
        letters = re.sub(r"[^A-Z]", "", cell_ref.upper())
        index = 0
        for char in letters:
            index = index * 26 + (ord(char) - ord("A") + 1)
        return index - 1
