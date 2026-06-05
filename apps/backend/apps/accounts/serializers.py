from django.contrib.auth import get_user_model
from django.utils.crypto import get_random_string
from django.contrib.auth.password_validation import validate_password
from django.utils.text import slugify
from django.conf import settings
from drf_spectacular.utils import extend_schema_field, inline_serializer
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from .models import Allergy, DailyTracking, DietaryRestriction, DislikedFood, NotificationLog, UserProfile
from .services import (
    can_resend_email_verification,
    can_send_password_reset,
    issue_email_verification_code,
    issue_password_reset_code,
    reset_password_with_code,
    verify_email_code,
)

User = get_user_model()

PROFILE_GENDERS = {"female", "male", "prefer_not_to_say"}
PROFILE_GOALS = {"general_health", "energy", "immunity", "muscle", "weight_loss", "digestive_health"}
PROFILE_ACTIVITY_LEVELS = {"light", "moderate", "active", "very_active"}
MAX_PROFILE_LIST_ITEMS = 8
MAX_DISLIKED_FOODS = 12

ALLERGY_ALIASES = {
    "peanut": "peanuts",
    "peanuts": "peanuts",
    "tree-nuts": "tree_nuts",
    "tree_nuts": "tree_nuts",
    "tree nuts": "tree_nuts",
    "milk": "milk",
    "egg": "eggs",
    "eggs": "eggs",
    "shellfish": "shellfish",
    "fish": "fish",
    "soy": "soy",
    "wheat": "wheat",
    "gluten": "gluten",
    "sesame": "sesame",
}
DIETARY_RESTRICTION_ALIASES = {
    "halal": "halal",
    "vegetarian": "vegetarian",
    "vegan": "vegan",
    "pescatarian": "pescatarian",
    "gluten-free": "gluten_free",
    "gluten_free": "gluten_free",
    "gluten free": "gluten_free",
    "lactose-free": "lactose_free",
    "lactose_free": "lactose_free",
    "lactose free": "lactose_free",
}


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "name", "is_staff", "is_email_verified"]
        read_only_fields = ["id", "is_staff", "is_email_verified"]


def build_auth_session(user):
    refresh = RefreshToken.for_user(user)
    return {
        "user": UserSerializer(user).data,
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


class EmailVerifiedTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.is_email_verified:
            raise serializers.ValidationError("Please verify your email before signing in.")
        return data


class AdminUserSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()
    supplement_count = serializers.IntegerField(read_only=True)
    recommendation_count = serializers.IntegerField(read_only=True)
    feedback_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "name",
            "is_staff",
            "is_active",
            "date_joined",
            "profile",
            "supplement_count",
            "recommendation_count",
            "feedback_count",
        ]
        read_only_fields = fields

    @extend_schema_field(
        inline_serializer(
            name="AdminUserProfileSummary",
            fields={
                "age": serializers.IntegerField(allow_null=True),
                "country": serializers.CharField(),
                "gender": serializers.CharField(),
                "bmi": serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True),
                "sports_days_per_week": serializers.IntegerField(allow_null=True),
                "goal": serializers.CharField(),
                "goals": serializers.ListField(child=serializers.CharField()),
                "health_conditions": serializers.ListField(child=serializers.CharField()),
                "activity_level": serializers.CharField(),
                "diet_type": serializers.CharField(),
                "allergies": serializers.ListField(child=serializers.CharField()),
                "dietary_restrictions": serializers.ListField(child=serializers.CharField()),
                "disliked_foods": serializers.ListField(child=serializers.CharField()),
            },
        )
    )
    def get_profile(self, obj):
        profile = getattr(obj, "profile", None)
        if profile is None:
            return None
        return {
            "age": profile.age,
            "country": profile.country,
            "gender": profile.gender,
            "bmi": profile.bmi,
            "sports_days_per_week": profile.sports_days_per_week,
            "goal": profile.goal,
            "goals": profile.goals,
            "health_conditions": profile.health_conditions,
            "activity_level": profile.activity_level,
            "diet_type": profile.diet_type,
            "allergies": list(profile.allergies.values_list("slug", flat=True)),
            "dietary_restrictions": list(profile.dietary_restrictions.values_list("slug", flat=True)),
            "disliked_foods": list(obj.disliked_foods.values_list("slug", flat=True)),
        }


