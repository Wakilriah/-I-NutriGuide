from django.contrib import admin

from .models import Nutrient, NutrientInteraction


@admin.register(Nutrient)
class NutrientAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "unit", "is_active", "source_column", "updated_at"]
    list_filter = ["unit", "is_active"]
    search_fields = ["name", "slug", "original_name_fr", "source_column"]
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ["created_at", "updated_at"]


@admin.register(NutrientInteraction)
class NutrientInteractionAdmin(admin.ModelAdmin):
    list_display = ["source_type", "source_key", "interaction_type", "target_type", "target_key", "evidence_level", "severity", "active"]
    list_filter = ["source_type", "target_type", "interaction_type", "evidence_level", "severity", "active"]
    search_fields = ["source_key", "target_key", "mechanism"]
    readonly_fields = ["created_at", "updated_at"]
