from django.contrib import admin

from .models import AssociationRule


@admin.register(AssociationRule)
class AssociationRuleAdmin(admin.ModelAdmin):
    list_display = [
        "antecedent_type",
        "antecedent_slug",
        "consequent_type",
        "consequent_slug",
        "confidence",
        "lift",
        "is_active",
    ]
    list_filter = ["antecedent_type", "consequent_type", "is_active"]
    search_fields = ["antecedent_slug", "consequent_slug", "explanation"]

