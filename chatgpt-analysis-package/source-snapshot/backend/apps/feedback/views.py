from django.db.models import Q
from rest_framework import mixins, permissions, viewsets

from apps.common.pagination import AdminPageNumberPagination

from .models import RecommendationFeedback
from .serializers import RecommendationFeedbackSerializer


class RecommendationFeedbackViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = RecommendationFeedbackSerializer
    pagination_class = AdminPageNumberPagination

    def get_permissions(self):
        if self.action == "list":
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        queryset = RecommendationFeedback.objects.select_related("user", "recommendation_item__food", "recommendation_item__run")
        if self.request.user.is_staff:
            search = self.request.query_params.get("search")
            helpful = self.request.query_params.get("is_helpful")
            rating = self.request.query_params.get("rating")
            if search:
                queryset = queryset.filter(
                    Q(user__email__icontains=search)
                    | Q(comment__icontains=search)
                    | Q(recommendation_item__food__name__icontains=search)
                    | Q(recommendation_item__food__slug__icontains=search)
                )
            if helpful in {"true", "false"}:
                queryset = queryset.filter(is_helpful=helpful == "true")
            if rating:
                queryset = queryset.filter(rating=rating)
            return queryset.order_by("-created_at")
        return queryset.filter(user=self.request.user)
