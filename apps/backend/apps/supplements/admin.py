from django.contrib import admin

from .models import Supplement, SupplementNutrient, UserSupplement


class SupplementNutrientInline(admin.TabularInline):
    model = SupplementNutrient
    extra = 1


@admin.register(Supplement)
class SupplementAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "common_dose", "is_active", "updated_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [SupplementNutrientInline]


@admin.register(UserSupplement)
class UserSupplementAdmin(admin.ModelAdmin):
    list_display = ["user", "supplement", "dose", "frequency", "active", "updated_at"]
    list_filter = ["active", "supplement"]
    search_fields = ["user__email", "supplement__name"]

