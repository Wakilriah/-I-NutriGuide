from django.contrib.auth import get_user_model
from django.db.models import Count
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from django.db.models import Q
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import UserProfile
from apps.common.pagination import AdminPageNumberPagination

from .serializers import AdminUserDetailSerializer, AdminUserSerializer, AdminUserWriteSerializer, ProfileSerializer, RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]


class RefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=UserSerializer)
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


class AdminUserListView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAdminUser]
    pagination_class = AdminPageNumberPagination

    def get_serializer_class(self):
        return AdminUserWriteSerializer if self.request.method == "POST" else AdminUserSerializer

    def create(self, request, *args, **kwargs):
        serializer = AdminUserWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user = self.get_queryset().get(pk=user.pk)
        return Response(AdminUserSerializer(user).data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        queryset = (
            get_user_model()
            .objects.select_related("profile")
            .prefetch_related("profile__allergies", "profile__dietary_restrictions", "disliked_foods")
            .annotate(
                supplement_count=Count("supplements", distinct=True),
                recommendation_count=Count("recommendation_runs", distinct=True),
                feedback_count=Count("recommendation_feedback", distinct=True),
            )
            .order_by("-date_joined")
        )
        search = self.request.query_params.get("search")
        status_filter = self.request.query_params.get("is_active")
        role = self.request.query_params.get("role")
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search)
                | Q(name__icontains=search)
                | Q(profile__goal__icontains=search)
                | Q(profile__diet_type__icontains=search)
            )
        if status_filter in {"true", "false"}:
            queryset = queryset.filter(is_active=status_filter == "true")
        if role == "admin":
            queryset = queryset.filter(is_staff=True)
        if role == "user":
            queryset = queryset.filter(is_staff=False)
        return queryset


class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAdminUser]

    def get_serializer_class(self):
        return AdminUserWriteSerializer if self.request.method in {"PUT", "PATCH"} else AdminUserDetailSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = AdminUserWriteSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user = self.get_queryset().get(pk=user.pk)
        return Response(AdminUserDetailSerializer(user).data)

    def get_queryset(self):
        return (
            get_user_model()
            .objects.select_related("profile")
            .prefetch_related(
                "profile__allergies",
                "profile__dietary_restrictions",
                "disliked_foods",
                "supplements__supplement",
                "recommendation_runs__items__food",
                "recommendation_feedback__recommendation_item__food",
                "recommendation_feedback__recommendation_item__run",
            )
            .annotate(
                supplement_count=Count("supplements", distinct=True),
                recommendation_count=Count("recommendation_runs", distinct=True),
                feedback_count=Count("recommendation_feedback", distinct=True),
            )
        )