class AdminUserDetailSerializer(AdminUserSerializer):
    supplements = serializers.SerializerMethodField()
    recent_recommendations = serializers.SerializerMethodField()
    recent_feedback = serializers.SerializerMethodField()

    class Meta(AdminUserSerializer.Meta):
        fields = AdminUserSerializer.Meta.fields + ["supplements", "recent_recommendations", "recent_feedback"]
        read_only_fields = fields

    def get_supplements(self, obj):
        return [
            {
                "id": entry.id,
                "name": entry.supplement.name,
                "slug": entry.supplement.slug,
                "dose": entry.dose,
                "frequency": entry.frequency,
                "time_of_day": entry.time_of_day,
                "active": entry.active,
                "created_at": entry.created_at,
            }
            for entry in obj.supplements.all()[:10]
        ]

    def get_recent_recommendations(self, obj):
        runs = []
        for run in obj.recommendation_runs.all()[:5]:
            top_item = next(iter(run.items.all()), None)
            runs.append(
                {
                    "run_id": run.id,
                    "created_at": run.created_at,
                    "item_count": len(run.items.all()),
                    "top_food": top_item.food.name if top_item else "",
                    "top_score": top_item.score if top_item else None,
                }
            )
        return runs

    def get_recent_feedback(self, obj):
        return [
            {
                "id": feedback.id,
                "rating": feedback.rating,
                "is_helpful": feedback.is_helpful,
                "comment": feedback.comment,
                "created_at": feedback.created_at,
                "food": feedback.recommendation_item.food.name,
                "run_id": feedback.recommendation_item.run_id,
            }
            for feedback in obj.recommendation_feedback.all()[:5]
        ]


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    name = serializers.CharField(max_length=150)

    def validate_email(self, value):
        email = value.lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, is_email_verified=False, **validated_data)
        issue_email_verification_code(user)
        return user

    def to_representation(self, instance):
        return {
            "user": UserSerializer(instance).data,
            "verification_required": not instance.is_email_verified,
            "detail": "We sent a verification code to your email.",
        }


class VerifyEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(min_length=6, max_length=6)

    def validate_email(self, value):
        return value.lower()

    def validate(self, attrs):
        try:
            user = User.objects.get(email=attrs["email"])
        except User.DoesNotExist as exc:
            raise serializers.ValidationError("Invalid or expired verification code.") from exc
        if not verify_email_code(user, attrs["code"]):
            raise serializers.ValidationError("Invalid or expired verification code.")
        attrs["user"] = user
        return attrs

    def create(self, validated_data):
        return validated_data["user"]

    def to_representation(self, instance):
        return build_auth_session(instance)


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        email = value.lower()
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist as exc:
            raise serializers.ValidationError("No account was found for this email.") from exc
        if user.is_email_verified:
            raise serializers.ValidationError("This email is already verified.")
        if not can_resend_email_verification(user):
            raise serializers.ValidationError("Please wait before requesting another code.")
        self.user = user
        return email

    def save(self, **kwargs):
        issue_email_verification_code(self.user)
        return self.user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower()

    def save(self, **kwargs):
        try:
            user = User.objects.get(email=self.validated_data["email"])
        except User.DoesNotExist:
            return None
        if user.has_usable_password() and can_send_password_reset(user):
            issue_password_reset_code(user)
        return user


class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(min_length=6, max_length=6)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        return value.lower()

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        try:
            user = User.objects.get(email=attrs["email"])
        except User.DoesNotExist as exc:
            raise serializers.ValidationError("Invalid or expired reset code.") from exc
        if not reset_password_with_code(user, attrs["code"], attrs["password"]):
            raise serializers.ValidationError("Invalid or expired reset code.")
        attrs["user"] = user
        return attrs

    def create(self, validated_data):
        return validated_data["user"]

    def to_representation(self, instance):
        return {"detail": "Your password has been reset. You can sign in now."}


