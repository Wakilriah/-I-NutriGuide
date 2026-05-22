from django.conf import settings
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.recommendations.serializers import RecommendationRunSerializer

from .models import ChatMessage, ChatSession
from .services import serialize_recommendation_run


class ChatMessageSerializer(serializers.ModelSerializer):
    recommendation_run_id = serializers.UUIDField(source="recommendation_run.id", read_only=True)

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "role",
            "content",
            "metadata",
            "recommendation_run_id",
            "groq_model",
            "token_usage",
            "error_code",
            "created_at",
        ]


class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatSession
        fields = ["id", "title", "created_at", "updated_at", "messages"]


class AdminChatSessionSerializer(ChatSessionSerializer):
    user = serializers.SerializerMethodField()

    class Meta(ChatSessionSerializer.Meta):
        fields = ["id", "user", "title", "created_at", "updated_at", "messages"]

    def get_user(self, obj):
        return {"id": obj.user.id, "email": obj.user.email, "name": obj.user.name}


class AdminChatUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    name = serializers.CharField()
    chat_session_count = serializers.IntegerField()
    chat_message_count = serializers.IntegerField()
    latest_chat_at = serializers.DateTimeField(allow_null=True)


class SendChatMessageSerializer(serializers.Serializer):
    session_id = serializers.UUIDField(required=False)
    message = serializers.CharField(max_length=settings.CHAT_MAX_INPUT_CHARS, trim_whitespace=True)


class ChatMessageResponseSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    user_message = ChatMessageSerializer()
    assistant_message = ChatMessageSerializer()
    recommendation_run = serializers.SerializerMethodField()
    cited_items = serializers.ListField(child=serializers.DictField())

    @extend_schema_field(RecommendationRunSerializer(allow_null=True))
    def get_recommendation_run(self, obj):
        return serialize_recommendation_run(obj.get("recommendation_run"))
