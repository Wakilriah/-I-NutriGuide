from django.db import models
from django.utils.text import slugify


class FoodCategory(models.Model):
    name = models.CharField(max_length=150, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    ciqual_group_code = models.CharField(max_length=20, blank=True)
    ciqual_subgroup_code = models.CharField(max_length=20, blank=True)
    ciqual_subsubgroup_code = models.CharField(max_length=20, blank=True)
    source = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class Food(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    category = models.ForeignKey(FoodCategory, related_name="foods", on_delete=models.PROTECT)
    description = models.TextField(blank=True)
    scientific_name = models.CharField(max_length=255, blank=True)
    ciqual_code = models.CharField(max_length=32, unique=True, null=True, blank=True)
    source = models.CharField(max_length=50, blank=True)
    serving_size_g = models.DecimalField(max_digits=10, decimal_places=3, default=100)
    image_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["slug"], name="foods_food_slug_67fa50_idx"),
            models.Index(fields=["is_active"], name="foods_food_is_acti_921c68_idx"),
            models.Index(fields=["ciqual_code"], name="foods_food_ciqual__1bd7a8_idx"),
            models.Index(fields=["source"], name="foods_food_source_6d0ea9_idx"),
            models.Index(fields=["category", "source"], name="foods_food_categor_fefb9b_idx"),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class FoodNutrient(models.Model):
    food = models.ForeignKey(Food, related_name="nutrients", on_delete=models.CASCADE)
    nutrient = models.ForeignKey("nutrients.Nutrient", related_name="food_sources", on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=10, decimal_places=3)
    unit = models.CharField(max_length=20)
    per_quantity = models.DecimalField(max_digits=10, decimal_places=3, default=100)
    per_unit = models.CharField(max_length=20, default="g")

    class Meta:
        ordering = ["nutrient__name"]
        constraints = [
            models.UniqueConstraint(fields=["food", "nutrient"], name="unique_nutrient_per_food"),
        ]

    def __str__(self) -> str:
        return f"{self.food} - {self.nutrient}"
