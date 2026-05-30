from django.contrib import admin

from .models import (
    AssociationRule,
    AssociationTransaction,
    AssociationTransactionItem,
    FoodSupplementSynergyRule,
    MinedAssociationRule,
    SafetyConstraint,
    SupplementCategory,
    SupplementNormalization,
)


@admin.register(AssociationRule)
class AssociationRuleAdmin(admin.ModelAdmin):
    list_display = [
        "antecedent_type",
        "antecedent_slug",
        "consequent_type",
        "consequent_slug",
        "confidence",
        "lift",
        "score",
        "is_active",
    ]
    list_filter = ["antecedent_type", "consequent_type", "is_active"]
    search_fields = ["antecedent_slug", "consequent_slug", "explanation"]


@admin.register(SupplementCategory)
class SupplementCategoryAdmin(admin.ModelAdmin):
    list_display = ["category", "canonical_item", "main_nutrient", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["category", "canonical_item", "main_nutrient"]


@admin.register(SupplementNormalization)
class SupplementNormalizationAdmin(admin.ModelAdmin):
    list_display = ["original_supplement_name", "normalized_category", "primary_keyword", "main_nutrient", "is_active"]
    list_filter = ["normalized_category", "is_active"]
    search_fields = ["original_supplement_name", "original_supplement_slug", "normalized_category", "primary_keyword"]


@admin.register(FoodSupplementSynergyRule)
class FoodSupplementSynergyRuleAdmin(admin.ModelAdmin):
    list_display = ["rule_seed_id", "supplement_item", "food_item", "association_type", "seed_weight", "is_active"]
    list_filter = ["association_type", "supplement_category_name", "is_active"]
    search_fields = ["rule_seed_id", "supplement_item", "food", "food_item", "reason"]


@admin.register(SafetyConstraint)
class SafetyConstraintAdmin(admin.ModelAdmin):
    list_display = ["supplement_category_name", "avoid_or_review_item", "constraint_type", "is_active"]
    list_filter = ["constraint_type", "supplement_category_name", "is_active"]
    search_fields = ["supplement_category_name", "avoid_or_review_item", "reason"]


class AssociationTransactionItemInline(admin.TabularInline):
    model = AssociationTransactionItem
    extra = 0
    readonly_fields = ["item_type", "item_value", "item"]
    can_delete = False


@admin.register(AssociationTransaction)
class AssociationTransactionAdmin(admin.ModelAdmin):
    list_display = ["transaction_id", "source", "updated_at"]
    search_fields = ["transaction_id", "items__item"]
    inlines = [AssociationTransactionItemInline]


@admin.register(MinedAssociationRule)
class MinedAssociationRuleAdmin(admin.ModelAdmin):
    list_display = ["antecedent_items", "consequent_items", "support", "confidence", "lift", "score", "rule_type", "source", "is_active"]
    list_filter = ["rule_type", "source", "is_active"]
    search_fields = ["antecedent_items", "consequent_items", "explanation"]
