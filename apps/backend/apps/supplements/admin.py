from django.contrib import admin

from .models import (
    Supplement,
    SupplementDataImportCheckpoint,
    SupplementFactSheet,
    SupplementNutrient,
    UserSupplement,
)


class SupplementNutrientInline(admin.TabularInline):
    model = SupplementNutrient
    extra = 1


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
    search_fields = ["name", "slug", "source_id"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [SupplementNutrientInline]


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
