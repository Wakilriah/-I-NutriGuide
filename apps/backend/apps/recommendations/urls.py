from django.urls import path

from .views import (
    AdminRecommendationRunListView,
    AdminRecommendationRunDetailView,
    AdminRecommendationWeightProfileDetailView,
    AdminRecommendationWeightProfileListCreateView,
    FoodRecommendationView,
    GenerateRecommendationView,
    RecommendationExplainView,
    RecommendationHistoryDetailView,
    RecommendationHistoryView,
    RecommendationPreviewView,
    RefreshRecommendationView,
    SavedRecommendationItemDestroyView,
    SavedRecommendationItemListCreateView,
)
from apps.feedback.views import RecommendationFeedbackViewSet


urlpatterns = [
    path("recommendations/", FoodRecommendationView.as_view(), name="recommendation-list"),
    path("recommendations/foods/", FoodRecommendationView.as_view(), name="recommendation-foods"),
    path("recommendations/preview/", RecommendationPreviewView.as_view(), name="recommendation-preview"),
    path("recommendations/generate/", GenerateRecommendationView.as_view(), name="recommendation-generate"),
    path("recommendations/refresh/", RefreshRecommendationView.as_view(), name="recommendation-refresh"),
    path("recommendations/explain/<int:item_id>/", RecommendationExplainView.as_view(), name="recommendation-explain"),
    path("recommendations/history/", RecommendationHistoryView.as_view(), name="recommendation-history"),
    path("recommendations/history/<uuid:run_id>/", RecommendationHistoryDetailView.as_view(), name="recommendation-history-detail"),
    path("recommendations/saved-foods/", SavedRecommendationItemListCreateView.as_view(), name="saved-recommendation-list"),
    path("recommendations/saved-foods/<int:pk>/", SavedRecommendationItemDestroyView.as_view(), name="saved-recommendation-detail"),
    path("recommendations/feedback/", RecommendationFeedbackViewSet.as_view({"post": "create"}), name="recommendation-feedback"),
    path("admin/recommendations/", AdminRecommendationRunListView.as_view(), name="admin-recommendation-list"),
    path("admin/recommendations/<uuid:run_id>/", AdminRecommendationRunDetailView.as_view(), name="admin-recommendation-detail"),
    path("admin/recommendation-weights/", AdminRecommendationWeightProfileListCreateView.as_view(), name="admin-recommendation-weight-list"),
    path("admin/recommendation-weights/<int:pk>/", AdminRecommendationWeightProfileDetailView.as_view(), name="admin-recommendation-weight-detail"),
]
