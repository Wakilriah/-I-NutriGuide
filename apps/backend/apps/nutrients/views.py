from django.db.models import Q
from rest_framework import permissions, viewsets

from apps.common.pagination import AdminPageNumberPagination

from .models import Nutrient
from .serializers import NutrientSerializer


class NutrientViewSet(viewsets.ModelViewSet):
    serializer_class = NutrientSerializer
    permission_classes = [permissions.IsAdminUser]
    lookup_field = "slug"
    pagination_class = AdminPageNumberPagination

    def get_queryset(self):
        queryset = Nutrient.objects.all()
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(slug__icontains=search) | Q(unit__icontains=search))
        return queryset
