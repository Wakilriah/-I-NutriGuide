from django.contrib import admin

from .models import Food, FoodCategory, FoodNutrient


class FoodNutrientInline(admin.TabularInline):
    model = FoodNutrient
    extra = 1


@admin.register(FoodCategory)
class FoodCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "source", "ciqual_group_code", "ciqual_subgroup_code", "updated_at"]
    list_filter = ["source"]
    search_fields = ["name", "slug", "ciqual_group_code", "ciqual_subgroup_code", "ciqual_subsubgroup_code"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Food)
class FoodAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "category", "source", "ciqual_code", "is_active", "updated_at"]
    list_filter = ["source", "category", "is_active"]
    search_fields = ["name", "slug", "ciqual_code", "scientific_name", "category__name"]
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ["created_at", "updated_at"]
    inlines = [FoodNutrientInline]
