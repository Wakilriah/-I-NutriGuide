from django.db.models import Q
from rest_framework import pagination, permissions, viewsets

from .models import Food, FoodCategory
from .serializers import FoodCategorySerializer, FoodSerializer


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS or bool(request.user and request.user.is_staff)


class FoodCategoryViewSet(viewsets.ModelViewSet):
    queryset = FoodCategory.objects.all()
    serializer_class = FoodCategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = "slug"


class FoodPagination(pagination.PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


class FoodViewSet(viewsets.ModelViewSet):
    serializer_class = FoodSerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = "slug"
    pagination_class = FoodPagination

    def get_queryset(self):
        queryset = Food.objects.select_related("category").prefetch_related("nutrients__nutrient")
        if not bool(self.request.user and self.request.user.is_staff):
            queryset = queryset.filter(is_active=True)

        search = self.request.query_params.get("search")
        category = self.request.query_params.get("category")
        source = self.request.query_params.get("source")
        is_active = self.request.query_params.get("is_active")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(slug__icontains=search)
                | Q(description__icontains=search)
                | Q(category__name__icontains=search)
                | Q(category__slug__icontains=search)
                | Q(source__icontains=search)
                | Q(ciqual_code__icontains=search)
            )
        if category:
            queryset = queryset.filter(category__slug=category)
        if source:
            if source == "manual":
                queryset = queryset.filter(Q(source="") | Q(source__isnull=True))
            else:
                queryset = queryset.filter(source__iexact=source)
        if is_active in {"true", "false"} and bool(self.request.user and self.request.user.is_staff):
            queryset = queryset.filter(is_active=is_active == "true")
        return queryset
