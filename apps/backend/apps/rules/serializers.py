from rest_framework import serializers

from .models import AssociationRule


class AssociationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssociationRule
        fields = [
            "id",
            "antecedent_type",
            "antecedent_slug",
            "consequent_type",
            "consequent_slug",
            "support",
            "confidence",
            "lift",
            "explanation",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        for field in ["support", "confidence"]:
            value = attrs.get(field, getattr(self.instance, field, None))
            if value is not None and not 0 <= value <= 1:
                raise serializers.ValidationError({field: "Must be between 0 and 1."})

        lift = attrs.get("lift", getattr(self.instance, "lift", None))
        if lift is not None and lift < 0:
            raise serializers.ValidationError({"lift": "Must be greater than or equal to 0."})
        return attrs

