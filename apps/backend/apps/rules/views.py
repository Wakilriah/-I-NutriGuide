from django.db.models import Q
from rest_framework import permissions, viewsets

from apps.common.pagination import AdminPageNumberPagination

from .models import AssociationRule
from .serializers import AssociationRuleSerializer


class AssociationRuleViewSet(viewsets.ModelViewSet):
    serializer_class = AssociationRuleSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = AdminPageNumberPagination

    def get_queryset(self):
        queryset = AssociationRule.objects.all()
        search = self.request.query_params.get("search")
        is_active = self.request.query_params.get("is_active")
        entity_type = self.request.query_params.get("entity_type")
        if search:
            queryset = queryset.filter(
                Q(antecedent_slug__icontains=search)
                | Q(consequent_slug__icontains=search)
                | Q(explanation__icontains=search)
            )
        if is_active in {"true", "false"}:
            queryset = queryset.filter(is_active=is_active == "true")
        if entity_type:
            queryset = queryset.filter(Q(antecedent_type=entity_type) | Q(consequent_type=entity_type))
        return queryset
