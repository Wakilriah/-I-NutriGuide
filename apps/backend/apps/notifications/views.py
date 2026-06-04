from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DevicePushToken, NotificationPreference
from .serializers import DevicePushTokenSerializer, NotificationPreferenceSerializer


class RegisterPushTokenView(generics.CreateAPIView):
    serializer_class = DevicePushTokenSerializer
    permission_classes = [permissions.IsAuthenticated]


class NotificationPreferenceView(generics.RetrieveUpdateAPIView):
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        preference, _created = NotificationPreference.objects.get_or_create(user=self.request.user)
        return preference


class DeactivatePushTokenView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, token_id):
        DevicePushToken.objects.filter(id=token_id, user=request.user).update(active=False)
        return Response(status=status.HTTP_204_NO_CONTENT)
