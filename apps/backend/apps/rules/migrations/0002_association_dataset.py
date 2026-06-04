# Generated for the I-NutriGuide association dataset import.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("rules", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="AssociationTransaction",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("transaction_id", models.CharField(max_length=80, unique=True)),
                ("source", models.CharField(default="association_excel", max_length=80)),
                ("raw_payload", models.JSONField(blank=True, default=dict)),
                ("one_hot_items", models.JSONField(blank=True, default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["transaction_id"],
                "indexes": [
                    models.Index(fields=["transaction_id"], name="rules_txn_id_idx"),
                    models.Index(fields=["source"], name="rules_txn_source_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="MinedAssociationRule",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("rule_key", models.CharField(max_length=64, unique=True)),
                ("antecedent_items", models.JSONField(default=list)),
                ("consequent_items", models.JSONField(default=list)),
                ("support", models.FloatField(default=0)),
                ("confidence", models.FloatField(default=0)),
                ("lift", models.FloatField(default=0)),
                ("rule_type", models.CharField(choices=[("positive_synergy", "Positive synergy"), ("avoid_timing", "Avoid timing"), ("medical_caution", "Medical caution"), ("neutral_pattern", "Neutral pattern")], default="neutral_pattern", max_length=40)),
                ("source", models.CharField(default="mined", max_length=80)),
                ("explanation", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["-confidence", "-lift", "rule_key"],
                "indexes": [
                    models.Index(fields=["rule_type"], name="rules_mined_type_idx"),
                    models.Index(fields=["confidence"], name="rules_mined_conf_idx"),
                    models.Index(fields=["lift"], name="rules_mined_lift_idx"),
                    models.Index(fields=["is_active"], name="rules_mined_active_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="SupplementCategory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("category", models.CharField(max_length=150, unique=True)),
                ("canonical_item", models.CharField(max_length=120, unique=True)),
                ("keywords", models.JSONField(blank=True, default=list)),
                ("main_nutrient", models.CharField(blank=True, max_length=150)),
                ("source_url", models.URLField(blank=True, max_length=500)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["category"],
                "indexes": [
                    models.Index(fields=["canonical_item"], name="rules_supp_cat_canon_idx"),
                    models.Index(fields=["is_active"], name="rules_supp_cat_active_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="AssociationTransactionItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("item_type", models.CharField(max_length=50)),
                ("item_value", models.CharField(max_length=180)),
                ("item", models.CharField(max_length=220)),
                ("transaction", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="rules.associationtransaction")),
            ],
            options={
                "ordering": ["transaction__transaction_id", "item"],
                "indexes": [
                    models.Index(fields=["item"], name="rules_txn_item_idx"),
                    models.Index(fields=["item_type"], name="rules_txn_item_type_idx"),
                ],
                "constraints": [
                    models.UniqueConstraint(fields=("transaction", "item"), name="unique_item_per_transaction"),
                ],
            },
        ),
        migrations.CreateModel(
            name="FoodSupplementSynergyRule",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("rule_seed_id", models.CharField(max_length=80, unique=True)),
                ("supplement_category_name", models.CharField(max_length=150)),
                ("supplement_item", models.CharField(max_length=150)),
                ("food", models.CharField(max_length=180)),
                ("food_item", models.CharField(max_length=180)),
                ("nutrient_relation", models.CharField(blank=True, max_length=180)),
                ("association_type", models.CharField(choices=[("positive", "Positive"), ("neutral", "Neutral")], default="positive", max_length=40)),
                ("reason", models.TextField()),
                ("seed_weight", models.FloatField(default=0.75)),
                ("source_url", models.URLField(blank=True, max_length=500)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("supplement_category", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="synergy_rules", to="rules.supplementcategory")),
            ],
            options={
                "ordering": ["supplement_item", "food_item"],
                "indexes": [
                    models.Index(fields=["supplement_item"], name="rules_syn_supp_idx"),
                    models.Index(fields=["food_item"], name="rules_syn_food_idx"),
                    models.Index(fields=["association_type"], name="rules_syn_type_idx"),
                    models.Index(fields=["is_active"], name="rules_syn_active_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="SafetyConstraint",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("supplement_category_name", models.CharField(max_length=150)),
                ("avoid_or_review_item", models.CharField(max_length=180)),
                ("constraint_type", models.CharField(choices=[("avoid_timing", "Avoid timing"), ("medical_review", "Medical review"), ("medical_caution", "Medical caution"), ("exclusion", "Exclusion")], max_length=40)),
                ("reason", models.TextField()),
                ("how_to_use", models.TextField(blank=True)),
                ("source_url", models.URLField(blank=True, max_length=500)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("supplement_category", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="safety_constraints", to="rules.supplementcategory")),
            ],
            options={
                "ordering": ["supplement_category_name", "constraint_type", "avoid_or_review_item"],
                "indexes": [
                    models.Index(fields=["supplement_category_name"], name="rules_safe_supp_idx"),
                    models.Index(fields=["constraint_type"], name="rules_safe_type_idx"),
                    models.Index(fields=["is_active"], name="rules_safe_active_idx"),
                ],
                "constraints": [
                    models.UniqueConstraint(fields=("supplement_category_name", "avoid_or_review_item", "constraint_type"), name="unique_safety_constraint"),
                ],
            },
        ),
        migrations.CreateModel(
            name="SupplementNormalization",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("original_supplement_name", models.CharField(max_length=220)),
                ("original_supplement_slug", models.SlugField(max_length=240, unique=True)),
                ("normalized_category", models.CharField(max_length=150)),
                ("primary_keyword", models.CharField(blank=True, max_length=150)),
                ("main_nutrient", models.CharField(blank=True, max_length=150)),
                ("notes", models.TextField(blank=True)),
                ("source_url", models.URLField(blank=True, max_length=500)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("category", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="normalizations", to="rules.supplementcategory")),
            ],
            options={
                "ordering": ["normalized_category", "original_supplement_name"],
                "indexes": [
                    models.Index(fields=["normalized_category"], name="rules_supp_norm_cat_idx"),
                    models.Index(fields=["original_supplement_slug"], name="rules_supp_norm_slug_idx"),
                    models.Index(fields=["is_active"], name="rules_supp_norm_active_idx"),
                ],
            },
        ),
    ]