class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField(write_only=True)

    def validate_id_token(self, value):
        if not settings.GOOGLE_OAUTH_CLIENT_IDS:
            raise serializers.ValidationError("Google sign-in is not configured.")
        try:
            info = id_token.verify_oauth2_token(value, google_requests.Request())
        except ValueError as exc:
            raise serializers.ValidationError("Invalid Google token.") from exc
        if info.get("aud") not in settings.GOOGLE_OAUTH_CLIENT_IDS:
            raise serializers.ValidationError("Invalid Google token audience.")
        if not info.get("email"):
            raise serializers.ValidationError("Google account email is required.")
        if info.get("email_verified") is False:
            raise serializers.ValidationError("Google account email must be verified.")
        self.google_info = info
        return value

    def create(self, validated_data):
        info = self.google_info
        email = info["email"].lower()
        google_sub = info["sub"]
        name = info.get("name") or email.split("@")[0]
        user = User.objects.filter(google_sub=google_sub).first()
        if user is None:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "name": name,
                    "google_sub": google_sub,
                    "is_email_verified": True,
                },
            )
            if created:
                user.set_unusable_password()
                user.save(update_fields=["password"])
        changed_fields = []
        if user.google_sub != google_sub:
            user.google_sub = google_sub
            changed_fields.append("google_sub")
        if not user.is_email_verified:
            user.is_email_verified = True
            changed_fields.append("is_email_verified")
        if not user.name and name:
            user.name = name
            changed_fields.append("name")
        if changed_fields:
            user.save(update_fields=changed_fields)
        return user

    def to_representation(self, instance):
        return build_auth_session(instance)


