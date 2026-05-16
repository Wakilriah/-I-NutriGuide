from django.contrib import admin

from .models import Nutrient


@admin.register(Nutrient)
class NutrientAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "unit", "is_active", "source_column", "updated_at"]
    list_filter = ["unit", "is_active"]
    search_fields = ["name", "slug", "original_name_fr", "source_column"]
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ["created_at", "updated_at"]
