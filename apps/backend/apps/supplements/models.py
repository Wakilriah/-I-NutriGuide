from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Supplement(models.Model):
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=170, unique=True, blank=True)
    description = models.TextField(blank=True)
    common_dose = models.CharField(max_length=100, blank=True)
    source = models.CharField(max_length=80, blank=True)
    source_id = models.CharField(max_length=120, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["slug"], name="supplemen_s_slug_5de8fe_idx"),
            models.Index(fields=["is_active"], name="supplemen_s_is_act_7b677d_idx"),
            models.Index(
                fields=["source", "source_id"], name="supplemen_s_source_id_idx"
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class SupplementNutrient(models.Model):
    supplement = models.ForeignKey(
        Supplement, related_name="nutrients", on_delete=models.CASCADE
    )
    nutrient = models.ForeignKey(
        "nutrients.Nutrient",
        related_name="supplement_sources",
        on_delete=models.PROTECT,
    )
    amount = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    unit = models.CharField(max_length=20, blank=True)

    class Meta:
        ordering = ["nutrient__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["supplement", "nutrient"], name="unique_nutrient_per_supplement"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.supplement} - {self.nutrient}"


class SupplementAlias(models.Model):
    supplement = models.ForeignKey(
        Supplement, related_name="aliases", on_delete=models.CASCADE
    )
    alias = models.CharField(max_length=180)
    slug = models.SlugField(max_length=200)
    source = models.CharField(max_length=80, blank=True)
    source_url = models.URLField(max_length=500, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["alias"]
        indexes = [
            models.Index(fields=["slug"], name="supp_alias_slug_idx"),
            models.Index(fields=["active"], name="supp_alias_active_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["supplement", "slug"], name="unique_alias_per_supplement"
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.alias)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.alias} -> {self.supplement.name}"


class SupplementSafetyRule(models.Model):
    class RuleType(models.TextChoices):
        ABSORPTION = "absorption", "Absorption"
        DRUG_INTERACTION = "drug_interaction", "Drug interaction"
        CONDITION_CAUTION = "condition_caution", "Condition caution"
        PREGNANCY_CAUTION = "pregnancy_caution", "Pregnancy caution"
        UPPER_LIMIT = "upper_limit", "Upper limit"
        SIDE_EFFECT = "side_effect", "Side effect"

    class Severity(models.TextChoices):
        INFO = "info", "Info"
        CAUTION = "caution", "Caution"
        WARNING = "warning", "Warning"

    supplement = models.ForeignKey(
        Supplement, related_name="safety_rules", on_delete=models.CASCADE
    )
    rule_type = models.CharField(max_length=40, choices=RuleType.choices)
    interacting_entity = models.CharField(max_length=180, blank=True)
    severity = models.CharField(
        max_length=20, choices=Severity.choices, default=Severity.CAUTION
    )
    title = models.CharField(max_length=220)
    description = models.TextField()
    recommendation = models.TextField(blank=True)
    source = models.CharField(max_length=80, blank=True)
    source_url = models.URLField(max_length=500, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["supplement__name", "severity", "rule_type", "title"]
        indexes = [
            models.Index(fields=["rule_type"], name="supp_safety_type_idx"),
            models.Index(fields=["severity"], name="supp_safety_severity_idx"),
            models.Index(fields=["active"], name="supp_safety_active_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["supplement", "rule_type", "interacting_entity", "title"],
                name="unique_supplement_safety_rule",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.supplement.name}: {self.title}"


class SupplementFactSheet(models.Model):
    class Audience(models.TextChoices):
        CONSUMER = "consumer", "Consumer"
        HEALTH_PROFESSIONAL = "health_professional", "Health Professional"

    source = models.CharField(max_length=80, default="NIH ODS")
    source_id = models.CharField(max_length=120)
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=180, unique=True)
    audience = models.CharField(
        max_length=30, choices=Audience.choices, default=Audience.CONSUMER
    )
    url = models.URLField(max_length=500, unique=True)
    description = models.TextField(blank=True)
    benefits = models.TextField(blank=True)
    safety = models.TextField(blank=True)
    interactions = models.TextField(blank=True)
    recommended_intake = models.TextField(blank=True)
    deficiency = models.TextField(blank=True)
    food_sources = models.TextField(blank=True)
    raw_sections = models.JSONField(default=dict, blank=True)
    raw_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["title", "audience"]
        indexes = [
            models.Index(fields=["source", "source_id"], name="supp_fact_source_idx"),
            models.Index(fields=["audience"], name="supp_fact_audience_idx"),
            models.Index(fields=["slug"], name="supp_fact_slug_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["source", "source_id", "audience"],
                name="unique_supplement_fact_sheet",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.get_audience_display()})"


class SupplementDataImportCheckpoint(models.Model):
    source = models.CharField(max_length=80, unique=True)
    cursor = models.PositiveIntegerField(default=0)
    total_count = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=40, default="pending")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["source"]

    def __str__(self) -> str:
        return f"{self.source}: {self.status} at {self.cursor}/{self.total_count}"


class UserSupplement(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="supplements", on_delete=models.CASCADE
    )
    supplement = models.ForeignKey(
        Supplement, related_name="user_entries", on_delete=models.PROTECT
    )
    dose = models.CharField(max_length=100, blank=True)
    frequency = models.CharField(max_length=100, blank=True)
    time_of_day = models.CharField(max_length=100, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["user", "active"], name="supplemen_u_user_id_210bbc_idx"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.supplement.name}"
