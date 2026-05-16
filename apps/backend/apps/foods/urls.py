from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FoodCategoryViewSet, FoodViewSet


router = DefaultRouter()
router.register("food-categories", FoodCategoryViewSet, basename="food-category")
router.register("foods", FoodViewSet, basename="food")

urlpatterns = [
    path("", include(router.urls)),
]

