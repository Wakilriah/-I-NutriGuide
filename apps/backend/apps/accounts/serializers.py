from django.contrib.auth import get_user_model
from django.utils.crypto import get_random_string
from django.contrib.auth.password_validation import validate_password
from django.utils.text import slugify
from drf_spectacular.utils import extend_schema_field, inline_serializer
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Allergy, DietaryRestriction, DislikedFood, UserProfile

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "name", "is_staff"]
        read_only_fields = ["id", "is_staff"]


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
        return User.objects.create_user(password=password, **validated_data)

    def to_representation(self, instance):
        refresh = RefreshToken.for_user(instance)
        return {
            "user": UserSerializer(instance).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }


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
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

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
