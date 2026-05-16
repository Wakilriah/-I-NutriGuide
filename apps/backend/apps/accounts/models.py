from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=150)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    objects = UserManager()

    def __str__(self) -> str:
        return self.email


class Allergy(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "allergies"

    def __str__(self) -> str:
        return self.name


class DietaryRestriction(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class DislikedFood(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="disliked_foods", on_delete=models.CASCADE)
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=170)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["user", "slug"], name="unique_disliked_food_per_user"),
        ]

    def __str__(self) -> str:
        return self.name


class UserProfile(models.Model):
    class DietType(models.TextChoices):
        NONE = "none", "None"
        VEGETARIAN = "vegetarian", "Vegetarian"
        VEGAN = "vegan", "Vegan"
        HALAL = "halal", "Halal"
        PESCATARIAN = "pescatarian", "Pescatarian"
        GLUTEN_FREE = "gluten_free", "Gluten free"
        LACTOSE_FREE = "lactose_free", "Lactose free"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, related_name="profile", on_delete=models.CASCADE)
    country = models.CharField(max_length=100, blank=True)
    age = models.PositiveSmallIntegerField(null=True, blank=True)
    gender = models.CharField(max_length=50, blank=True)
    height_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    bmi = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    sports_days_per_week = models.PositiveSmallIntegerField(null=True, blank=True)
    goal = models.CharField(max_length=100, blank=True)
    goals = models.JSONField(default=list, blank=True)
    health_conditions = models.JSONField(default=list, blank=True)
    activity_level = models.CharField(max_length=100, blank=True)
    diet_type = models.CharField(max_length=30, choices=DietType.choices, default=DietType.NONE)
    allergies = models.ManyToManyField(Allergy, blank=True, related_name="profiles")
    dietary_restrictions = models.ManyToManyField(DietaryRestriction, blank=True, related_name="profiles")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.user.email} profile"
