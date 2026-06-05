from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=150)
    is_email_verified = models.BooleanField(default=False)
    email_verification_code_hash = models.CharField(max_length=128, blank=True)
    email_verification_expires_at = models.DateTimeField(null=True, blank=True)
    email_verification_sent_at = models.DateTimeField(null=True, blank=True)
    password_reset_code_hash = models.CharField(max_length=128, blank=True)
    password_reset_expires_at = models.DateTimeField(null=True, blank=True)
    password_reset_sent_at = models.DateTimeField(null=True, blank=True)
    google_sub = models.CharField(max_length=255, unique=True, null=True, blank=True)

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
        KETO = "keto", "Keto"
        MEDITERRANEAN = "mediterranean", "Mediterranean"
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
    expo_push_token = models.CharField(max_length=255, blank=True)
    timezone = models.CharField(max_length=50, default="UTC")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.user.email} profile"


class DailyTracking(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="daily_tracking", on_delete=models.CASCADE)
    date = models.DateField()
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    water_ml = models.PositiveIntegerField(default=0)
    calories = models.PositiveIntegerField(default=0)
    protein_g = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    fiber_g = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    steps = models.PositiveIntegerField(default=0)
    supplements_taken = models.JSONField(default=list, blank=True)
    food_entries = models.JSONField(default=list, blank=True)
    goals_completed = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]
        constraints = [
            models.UniqueConstraint(fields=["user", "date"], name="unique_daily_tracking_per_user"),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} tracking {self.date}"


class NotificationLog(models.Model):
    class NotificationType(models.TextChoices):
        FOOD_REMINDER = "food_reminder", "Food reminder"
        SUPPLEMENT_REMINDER = "supplement_reminder", "Supplement reminder"
        RECOMMENDATION_READY = "recommendation_ready", "Recommendation ready"
        GENERAL = "general", "General"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="notification_logs", on_delete=models.CASCADE)
    notification_type = models.CharField(max_length=40, choices=NotificationType.choices, default=NotificationType.GENERAL)
    title = models.CharField(max_length=160)
    body = models.TextField()
    data = models.JSONField(default=dict, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-sent_at"]
        indexes = [
            models.Index(fields=["user", "sent_at"], name="notif_log_user_sent_idx"),
            models.Index(fields=["notification_type"], name="notif_log_type_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.title}"
