from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AssociationRuleViewSet,
    AssociationTransactionViewSet,
    FoodSupplementSynergyRuleViewSet,
    MinedAssociationRuleViewSet,
    SafetyConstraintViewSet,
    SupplementCategoryViewSet,
    SupplementNormalizationViewSet,
)


router = DefaultRouter()
router.register("admin/association-rules", AssociationRuleViewSet, basename="admin-association-rule")
router.register("admin/association-supplement-categories", SupplementCategoryViewSet, basename="admin-association-supplement-category")
router.register("admin/supplement-normalizations", SupplementNormalizationViewSet, basename="admin-supplement-normalization")
router.register("admin/synergy-seed-rules", FoodSupplementSynergyRuleViewSet, basename="admin-synergy-seed-rule")
router.register("admin/safety-constraints", SafetyConstraintViewSet, basename="admin-safety-constraint")
router.register("admin/mined-association-rules", MinedAssociationRuleViewSet, basename="admin-mined-association-rule")
router.register("admin/association-transactions", AssociationTransactionViewSet, basename="admin-association-transaction")

urlpatterns = [
    path("", include(router.urls)),
]
