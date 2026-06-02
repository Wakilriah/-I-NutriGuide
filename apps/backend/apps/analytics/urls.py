from django.urls import path

from .views import DashboardView, DataQualityView, FeedbackAnalyticsView, RecommendationAnalyticsView


urlpatterns = [
    path("admin/dashboard/", DashboardView.as_view(), name="admin-dashboard"),
    path("admin/analytics/recommendations/", RecommendationAnalyticsView.as_view(), name="admin-recommendation-analytics"),
    path("admin/analytics/feedback/", FeedbackAnalyticsView.as_view(), name="admin-feedback-analytics"),
    path("analytics/data-quality/", DataQualityView.as_view(), name="admin-data-quality"),
]
