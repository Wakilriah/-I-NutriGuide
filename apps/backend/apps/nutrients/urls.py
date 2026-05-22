from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import NutrientInteractionGraphView, NutrientInteractionViewSet, NutrientViewSet


router = DefaultRouter()
router.register("admin/nutrients", NutrientViewSet, basename="admin-nutrient")
router.register("nutrition/interactions", NutrientInteractionViewSet, basename="nutrition-interaction")

urlpatterns = [
    path("nutrition/interactions/graph/", NutrientInteractionGraphView.as_view(), name="nutrition-interaction-graph"),
    path("", include(router.urls)),
]
