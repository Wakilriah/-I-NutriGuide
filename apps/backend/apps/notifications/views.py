from django.conf import settings
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DevicePushToken, NotificationCampaign, NotificationLog, NotificationPreference
from .serializers import (
    DevicePushTokenSerializer,
    NotificationCampaignSerializer,
    NotificationLogSerializer,
    NotificationPreferenceSerializer,
)
from .tasks import notification_campaign_recipients, send_notification_campaign


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


class NotificationUnreadCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = NotificationLog.objects.filter(user=request.user, read_at__isnull=True).count()
        return Response({"count": count})


class MarkNotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, notification_id):
        updated = NotificationLog.objects.filter(
            id=notification_id,
            user=request.user,
            read_at__isnull=True,
        ).update(read_at=timezone.now())
        return Response({"updated": updated})


class MarkAllNotificationsReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        updated = NotificationLog.objects.filter(user=request.user, read_at__isnull=True).update(read_at=timezone.now())
        return Response({"updated": updated})


class WebPushConfigView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({"public_key": settings.WEB_PUSH_VAPID_PUBLIC_KEY})


class DeactivatePushTokenView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, token_id):
        DevicePushToken.objects.filter(id=token_id, user=request.user).update(active=False)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminNotificationCampaignListCreateView(generics.ListCreateAPIView):
    serializer_class = NotificationCampaignSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = NotificationCampaign.objects.select_related("created_by")

    def perform_create(self, serializer):
        campaign = serializer.save(created_by=self.request.user)
        campaign.recipient_count = notification_campaign_recipients(campaign).count()
        campaign.save(update_fields=["recipient_count"])
        send_notification_campaign.delay(campaign.id)


class AdminNotificationAudienceCountView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        serializer = NotificationCampaignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        campaign = NotificationCampaign(**serializer.validated_data)
        return Response({"count": notification_campaign_recipients(campaign).count()})
