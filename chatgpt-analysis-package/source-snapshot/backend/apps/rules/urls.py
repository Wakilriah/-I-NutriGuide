from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AssociationRuleViewSet


router = DefaultRouter()
router.register("admin/association-rules", AssociationRuleViewSet, basename="admin-association-rule")

urlpatterns = [
    path("", include(router.urls)),
]

