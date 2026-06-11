from django.urls import path

from .views import (
    AdminNotificationAudienceCountView,
    AdminNotificationCampaignListCreateView,
    DeactivatePushTokenView,
    MarkAllNotificationsReadView,
    MarkNotificationReadView,
    NotificationLogListView,
    NotificationPreferenceView,
    NotificationUnreadCountView,
    PushTokenStatusView,
    RegisterPushTokenView,
    WebPushConfigView,
)

urlpatterns = [
    path("admin/notification-campaigns/", AdminNotificationCampaignListCreateView.as_view(), name="admin-notification-campaign-list"),
    path("admin/notification-campaigns/audience-count/", AdminNotificationAudienceCountView.as_view(), name="admin-notification-audience-count"),
    path("notifications/", NotificationLogListView.as_view(), name="notification-history"),
    path("notifications/unread-count/", NotificationUnreadCountView.as_view(), name="notification-unread-count"),
    path("notifications/read-all/", MarkAllNotificationsReadView.as_view(), name="notification-read-all"),
    path("notifications/<int:notification_id>/read/", MarkNotificationReadView.as_view(), name="notification-read"),
    path("notifications/preferences/", NotificationPreferenceView.as_view(), name="notification-preferences"),
    path("notifications/register-token/", RegisterPushTokenView.as_view(), name="notification-register-token"),
    path("notifications/push-status/", PushTokenStatusView.as_view(), name="notification-push-status"),
    path("notifications/web-config/", WebPushConfigView.as_view(), name="notification-web-config"),
    path("notifications/tokens/<int:token_id>/", DeactivatePushTokenView.as_view(), name="notification-token-delete"),
]
