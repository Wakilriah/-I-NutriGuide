from django.contrib.auth import get_user_model
from django.db.models import Count, Max, Q
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.pagination import AdminPageNumberPagination

from .models import ChatSession
from .serializers import AdminChatSessionSerializer, AdminChatUserSerializer, ChatMessageResponseSerializer, ChatSessionSerializer, SendChatMessageSerializer
from .services import ChatRateLimited, send_chat_message


class ChatSessionListView(generics.ListAPIView):
    serializer_class = ChatSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ChatSession.objects.filter(user=self.request.user).prefetch_related("messages", "messages__recommendation_run")


class ChatSessionClearView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        deleted_count, _deleted = ChatSession.objects.filter(user=request.user).delete()
        return Response({"deleted": deleted_count}, status=status.HTTP_200_OK)


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


class AdminChatSessionListView(generics.ListAPIView):
    serializer_class = AdminChatSessionSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = AdminPageNumberPagination

    @extend_schema(
        parameters=[
            OpenApiParameter(name="search", type=str, location=OpenApiParameter.QUERY, required=False),
            OpenApiParameter(name="user_id", type=int, location=OpenApiParameter.QUERY, required=False),
        ]
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        queryset = (
            ChatSession.objects.select_related("user")
            .prefetch_related("messages", "messages__recommendation_run")
            .order_by("-updated_at")
        )
        search = self.request.query_params.get("search")
        user_id = self.request.query_params.get("user_id")
        if search:
            queryset = queryset.filter(
                Q(user__email__icontains=search)
                | Q(user__name__icontains=search)
                | Q(title__icontains=search)
                | Q(messages__content__icontains=search)
            ).distinct()
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        return queryset


class AdminChatUserListView(generics.ListAPIView):
    serializer_class = AdminChatUserSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = AdminPageNumberPagination

    def get_queryset(self):
        queryset = (
            get_user_model()
            .objects.filter(chat_sessions__isnull=False)
            .annotate(
                chat_session_count=Count("chat_sessions", distinct=True),
                chat_message_count=Count("chat_sessions__messages", distinct=True),
                latest_chat_at=Max("chat_sessions__updated_at"),
            )
            .order_by("-latest_chat_at", "email")
        )
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search)
                | Q(name__icontains=search)
                | Q(chat_sessions__title__icontains=search)
                | Q(chat_sessions__messages__content__icontains=search)
            ).distinct()
        return queryset


class AdminChatUserClearView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def delete(self, request, user_id):
        deleted_count, _deleted = ChatSession.objects.filter(user_id=user_id).delete()
        return Response({"deleted": deleted_count}, status=status.HTTP_200_OK)
