from django.db.models import Count, Q
from rest_framework import permissions, viewsets

from apps.common.pagination import AdminPageNumberPagination

from .models import (
    AssociationRule,
    AssociationTransaction,
    FoodSupplementSynergyRule,
    MinedAssociationRule,
    SafetyConstraint,
    SupplementCategory,
    SupplementNormalization,
)
from .serializers import (
    AssociationRuleSerializer,
    AssociationTransactionSerializer,
    FoodSupplementSynergyRuleSerializer,
    MinedAssociationRuleSerializer,
    SafetyConstraintSerializer,
    SupplementCategorySerializer,
    SupplementNormalizationSerializer,
)


class AssociationRuleViewSet(viewsets.ModelViewSet):
    serializer_class = AssociationRuleSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = AdminPageNumberPagination

    def get_queryset(self):
        queryset = AssociationRule.objects.all()
        search = self.request.query_params.get("search")
        is_active = self.request.query_params.get("is_active")
        entity_type = self.request.query_params.get("entity_type")
        if search:
            queryset = queryset.filter(
                Q(antecedent_slug__icontains=search)
                | Q(consequent_slug__icontains=search)
                | Q(explanation__icontains=search)
            )
        if is_active in {"true", "false"}:
            queryset = queryset.filter(is_active=is_active == "true")
        if entity_type:
            queryset = queryset.filter(Q(antecedent_type=entity_type) | Q(consequent_type=entity_type))
        return queryset


class SupplementCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = SupplementCategorySerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = AdminPageNumberPagination

    def get_queryset(self):
        queryset = SupplementCategory.objects.all()
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(category__icontains=search)
                | Q(canonical_item__icontains=search)
                | Q(main_nutrient__icontains=search)
            )
        return queryset


class SupplementNormalizationViewSet(viewsets.ModelViewSet):
    serializer_class = SupplementNormalizationSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = AdminPageNumberPagination

    def get_queryset(self):
        queryset = SupplementNormalization.objects.select_related("category")
        search = self.request.query_params.get("search")
        category = self.request.query_params.get("category")
        if search:
            queryset = queryset.filter(
                Q(original_supplement_name__icontains=search)
                | Q(normalized_category__icontains=search)
                | Q(primary_keyword__icontains=search)
            )
        if category:
            queryset = queryset.filter(normalized_category__icontains=category)
        return queryset


class FoodSupplementSynergyRuleViewSet(viewsets.ModelViewSet):
    serializer_class = FoodSupplementSynergyRuleSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = AdminPageNumberPagination

    def get_queryset(self):
        queryset = FoodSupplementSynergyRule.objects.select_related("supplement_category")
        search = self.request.query_params.get("search")
        supplement = self.request.query_params.get("supplement")
        food = self.request.query_params.get("food")
        association_type = self.request.query_params.get("association_type")
        is_active = self.request.query_params.get("is_active")
        if search:
            queryset = queryset.filter(
                Q(supplement_category_name__icontains=search)
                | Q(supplement_item__icontains=search)
                | Q(food__icontains=search)
                | Q(food_item__icontains=search)
                | Q(reason__icontains=search)
            )
        if supplement:
            queryset = queryset.filter(Q(supplement_category_name__icontains=supplement) | Q(supplement_item__icontains=supplement))
        if food:
            queryset = queryset.filter(Q(food__icontains=food) | Q(food_item__icontains=food))
        if association_type:
            queryset = queryset.filter(association_type=association_type)
        if is_active in {"true", "false"}:
            queryset = queryset.filter(is_active=is_active == "true")
        return queryset


class SafetyConstraintViewSet(viewsets.ModelViewSet):
    serializer_class = SafetyConstraintSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = AdminPageNumberPagination

    def get_queryset(self):
        queryset = SafetyConstraint.objects.select_related("supplement_category")
        search = self.request.query_params.get("search")
        supplement = self.request.query_params.get("supplement")
        constraint_type = self.request.query_params.get("constraint_type")
        is_active = self.request.query_params.get("is_active")
        if search:
            queryset = queryset.filter(
                Q(supplement_category_name__icontains=search)
                | Q(avoid_or_review_item__icontains=search)
                | Q(reason__icontains=search)
            )
        if supplement:
            queryset = queryset.filter(supplement_category_name__icontains=supplement)
        if constraint_type:
            queryset = queryset.filter(constraint_type=constraint_type)
        if is_active in {"true", "false"}:
            queryset = queryset.filter(is_active=is_active == "true")
        return queryset


class MinedAssociationRuleViewSet(viewsets.ModelViewSet):
    serializer_class = MinedAssociationRuleSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = AdminPageNumberPagination

    def get_queryset(self):
        queryset = MinedAssociationRule.objects.all()
        search = self.request.query_params.get("search")
        rule_type = self.request.query_params.get("rule_type")
        min_confidence = self.request.query_params.get("min_confidence")
        min_lift = self.request.query_params.get("min_lift")
        is_active = self.request.query_params.get("is_active")
        if search:
            queryset = queryset.filter(
                Q(antecedent_items__icontains=search)
                | Q(consequent_items__icontains=search)
                | Q(explanation__icontains=search)
            )
        if rule_type:
            queryset = queryset.filter(rule_type=rule_type)
        if min_confidence:
            queryset = queryset.filter(confidence__gte=min_confidence)
        if min_lift:
            queryset = queryset.filter(lift__gte=min_lift)
        if is_active in {"true", "false"}:
            queryset = queryset.filter(is_active=is_active == "true")
        return queryset


class AssociationTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AssociationTransactionSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = AdminPageNumberPagination

    def get_queryset(self):
        queryset = AssociationTransaction.objects.annotate(item_count=Count("items")).prefetch_related("items")
        search = self.request.query_params.get("search")
        item = self.request.query_params.get("item")
        item_type = self.request.query_params.get("item_type")
        if search:
            queryset = queryset.filter(Q(transaction_id__icontains=search) | Q(items__item__icontains=search)).distinct()
        if item:
            queryset = queryset.filter(items__item__icontains=item).distinct()
        if item_type:
            queryset = queryset.filter(items__item_type=item_type).distinct()
        return queryset
