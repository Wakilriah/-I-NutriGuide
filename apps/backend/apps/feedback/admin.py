from django.contrib import admin

from .models import RecommendationFeedback


@admin.register(RecommendationFeedback)
class RecommendationFeedbackAdmin(admin.ModelAdmin):
    list_display = ["user", "recommendation_item", "rating", "is_helpful", "created_at"]
    list_filter = ["rating", "is_helpful"]
    search_fields = ["user__email", "comment"]

