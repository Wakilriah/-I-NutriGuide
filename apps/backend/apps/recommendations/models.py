import uuid

from django.conf import settings
from django.db import models


DISCLAIMER = (
    "Recommendations are nutritional suggestions and do not replace medical advice."
)


class RecommendationRun(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="recommendation_runs", on_delete=models.CASCADE)
    input_snapshot = models.JSONField(default=dict)
    profile_snapshot = models.JSONField(default=dict)
    supplements_snapshot = models.JSONField(default=list)
    disclaimer = models.TextField(default=DISCLAIMER)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"], name="recommenda_user_id_ddc3ad_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} recommendations at {self.created_at}"


class RecommendationItem(models.Model):
    run = models.ForeignKey(RecommendationRun, related_name="items", on_delete=models.CASCADE)
    food = models.ForeignKey("foods.Food", related_name="recommendation_items", on_delete=models.PROTECT)
    supplement = models.ForeignKey(
        "supplements.Supplement",
        related_name="recommendation_items",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    score = models.FloatField()
    nutrient_score = models.FloatField(default=0)
    rule_score = models.FloatField(default=0)
    preference_score = models.FloatField(default=1)
    matched_nutrients = models.JSONField(default=list)
    matched_rules = models.JSONField(default=list)
    explanation = models.TextField()
    warnings = models.JSONField(default=list)
    tags = models.JSONField(default=list)
    rank = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["rank"]
        constraints = [
            models.UniqueConstraint(fields=["run", "rank"], name="unique_recommendation_rank_per_run"),
            models.UniqueConstraint(fields=["run", "food"], name="unique_recommended_food_per_run"),
        ]

    def __str__(self) -> str:
        return f"#{self.rank} {self.food.name}"


class SavedRecommendationItem(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="saved_recommendation_items", on_delete=models.CASCADE)
    recommendation_item = models.ForeignKey(RecommendationItem, related_name="saves", on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "recommendation_item"], name="unique_saved_recommendation_item_user"),
        ]
        indexes = [
            models.Index(fields=["user", "created_at"], name="recommendat_user_id_68ee96_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} saved item {self.recommendation_item_id}"
