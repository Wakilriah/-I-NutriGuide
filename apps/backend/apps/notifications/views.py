from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DevicePushToken, NotificationLog, NotificationPreference
from .serializers import DevicePushTokenSerializer, NotificationLogSerializer, NotificationPreferenceSerializer


class RegisterPushTokenView(generics.CreateAPIView):
    serializer_class = DevicePushTokenSerializer
    permission_classes = [permissions.IsAuthenticated]


class NotificationPreferenceView(generics.RetrieveUpdateAPIView):
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        preference, _created = NotificationPreference.objects.get_or_create(user=self.request.user)
        return preference


class NotificationLogListView(generics.ListAPIView):
    serializer_class = NotificationLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return NotificationLog.objects.filter(user=self.request.user).order_by("-created_at")[:50]


class DeactivatePushTokenView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, token_id):
        DevicePushToken.objects.filter(id=token_id, user=request.user).update(active=False)
        return Response(status=status.HTTP_204_NO_CONTENT)
