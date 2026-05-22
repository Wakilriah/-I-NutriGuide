from django.db import models


class AssociationRule(models.Model):
    class EntityType(models.TextChoices):
        SUPPLEMENT = "supplement", "Supplement"
        NUTRIENT = "nutrient", "Nutrient"
        FOOD = "food", "Food"
        CATEGORY = "category", "Category"

    antecedent_type = models.CharField(max_length=50, choices=EntityType.choices)
    antecedent_slug = models.CharField(max_length=150)
    consequent_type = models.CharField(max_length=50, choices=EntityType.choices)
    consequent_slug = models.CharField(max_length=150)
    support = models.FloatField(default=0)
    confidence = models.FloatField(default=0)
    lift = models.FloatField(default=0)
    explanation = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["antecedent_type", "antecedent_slug", "consequent_type", "consequent_slug"]
        indexes = [
            models.Index(fields=["antecedent_slug"], name="rules_assoc_anteced_c00a27_idx"),
            models.Index(fields=["consequent_slug"], name="rules_assoc_consequ_d728d5_idx"),
            models.Index(fields=["is_active"], name="rules_assoc_is_acti_a6dff9_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["antecedent_type", "antecedent_slug", "consequent_type", "consequent_slug"],
                name="unique_association_rule",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.antecedent_type}:{self.antecedent_slug} -> {self.consequent_type}:{self.consequent_slug}"
