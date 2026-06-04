from django.contrib import admin

from .models import (
    Supplement,
    SupplementAlias,
    SupplementDataImportCheckpoint,
    SupplementFactSheet,
    SupplementNutrient,
    SupplementSafetyRule,
    UserSupplement,
)


class SupplementNutrientInline(admin.TabularInline):
    model = SupplementNutrient
    extra = 1


class SupplementAliasInline(admin.TabularInline):
    model = SupplementAlias
    extra = 1
    prepopulated_fields = {"slug": ("alias",)}


class SupplementSafetyRuleInline(admin.StackedInline):
    model = SupplementSafetyRule
    extra = 0


@admin.register(Supplement)
class SupplementAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "source",
        "source_id",
        "common_dose",
        "is_active",
        "updated_at",
    ]
    list_filter = ["is_active", "source"]
    search_fields = ["name", "slug", "source_id", "aliases__alias"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [SupplementNutrientInline, SupplementAliasInline, SupplementSafetyRuleInline]


@admin.register(SupplementAlias)
class SupplementAliasAdmin(admin.ModelAdmin):
    list_display = ["alias", "supplement", "source", "active", "updated_at"]
    list_filter = ["active", "source"]
    search_fields = ["alias", "slug", "supplement__name"]
    prepopulated_fields = {"slug": ("alias",)}


@admin.register(SupplementSafetyRule)
class SupplementSafetyRuleAdmin(admin.ModelAdmin):
    list_display = ["supplement", "rule_type", "interacting_entity", "severity", "active"]
    list_filter = ["rule_type", "severity", "active", "source"]
    search_fields = [
        "supplement__name",
        "interacting_entity",
        "title",
        "description",
        "recommendation",
    ]


@admin.register(UserSupplement)
class UserSupplementAdmin(admin.ModelAdmin):
    list_display = ["user", "supplement", "dose", "frequency", "active", "updated_at"]
    list_filter = ["active", "supplement"]
    search_fields = ["user__email", "supplement__name"]


@admin.register(SupplementFactSheet)
class SupplementFactSheetAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "audience",
        "source_id",
        "updated_at",
    ]
    list_filter = ["audience", "source"]
    search_fields = ["title", "slug", "source_id", "description", "safety", "interactions"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(SupplementDataImportCheckpoint)
class SupplementDataImportCheckpointAdmin(admin.ModelAdmin):
    list_display = ["source", "status", "cursor", "total_count", "updated_at"]
    search_fields = ["source", "status"]
