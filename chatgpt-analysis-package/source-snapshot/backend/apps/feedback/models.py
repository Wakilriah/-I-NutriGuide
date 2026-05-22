from django.conf import settings
from django.db import models


class RecommendationFeedback(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="recommendation_feedback", on_delete=models.CASCADE)
    recommendation_item = models.ForeignKey(
        "recommendations.RecommendationItem",
        related_name="feedback",
        on_delete=models.CASCADE,
    )
    rating = models.PositiveSmallIntegerField()
    is_helpful = models.BooleanField(default=True)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "recommendation_item"], name="unique_feedback_per_item_user"),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} feedback for item {self.recommendation_item_id}"

