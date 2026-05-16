from django.contrib import admin

from .models import RecommendationItem, RecommendationRun, SavedRecommendationItem


class RecommendationItemInline(admin.TabularInline):
    model = RecommendationItem
    extra = 0
    readonly_fields = ["food", "supplement", "score", "rank", "explanation"]


@admin.register(RecommendationRun)
class RecommendationRunAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "created_at"]
    search_fields = ["user__email"]
    inlines = [RecommendationItemInline]


@admin.register(SavedRecommendationItem)
class SavedRecommendationItemAdmin(admin.ModelAdmin):
    list_display = ["user", "recommendation_item", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["user__email", "recommendation_item__food__name"]
