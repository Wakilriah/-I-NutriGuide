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
    score = models.FloatField(default=0)
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


class SupplementCategory(models.Model):
    category = models.CharField(max_length=150, unique=True)
    canonical_item = models.CharField(max_length=120, unique=True)
    keywords = models.JSONField(default=list, blank=True)
    main_nutrient = models.CharField(max_length=150, blank=True)
    source_url = models.URLField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category"]
        indexes = [
            models.Index(fields=["canonical_item"], name="rules_supp_cat_canon_idx"),
            models.Index(fields=["is_active"], name="rules_supp_cat_active_idx"),
        ]

    @property
    def association_item(self) -> str:
        return f"supp:{self.canonical_item}"

    def __str__(self) -> str:
        return f"{self.category} ({self.association_item})"


class SupplementNormalization(models.Model):
    original_supplement_name = models.CharField(max_length=220)
    original_supplement_slug = models.SlugField(max_length=240, unique=True)
    category = models.ForeignKey(
        SupplementCategory,
        related_name="normalizations",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    normalized_category = models.CharField(max_length=150)
    primary_keyword = models.CharField(max_length=150, blank=True)
    main_nutrient = models.CharField(max_length=150, blank=True)
    notes = models.TextField(blank=True)
    source_url = models.URLField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["normalized_category", "original_supplement_name"]
        indexes = [
            models.Index(fields=["normalized_category"], name="rules_supp_norm_cat_idx"),
            models.Index(fields=["original_supplement_slug"], name="rules_supp_norm_slug_idx"),
            models.Index(fields=["is_active"], name="rules_supp_norm_active_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.original_supplement_name} -> {self.normalized_category}"


class FoodSupplementSynergyRule(models.Model):
    class AssociationType(models.TextChoices):
        POSITIVE = "positive", "Positive"
        NEUTRAL = "neutral", "Neutral"

    rule_seed_id = models.CharField(max_length=80, unique=True)
    supplement_category = models.ForeignKey(
        SupplementCategory,
        related_name="synergy_rules",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    supplement_category_name = models.CharField(max_length=150)
    supplement_item = models.CharField(max_length=150)
    food = models.CharField(max_length=180)
    food_item = models.CharField(max_length=180)
    nutrient_relation = models.CharField(max_length=180, blank=True)
    association_type = models.CharField(max_length=40, choices=AssociationType.choices, default=AssociationType.POSITIVE)
    reason = models.TextField()
    seed_weight = models.FloatField(default=0.75)
    source_url = models.URLField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["supplement_item", "food_item"]
        indexes = [
            models.Index(fields=["supplement_item"], name="rules_syn_supp_idx"),
            models.Index(fields=["food_item"], name="rules_syn_food_idx"),
            models.Index(fields=["association_type"], name="rules_syn_type_idx"),
            models.Index(fields=["is_active"], name="rules_syn_active_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.supplement_item} -> {self.food_item}"


class SafetyConstraint(models.Model):
    class ConstraintType(models.TextChoices):
        AVOID_TIMING = "avoid_timing", "Avoid timing"
        MEDICAL_REVIEW = "medical_review", "Medical review"
        MEDICAL_CAUTION = "medical_caution", "Medical caution"
        EXCLUSION = "exclusion", "Exclusion"

    class SafetyLevel(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"

    supplement_category = models.ForeignKey(
        SupplementCategory,
        related_name="safety_constraints",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    supplement_category_name = models.CharField(max_length=150)
    avoid_or_review_item = models.CharField(max_length=180)
    constraint_type = models.CharField(max_length=40, choices=ConstraintType.choices)
    safety_level = models.CharField(max_length=10, choices=SafetyLevel.choices, default=SafetyLevel.MEDIUM)
    reason = models.TextField()
    how_to_use = models.TextField(blank=True)
    source_url = models.URLField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["supplement_category_name", "constraint_type", "avoid_or_review_item"]
        indexes = [
            models.Index(fields=["supplement_category_name"], name="rules_safe_supp_idx"),
            models.Index(fields=["constraint_type"], name="rules_safe_type_idx"),
            models.Index(fields=["is_active"], name="rules_safe_active_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=("supplement_category_name", "avoid_or_review_item", "constraint_type"),
                name="unique_safety_constraint",
            )
        ]

    def __str__(self) -> str:
        return f"{self.supplement_category_name}: {self.avoid_or_review_item}"


class AssociationTransaction(models.Model):
    transaction_id = models.CharField(max_length=80, unique=True)
    source = models.CharField(max_length=80, default="association_excel")
    raw_payload = models.JSONField(default=dict, blank=True)
    one_hot_items = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["transaction_id"]
        indexes = [
            models.Index(fields=["transaction_id"], name="rules_txn_id_idx"),
            models.Index(fields=["source"], name="rules_txn_source_idx"),
        ]

    def __str__(self) -> str:
        return self.transaction_id


class AssociationTransactionItem(models.Model):
    transaction = models.ForeignKey(AssociationTransaction, related_name="items", on_delete=models.CASCADE)
    item_type = models.CharField(max_length=50)
    item_value = models.CharField(max_length=180)
    item = models.CharField(max_length=220)

    class Meta:
        ordering = ["transaction__transaction_id", "item"]
        indexes = [
            models.Index(fields=["item"], name="rules_txn_item_idx"),
            models.Index(fields=["item_type"], name="rules_txn_item_type_idx"),
        ]
        constraints = [
            models.UniqueConstraint(fields=("transaction", "item"), name="unique_item_per_transaction"),
        ]

    def __str__(self) -> str:
        return f"{self.transaction.transaction_id}: {self.item}"


class MinedAssociationRule(models.Model):
    class RuleType(models.TextChoices):
        POSITIVE_SYNERGY = "positive_synergy", "Positive synergy"
        AVOID_TIMING = "avoid_timing", "Avoid timing"
        MEDICAL_CAUTION = "medical_caution", "Medical caution"
        NEUTRAL_PATTERN = "neutral_pattern", "Neutral pattern"

    class ReviewStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        NEEDS_REVIEW = "needs_review", "Needs review"

    rule_key = models.CharField(max_length=64, unique=True)
    antecedent_items = models.JSONField(default=list)
    consequent_items = models.JSONField(default=list)
    support = models.FloatField(default=0)
    confidence = models.FloatField(default=0)
    lift = models.FloatField(default=0)
    score = models.FloatField(default=0)
    rule_type = models.CharField(max_length=40, choices=RuleType.choices, default=RuleType.NEUTRAL_PATTERN)
    review_status = models.CharField(max_length=20, choices=ReviewStatus.choices, default=ReviewStatus.PENDING)
    admin_note = models.TextField(blank=True)
    safety_conflict_status = models.CharField(max_length=40, default="unchecked")
    safety_conflict_details = models.JSONField(default=list, blank=True)
    source = models.CharField(max_length=80, default="mined")
    explanation = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-confidence", "-lift", "rule_key"]
        indexes = [
            models.Index(fields=["rule_type"], name="rules_mined_type_idx"),
            models.Index(fields=["confidence"], name="rules_mined_conf_idx"),
            models.Index(fields=["lift"], name="rules_mined_lift_idx"),
            models.Index(fields=["is_active"], name="rules_mined_active_idx"),
        ]

    def __str__(self) -> str:
        return f"{', '.join(self.antecedent_items)} -> {', '.join(self.consequent_items)}"
