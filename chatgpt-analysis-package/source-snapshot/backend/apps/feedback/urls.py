from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import RecommendationFeedbackViewSet


router = DefaultRouter()
router.register("feedback", RecommendationFeedbackViewSet, basename="feedback")

urlpatterns = [
    path("", include(router.urls)),
]

