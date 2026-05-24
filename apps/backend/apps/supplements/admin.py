from django.contrib import admin

from .models import (
    Supplement,
    SupplementDataImportCheckpoint,
    SupplementIngredient,
    SupplementIngredientGroup,
    SupplementLabelStatement,
    SupplementNutrient,
    SupplementResearchEstimate,
    UserSupplement,
)


class SupplementNutrientInline(admin.TabularInline):
    model = SupplementNutrient
    extra = 1


class SupplementIngredientInline(admin.TabularInline):
    model = SupplementIngredient
    extra = 0
    fields = [
        "name",
        "ingredient_group",
        "category",
        "amount",
        "unit",
        "percent_daily_value",
        "is_other_ingredient",
    ]
    readonly_fields = fields
    can_delete = False


class SupplementLabelStatementInline(admin.TabularInline):
    model = SupplementLabelStatement
    extra = 0
    fields = ["statement_type", "text"]
    readonly_fields = fields
    can_delete = False


@admin.register(Supplement)
class SupplementAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "brand_name",
        "source",
        "source_id",
        "product_type",
        "common_dose",
        "is_active",
        "updated_at",
    ]
    list_filter = ["is_active", "source", "product_type", "off_market"]
    search_fields = ["name", "slug", "brand_name", "source_id", "upc"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [
        SupplementNutrientInline,
        SupplementIngredientInline,
        SupplementLabelStatementInline,
    ]


@admin.register(UserSupplement)
class UserSupplementAdmin(admin.ModelAdmin):
    list_display = ["user", "supplement", "dose", "frequency", "active", "updated_at"]
    list_filter = ["active", "supplement"]
    search_fields = ["user__email", "supplement__name"]


@admin.register(SupplementIngredientGroup)
class SupplementIngredientGroupAdmin(admin.ModelAdmin):
    list_display = ["name", "source", "source_id", "updated_at"]
    list_filter = ["source"]
    search_fields = ["name", "slug", "source_id"]


@admin.register(SupplementResearchEstimate)
class SupplementResearchEstimateAdmin(admin.ModelAdmin):
    list_display = [
        "ingredient_name",
        "release",
        "study_code",
        "labeled_amount",
        "labeled_unit",
        "predicted_amount",
        "predicted_unit",
    ]
    list_filter = ["source", "release", "study_code"]
    search_fields = ["ingredient_name", "ingredient_key", "linking_code"]


@admin.register(SupplementDataImportCheckpoint)
class SupplementDataImportCheckpointAdmin(admin.ModelAdmin):
    list_display = ["source", "status", "cursor", "total_count", "updated_at"]
    search_fields = ["source", "status"]
