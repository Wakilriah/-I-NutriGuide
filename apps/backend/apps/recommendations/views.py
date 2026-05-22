from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import RecommendationRun, SavedRecommendationItem
from .serializers import (
    AdminRecommendationRunSerializer,
    GenerateRecommendationSerializer,
    HybridPreviewSerializer,
    HybridRecommendationQuerySerializer,
    RecommendationRunSerializer,
    SavedRecommendationItemSerializer,
)
from .services.cache import get_cached_recommendations, set_cached_recommendations
from .services.engine import generate_recommendations, get_food_recommendations_payload, get_recommendation_cache_key
from .services.enrichment import enrich_scored_recommendation, to_api_result
from .services.hybrid import HybridRecommender
from .services.training import build_preview_profile
from apps.common.pagination import AdminPageNumberPagination
from apps.foods.models import Food


class GenerateRecommendationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=GenerateRecommendationSerializer, responses={200: RecommendationRunSerializer, 201: RecommendationRunSerializer})
    def post(self, request):
        serializer = GenerateRecommendationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        limit = serializer.validated_data["limit"]
        cache_key = get_recommendation_cache_key(request.user, limit)
        cached_payload = get_cached_recommendations(cache_key)
        if cached_payload is not None:
            return Response(cached_payload, status=status.HTTP_200_OK)

        run = generate_recommendations(request.user, limit=limit)
        payload = RecommendationRunSerializer(run).data
        set_cached_recommendations(cache_key, payload)
        return Response(payload, status=status.HTTP_201_CREATED)


class FoodRecommendationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = HybridRecommendationQuerySerializer

    @extend_schema(
        parameters=[
            OpenApiParameter(name="n", type=int, location=OpenApiParameter.QUERY, required=False),
        ],
        responses=dict,
    )
    def get(self, request):
        serializer = HybridRecommendationQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        limit = serializer.validated_data["n"]
        cache_key = f"{get_recommendation_cache_key(request.user, limit)}:foods"
        cached_payload = get_cached_recommendations(cache_key)
        if cached_payload is not None:
            return Response(cached_payload)
        payload = get_food_recommendations_payload(request.user, limit=limit)
        set_cached_recommendations(cache_key, payload)
        return Response(payload)


class RecommendationPreviewView(APIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = HybridPreviewSerializer

    @extend_schema(request=HybridPreviewSerializer, responses=dict)
    def post(self, request):
        serializer = HybridPreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = build_preview_profile(serializer.validated_data)
        payload = HybridRecommender().recommend(profile, n=serializer.validated_data["n"])
        results = []
        for scored in payload["recommendations"]:
            food = Food.objects.select_related("category").prefetch_related("nutrients__nutrient").get(id=scored["food_id"])
            enriched = enrich_scored_recommendation(scored, food=food, user_profile=profile)
            if enriched is not None:
                results.append(to_api_result(enriched, food))
        return Response({**payload, "results": results, "recommendations": results})


class RecommendationHistoryView(generics.ListAPIView):
    serializer_class = RecommendationRunSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            RecommendationRun.objects.filter(user=self.request.user)
            .prefetch_related("items__food__category", "items__food__nutrients__nutrient", "items__supplement", "items__feedback")
            .order_by("-created_at")
        )


class RecommendationHistoryDetailView(generics.RetrieveAPIView):
    serializer_class = RecommendationRunSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "id"
    lookup_url_kwarg = "run_id"

    def get_queryset(self):
        return RecommendationRun.objects.filter(user=self.request.user).prefetch_related(
            "items__food__category",
            "items__food__nutrients__nutrient",
            "items__supplement",
            "items__feedback",
        )


class SavedRecommendationItemListCreateView(generics.ListCreateAPIView):
    serializer_class = SavedRecommendationItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            SavedRecommendationItem.objects.filter(user=self.request.user)
            .select_related("recommendation_item__food__category", "recommendation_item__supplement")
            .prefetch_related("recommendation_item__food__nutrients__nutrient", "recommendation_item__feedback")
            .order_by("-created_at")
        )


class SavedRecommendationItemDestroyView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SavedRecommendationItem.objects.filter(user=self.request.user)


class AdminRecommendationRunListView(generics.ListAPIView):
    serializer_class = AdminRecommendationRunSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = AdminPageNumberPagination

    def get_queryset(self):
        queryset = (
            RecommendationRun.objects.select_related("user")
            .prefetch_related("items__food__category", "items__food__nutrients__nutrient", "items__supplement", "items__feedback")
            .order_by("-created_at")
        )
        email = self.request.query_params.get("email")
        search = self.request.query_params.get("search") or email
        user_id = self.request.query_params.get("user_id")
        supplement = self.request.query_params.get("supplement")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if search:
            queryset = queryset.filter(user__email__icontains=search)
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if supplement:
            queryset = queryset.filter(items__supplement__slug__icontains=supplement).distinct()
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        return queryset


class AdminRecommendationRunDetailView(generics.RetrieveAPIView):
    serializer_class = AdminRecommendationRunSerializer
    permission_classes = [permissions.IsAdminUser]
    lookup_field = "id"
    lookup_url_kwarg = "run_id"

    def get_queryset(self):
        return RecommendationRun.objects.select_related("user").prefetch_related(
            "items__food__category",
            "items__food__nutrients__nutrient",
            "items__supplement",
            "items__feedback",
        )
