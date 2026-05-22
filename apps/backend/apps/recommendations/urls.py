from django.urls import path

from .views import (
    AdminRecommendationRunListView,
    AdminRecommendationRunDetailView,
    FoodRecommendationView,
    GenerateRecommendationView,
    RecommendationHistoryDetailView,
    RecommendationHistoryView,
    RecommendationPreviewView,
    SavedRecommendationItemDestroyView,
    SavedRecommendationItemListCreateView,
)
from apps.feedback.views import RecommendationFeedbackViewSet


urlpatterns = [
    path("recommendations/foods/", FoodRecommendationView.as_view(), name="recommendation-foods"),
    path("recommendations/preview/", RecommendationPreviewView.as_view(), name="recommendation-preview"),
    path("recommendations/generate/", GenerateRecommendationView.as_view(), name="recommendation-generate"),
    path("recommendations/history/", RecommendationHistoryView.as_view(), name="recommendation-history"),
    path("recommendations/history/<uuid:run_id>/", RecommendationHistoryDetailView.as_view(), name="recommendation-history-detail"),
    path("recommendations/saved-foods/", SavedRecommendationItemListCreateView.as_view(), name="saved-recommendation-list"),
    path("recommendations/saved-foods/<int:pk>/", SavedRecommendationItemDestroyView.as_view(), name="saved-recommendation-detail"),
    path("recommendations/feedback/", RecommendationFeedbackViewSet.as_view({"post": "create"}), name="recommendation-feedback"),
    path("admin/recommendations/", AdminRecommendationRunListView.as_view(), name="admin-recommendation-list"),
    path("admin/recommendations/<uuid:run_id>/", AdminRecommendationRunDetailView.as_view(), name="admin-recommendation-detail"),
]
