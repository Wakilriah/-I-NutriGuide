from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChatSession
from .serializers import ChatMessageResponseSerializer, ChatSessionSerializer, SendChatMessageSerializer
from .services import ChatRateLimited, send_chat_message


class ChatSessionListView(generics.ListAPIView):
    serializer_class = ChatSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ChatSession.objects.filter(user=self.request.user).prefetch_related("messages", "messages__recommendation_run")


class SendChatMessageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=SendChatMessageSerializer, responses={201: ChatMessageResponseSerializer})
    def post(self, request):
        serializer = SendChatMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payload = send_chat_message(
                request.user,
                serializer.validated_data["message"],
                session_id=serializer.validated_data.get("session_id"),
            )
        except ChatSession.DoesNotExist:
            return Response({"detail": "Chat session was not found."}, status=status.HTTP_404_NOT_FOUND)
        except ChatRateLimited as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        response = ChatMessageResponseSerializer(
            {
                "session_id": payload["session"].id,
                "user_message": payload["user_message"],
                "assistant_message": payload["assistant_message"],
                "recommendation_run": payload["recommendation_run"],
                "cited_items": payload["cited_items"],
            }
        )
        return Response(response.data, status=status.HTTP_201_CREATED)

