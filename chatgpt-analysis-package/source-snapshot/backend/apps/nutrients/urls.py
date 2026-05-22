from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import NutrientViewSet


router = DefaultRouter()
router.register("admin/nutrients", NutrientViewSet, basename="admin-nutrient")

urlpatterns = [
    path("", include(router.urls)),
]

