from django.urls import path

from .views import DeactivatePushTokenView, NotificationLogListView, NotificationPreferenceView, RegisterPushTokenView

urlpatterns = [
    path("notifications/", NotificationLogListView.as_view(), name="notification-history"),
    path("notifications/preferences/", NotificationPreferenceView.as_view(), name="notification-preferences"),
    path("notifications/register-token/", RegisterPushTokenView.as_view(), name="notification-register-token"),
    path("notifications/tokens/<int:token_id>/", DeactivatePushTokenView.as_view(), name="notification-token-delete"),
]