class ProfileSerializer(serializers.ModelSerializer):
    allergies = serializers.ListField(child=serializers.CharField(max_length=100), required=False, write_only=True)
    dietary_restrictions = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        write_only=True,
    )
    disliked_foods = serializers.ListField(child=serializers.CharField(max_length=150), required=False, write_only=True)

    class Meta:
        model = UserProfile
        fields = [
            "age",
            "country",
            "gender",
            "height_cm",
            "weight_kg",
            "bmi",
            "sports_days_per_week",
            "goal",
            "goals",
            "health_conditions",
            "activity_level",
            "diet_type",
            "allergies",
            "dietary_restrictions",
            "disliked_foods",
            "expo_push_token",
            "timezone",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_age(self, value):
        if value is not None and not 13 <= value <= 120:
            raise serializers.ValidationError("Age must be between 13 and 120.")
        return value

    def validate_gender(self, value):
        if value and value not in PROFILE_GENDERS:
            raise serializers.ValidationError("Choose one of the supported gender options.")
        return value

    def validate_height_cm(self, value):
        if value is not None and not 80 <= value <= 250:
            raise serializers.ValidationError("Height must be between 80 and 250 cm.")
        return value

    def validate_weight_kg(self, value):
        if value is not None and not 30 <= value <= 300:
            raise serializers.ValidationError("Weight must be between 30 and 300 kg.")
        return value

    def validate_goal(self, value):
        if value and value not in PROFILE_GOALS:
            raise serializers.ValidationError("Choose one of the supported nutrition goals.")
        return value

    def validate_activity_level(self, value):
        if value and value not in PROFILE_ACTIVITY_LEVELS:
            raise serializers.ValidationError("Choose one of the supported activity levels.")
        return value

    def validate_allergies(self, value):
        return self._validate_limited_choice_list(value, ALLERGY_ALIASES, "allergies")

    def validate_dietary_restrictions(self, value):
        return self._validate_limited_choice_list(value, DIETARY_RESTRICTION_ALIASES, "dietary restrictions")

    def validate_disliked_foods(self, value):
        if len(value) > MAX_DISLIKED_FOODS:
            raise serializers.ValidationError(f"Choose up to {MAX_DISLIKED_FOODS} disliked foods.")
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["allergies"] = list(instance.allergies.values_list("slug", flat=True))
        data["dietary_restrictions"] = list(instance.dietary_restrictions.values_list("slug", flat=True))
        data["disliked_foods"] = list(instance.user.disliked_foods.values_list("slug", flat=True))
        return data

    def update(self, instance, validated_data):
        allergies = validated_data.pop("allergies", None)
        dietary_restrictions = validated_data.pop("dietary_restrictions", None)
        disliked_foods = validated_data.pop("disliked_foods", None)

        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        if allergies is not None:
            instance.allergies.set(self._get_named_records(Allergy, allergies))
        if dietary_restrictions is not None:
            instance.dietary_restrictions.set(self._get_named_records(DietaryRestriction, dietary_restrictions))
        if disliked_foods is not None:
            self._replace_disliked_foods(instance.user, disliked_foods)

        return instance

    def _get_named_records(self, model, names):
        records = []
        for raw_name in names:
            name = raw_name.strip()
            if not name:
                continue
            slug = slugify(name)
            record, _created = model.objects.get_or_create(slug=slug, defaults={"name": name})
            records.append(record)
        return records

    def _replace_disliked_foods(self, user, names):
        user.disliked_foods.all().delete()
        disliked_foods = []
        seen_slugs = set()
        for raw_name in names:
            name = raw_name.strip()
            slug = slugify(name)
            if not name or slug in seen_slugs:
                continue
            seen_slugs.add(slug)
            disliked_foods.append(DislikedFood(user=user, name=name, slug=slug))
        DislikedFood.objects.bulk_create(disliked_foods)

    def _validate_limited_choice_list(self, values, aliases, label):
        if len(values) > MAX_PROFILE_LIST_ITEMS:
            raise serializers.ValidationError(f"Choose up to {MAX_PROFILE_LIST_ITEMS} {label}.")
        normalized = []
        unsupported = []
        for raw_value in values:
            key = raw_value.strip().lower().replace("_", " ")
            slug_key = slugify(raw_value.strip()).replace("-", "_")
            canonical = aliases.get(key) or aliases.get(slug_key) or aliases.get(slugify(raw_value.strip()))
            if canonical is None:
                unsupported.append(raw_value)
            elif canonical not in normalized:
                normalized.append(canonical)
        if unsupported:
            raise serializers.ValidationError(f"Unsupported {label}: {', '.join(unsupported)}.")
        return normalized


class AdminUserWriteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=8)
    profile = ProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ["id", "email", "name", "password", "is_staff", "is_active", "profile"]
        read_only_fields = ["id"]

    def validate_email(self, value):
        email = value.lower()
        queryset = User.objects.filter(email=email)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate_password(self, value):
        if value:
            validate_password(value)
        return value

    def create(self, validated_data):
        profile_data = validated_data.pop("profile", None)
        password = validated_data.pop("password", None) or get_random_string(16)
        user = User.objects.create_user(password=password, **validated_data)
        if profile_data is not None:
            self._save_profile(user, profile_data)
        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", None)
        password = validated_data.pop("password", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
        instance.save()
        if profile_data is not None:
            self._save_profile(instance, profile_data)
        return instance

    def _save_profile(self, user, profile_data):
        profile, _created = UserProfile.objects.get_or_create(user=user)
        serializer = ProfileSerializer(instance=profile, data=profile_data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()


class DailyTrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyTracking
        fields = [
            "date",
            "weight_kg",
            "water_ml",
            "calories",
            "protein_g",
            "fiber_g",
            "steps",
            "supplements_taken",
            "food_entries",
            "goals_completed",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["date", "created_at", "updated_at"]

    def validate_food_entries(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Food entries must be a list.")
        normalized = []
        for index, entry in enumerate(value[:100]):
            if not isinstance(entry, dict):
                raise serializers.ValidationError(f"Food entry {index + 1} must be an object.")
            serving_g = entry.get("serving_g")
            try:
                serving_g = float(serving_g)
            except (TypeError, ValueError):
                raise serializers.ValidationError(f"Food entry {index + 1} requires serving_g in grams.")
            if serving_g <= 0 or serving_g > 5000:
                raise serializers.ValidationError(f"Food entry {index + 1} serving_g must be between 1 and 5000 grams.")
            normalized.append(
                {
                    **entry,
                    "serving_g": round(serving_g, 1),
                    "carbs_g": self._coerce_food_number(entry.get("carbs_g"), "carbs_g", index),
                    "fat_g": self._coerce_food_number(entry.get("fat_g"), "fat_g", index),
                    "meal_type": str(entry.get("meal_type", "")).strip()[:40],
                    "unit": str(entry.get("unit", "")).strip()[:20],
                    "time": str(entry.get("time", "")).strip()[:20],
                    "notes": str(entry.get("notes", "")).strip()[:500],
                }
            )
        return normalized

    def _coerce_food_number(self, value, field, index):
        if value in (None, ""):
            return 0
        try:
            number = float(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError(f"Food entry {index + 1} {field} must be numeric.")
        if number < 0 or number > 10000:
            raise serializers.ValidationError(f"Food entry {index + 1} {field} must be between 0 and 10000.")
        return round(number, 1)

    def validate_water_ml(self, value):
        if value > 10000:
            raise serializers.ValidationError("Water should be 10000 ml or less.")
        return value

    def validate_calories(self, value):
        if value > 10000:
            raise serializers.ValidationError("Calories should be 10000 or less.")
        return value

    def validate_steps(self, value):
        if value > 100000:
            raise serializers.ValidationError("Steps should be 100000 or less.")
        return value

    def validate_supplements_taken(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Supplements taken must be a list.")
        return value[:50]


class NotificationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationLog
        fields = ["id", "notification_type", "title", "body", "data", "sent_at", "read_at"]
        read_only_fields = fields
