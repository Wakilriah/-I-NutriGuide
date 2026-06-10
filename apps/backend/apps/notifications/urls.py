from django.urls import path

from .views import (
    DeactivatePushTokenView,
    MarkAllNotificationsReadView,
    MarkNotificationReadView,
    NotificationLogListView,
    NotificationPreferenceView,
    NotificationUnreadCountView,
    RegisterPushTokenView,
    WebPushConfigView,
)

urlpatterns = [
    path("notifications/", NotificationLogListView.as_view(), name="notification-history"),
    path("notifications/unread-count/", NotificationUnreadCountView.as_view(), name="notification-unread-count"),
    path("notifications/read-all/", MarkAllNotificationsReadView.as_view(), name="notification-read-all"),
    path("notifications/<int:notification_id>/read/", MarkNotificationReadView.as_view(), name="notification-read"),
    path("notifications/preferences/", NotificationPreferenceView.as_view(), name="notification-preferences"),
    path("notifications/register-token/", RegisterPushTokenView.as_view(), name="notification-register-token"),
    path("notifications/web-config/", WebPushConfigView.as_view(), name="notification-web-config"),
    path("notifications/tokens/<int:token_id>/", DeactivatePushTokenView.as_view(), name="notification-token-delete"),
]
