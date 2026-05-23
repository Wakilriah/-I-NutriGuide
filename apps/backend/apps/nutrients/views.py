from django.db.models import Q
from rest_framework import permissions, response, views, viewsets

from apps.common.pagination import AdminPageNumberPagination

from .models import Nutrient, NutrientInteraction
from .serializers import NutrientInteractionSerializer, NutrientSerializer


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


class NutrientInteractionViewSet(viewsets.ModelViewSet):
    serializer_class = NutrientInteractionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = AdminPageNumberPagination

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticatedOrReadOnly()]

    def get_queryset(self):
        queryset = NutrientInteraction.objects.all()
        if not self.request.user.is_staff:
            queryset = queryset.filter(active=True)
        interaction_type = self.request.query_params.get("interaction_type")
        severity = self.request.query_params.get("severity")
        active = self.request.query_params.get("active")
        search = self.request.query_params.get("search")
        if interaction_type:
            queryset = queryset.filter(interaction_type=interaction_type)
        if severity:
            queryset = queryset.filter(severity=severity)
        if active in {"true", "false"}:
            queryset = queryset.filter(active=active == "true")
        if search:
            queryset = queryset.filter(Q(source_key__icontains=search) | Q(target_key__icontains=search) | Q(mechanism__icontains=search))
        return queryset


class NutrientInteractionGraphView(views.APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        queryset = NutrientInteraction.objects.filter(active=True)
        nodes = {}
        edges = []
        for item in queryset:
            source_id = item.source_key
            target_id = item.target_key
            nodes[source_id] = {"id": source_id, "label": _label_from_key(source_id), "type": item.source_type}
            nodes[target_id] = {"id": target_id, "label": _label_from_key(target_id), "type": item.target_type}
            edges.append(
                {
                    "source": source_id,
                    "target": target_id,
                    "interaction_type": item.interaction_type,
                    "severity": item.severity,
                    "label": _edge_label(item),
                }
            )
        return response.Response({"nodes": list(nodes.values()), "edges": edges})


def _label_from_key(value):
    return str(value).replace("_", " ").replace("-", " ").title()


def _edge_label(item):
    if item.interaction_type == NutrientInteraction.InteractionType.ENHANCES:
        return "enhances absorption"
    if item.interaction_type == NutrientInteraction.InteractionType.INHIBITS:
        return "may inhibit"
    if item.interaction_type == NutrientInteraction.InteractionType.SHOULD_NOT_COMBINE:
        return "should not combine"
    if item.interaction_type == NutrientInteraction.InteractionType.COMPETES_WITH:
        return "may compete"
    return item.interaction_type.replace("_", " ")
