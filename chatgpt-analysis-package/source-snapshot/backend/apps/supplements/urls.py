from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import SupplementViewSet, UserSupplementViewSet


router = DefaultRouter()
router.register("supplements", SupplementViewSet, basename="supplement")
router.register("user-supplements", UserSupplementViewSet, basename="user-supplement")

urlpatterns = [
    path("", include(router.urls)),
]

