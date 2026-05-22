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
