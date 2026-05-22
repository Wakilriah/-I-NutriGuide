from django.conf import settings
from django.db import models


class RecommendationFeedback(models.Model):
    class FeedbackType(models.TextChoices):
        LIKED = "liked", "Liked"
        DISLIKED = "disliked", "Disliked"
        SAVED = "saved", "Saved"
        TRIED = "tried", "Tried"
        NOT_INTERESTED = "not_interested", "Not interested"
        UNSAFE_FOR_ME = "unsafe_for_me", "Unsafe for me"
        TOO_EXPENSIVE = "too_expensive", "Too expensive"
        BAD_TASTE = "bad_taste", "Bad taste"
        ALLERGY_ISSUE = "allergy_issue", "Allergy issue"
        HELPFUL = "helpful", "Helpful"
        NOT_HELPFUL = "not_helpful", "Not helpful"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="recommendation_feedback", on_delete=models.CASCADE)
    recommendation_item = models.ForeignKey(
        "recommendations.RecommendationItem",
        related_name="feedback",
        on_delete=models.CASCADE,
    )
    food = models.ForeignKey("foods.Food", related_name="recommendation_feedback", on_delete=models.CASCADE, null=True, blank=True)
    feedback_type = models.CharField(max_length=30, choices=FeedbackType.choices, default=FeedbackType.HELPFUL)
    rating = models.PositiveSmallIntegerField(null=True, blank=True)
    is_helpful = models.BooleanField(default=True)
    comment = models.TextField(blank=True)
    context = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "recommendation_item"], name="unique_feedback_per_item_user"),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} feedback for item {self.recommendation_item_id}"
