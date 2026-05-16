from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Supplement(models.Model):
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=170, unique=True, blank=True)
    description = models.TextField(blank=True)
    common_dose = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["slug"], name="supplemen_s_slug_5de8fe_idx"),
            models.Index(fields=["is_active"], name="supplemen_s_is_act_7b677d_idx"),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class SupplementNutrient(models.Model):
    supplement = models.ForeignKey(Supplement, related_name="nutrients", on_delete=models.CASCADE)
    nutrient = models.ForeignKey("nutrients.Nutrient", related_name="supplement_sources", on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    unit = models.CharField(max_length=20, blank=True)

    class Meta:
        ordering = ["nutrient__name"]
        constraints = [
            models.UniqueConstraint(fields=["supplement", "nutrient"], name="unique_nutrient_per_supplement"),
        ]

    def __str__(self) -> str:
        return f"{self.supplement} - {self.nutrient}"


class UserSupplement(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="supplements", on_delete=models.CASCADE)
    supplement = models.ForeignKey(Supplement, related_name="user_entries", on_delete=models.PROTECT)
    dose = models.CharField(max_length=100, blank=True)
    frequency = models.CharField(max_length=100, blank=True)
    time_of_day = models.CharField(max_length=100, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "active"], name="supplemen_u_user_id_210bbc_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.supplement.name}"
