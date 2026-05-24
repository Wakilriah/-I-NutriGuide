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
    brand_name = models.CharField(max_length=180, blank=True)
    manufacturer = models.CharField(max_length=180, blank=True)
    product_type = models.CharField(max_length=120, blank=True)
    upc = models.CharField(max_length=120, blank=True)
    physical_state = models.CharField(max_length=120, blank=True)
    off_market = models.BooleanField(null=True, blank=True)
    target_groups = models.JSONField(default=list, blank=True)
    raw_data = models.JSONField(default=dict, blank=True)
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
            models.Index(fields=["brand_name"], name="supplemen_s_brand_idx"),
            models.Index(fields=["product_type"], name="supplemen_s_product_type_idx"),
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


class SupplementIngredient(models.Model):
    supplement = models.ForeignKey(
        Supplement, related_name="label_ingredients", on_delete=models.CASCADE
    )
    source = models.CharField(max_length=80, default="NIH DSLD")
    source_id = models.CharField(max_length=120, blank=True)
    name = models.CharField(max_length=255)
    ingredient_group = models.CharField(max_length=255, blank=True)
    category = models.CharField(max_length=100, blank=True)
    amount = models.DecimalField(max_digits=14, decimal_places=4, null=True, blank=True)
    unit = models.CharField(max_length=40, blank=True)
    percent_daily_value = models.DecimalField(
        max_digits=10, decimal_places=3, null=True, blank=True
    )
    serving_size_order = models.PositiveIntegerField(null=True, blank=True)
    is_other_ingredient = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    raw_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["supplement__name", "name"]
        indexes = [
            models.Index(fields=["source", "source_id"], name="supp_ing_source_id_idx"),
            models.Index(fields=["ingredient_group"], name="supp_ing_group_idx"),
            models.Index(fields=["category"], name="supp_ing_category_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "supplement",
                    "source",
                    "source_id",
                    "name",
                    "is_other_ingredient",
                ],
                name="unique_supplement_label_ingredient",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.supplement} - {self.name}"


class SupplementLabelStatement(models.Model):
    supplement = models.ForeignKey(
        Supplement, related_name="label_statements", on_delete=models.CASCADE
    )
    source = models.CharField(max_length=80, default="NIH DSLD")
    statement_type = models.CharField(max_length=160)
    text = models.TextField()
    raw_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["supplement__name", "statement_type"]
        indexes = [
            models.Index(
                fields=["source", "statement_type"], name="supp_stmt_source_type_idx"
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["supplement", "source", "statement_type", "text"],
                name="unique_supplement_label_statement",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.supplement} - {self.statement_type}"


class SupplementIngredientGroup(models.Model):
    source = models.CharField(max_length=80, default="NIH DSLD")
    source_id = models.CharField(max_length=120)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=180)
    categories = models.JSONField(default=list, blank=True)
    synonyms = models.JSONField(default=list, blank=True)
    fact_sheets = models.JSONField(default=list, blank=True)
    nutrient_info = models.JSONField(default=list, blank=True)
    raw_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["slug"], name="supp_group_slug_idx"),
            models.Index(fields=["source", "source_id"], name="supp_group_source_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["source", "source_id"],
                name="unique_supplement_ingredient_group",
            ),
        ]

    def __str__(self) -> str:
        return self.name


class SupplementResearchEstimate(models.Model):
    source = models.CharField(max_length=80, default="NIH DSID")
    release = models.CharField(max_length=40, default="DSID-4")
    table_name = models.CharField(max_length=80, default="Table2")
    study_code = models.CharField(max_length=40, blank=True)
    ingredient_name = models.CharField(max_length=180)
    ingredient_key = models.SlugField(max_length=180)
    labeled_amount = models.DecimalField(
        max_digits=14, decimal_places=4, null=True, blank=True
    )
    labeled_unit = models.CharField(max_length=40, blank=True)
    predicted_amount = models.DecimalField(
        max_digits=14, decimal_places=4, null=True, blank=True
    )
    predicted_unit = models.CharField(max_length=40, blank=True)
    predicted_percent_difference = models.DecimalField(
        max_digits=10, decimal_places=4, null=True, blank=True
    )
    standard_error_mean = models.DecimalField(
        max_digits=14, decimal_places=4, null=True, blank=True
    )
    standard_error_observation = models.DecimalField(
        max_digits=14, decimal_places=4, null=True, blank=True
    )
    linking_code = models.CharField(max_length=120, blank=True)
    raw_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["ingredient_name", "labeled_amount"]
        indexes = [
            models.Index(
                fields=["source", "release"], name="supp_est_source_release_idx"
            ),
            models.Index(fields=["ingredient_key"], name="supp_est_ingredient_idx"),
            models.Index(fields=["study_code"], name="supp_est_study_idx"),
            models.Index(fields=["linking_code"], name="supp_est_linking_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["source", "release", "table_name", "linking_code"],
                name="unique_supplement_research_estimate",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.release} {self.ingredient_name} {self.labeled_amount or ''}{self.labeled_unit}"


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
