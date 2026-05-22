from django.db.models import Q
from rest_framework import permissions, viewsets

from apps.common.pagination import AdminPageNumberPagination

from .models import Supplement, UserSupplement
from .serializers import SupplementSerializer, UserSupplementSerializer


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS or bool(request.user and request.user.is_staff)


class SupplementViewSet(viewsets.ModelViewSet):
    serializer_class = SupplementSerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = "slug"
    pagination_class = AdminPageNumberPagination

    def get_queryset(self):
        queryset = Supplement.objects.prefetch_related("nutrients__nutrient")
        if not bool(self.request.user and self.request.user.is_staff):
            queryset = queryset.filter(is_active=True)

        search = self.request.query_params.get("search")
        is_active = self.request.query_params.get("is_active")
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(slug__icontains=search) | Q(description__icontains=search))
        if is_active in {"true", "false"} and bool(self.request.user and self.request.user.is_staff):
            queryset = queryset.filter(is_active=is_active == "true")
        return queryset


class UserSupplementViewSet(viewsets.ModelViewSet):
    queryset = UserSupplement.objects.all()
    serializer_class = UserSupplementSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_value_regex = r"\d+"

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return UserSupplement.objects.none()
        return UserSupplement.objects.filter(user=self.request.user).select_related("supplement").prefetch_related(
            "supplement__nutrients__nutrient"
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
