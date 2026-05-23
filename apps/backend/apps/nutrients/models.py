from django.db import models
from django.utils.text import slugify


class Nutrient(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    unit = models.CharField(max_length=20, default="mg")
    description = models.TextField(blank=True)
    original_name_fr = models.CharField(max_length=255, blank=True)
    source_column = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["slug"], name="nutrients_n_slug_0761d4_idx"),
            models.Index(fields=["is_active"], name="nutrients_n_is_acti_4b56a7_idx"),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class NutrientInteraction(models.Model):
    class EntityType(models.TextChoices):
        SUPPLEMENT = "supplement", "Supplement"
        NUTRIENT = "nutrient", "Nutrient"
        FOOD = "food", "Food"

    class InteractionType(models.TextChoices):
        ENHANCES = "enhances", "Enhances"
        INHIBITS = "inhibits", "Inhibits"
        REQUIRES = "requires", "Requires"
        SHOULD_NOT_COMBINE = "should_not_combine", "Should not combine"
        SUPPORTS = "supports", "Supports"
        COMPETES_WITH = "competes_with", "Competes with"

    class EvidenceLevel(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    class Severity(models.TextChoices):
        INFO = "info", "Info"
        CAUTION = "caution", "Caution"
        WARNING = "warning", "Warning"

    source_type = models.CharField(max_length=20, choices=EntityType.choices)
    source_key = models.SlugField(max_length=160)
    target_type = models.CharField(max_length=20, choices=EntityType.choices)
    target_key = models.SlugField(max_length=160)
    interaction_type = models.CharField(max_length=30, choices=InteractionType.choices)
    mechanism = models.TextField()
    evidence_level = models.CharField(max_length=20, choices=EvidenceLevel.choices, default=EvidenceLevel.MEDIUM)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.INFO)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["source_type", "source_key", "target_type", "target_key"]
        indexes = [
            models.Index(fields=["source_type", "source_key"], name="nutr_inter_source_idx"),
            models.Index(fields=["target_type", "target_key"], name="nutr_inter_target_idx"),
            models.Index(fields=["interaction_type"], name="nutr_inter_type_idx"),
            models.Index(fields=["severity"], name="nutr_inter_severity_idx"),
            models.Index(fields=["active"], name="nutr_inter_active_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["source_type", "source_key", "target_type", "target_key", "interaction_type"],
                name="unique_nutrient_interaction",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.source_type}:{self.source_key} {self.interaction_type} {self.target_type}:{self.target_key}"
