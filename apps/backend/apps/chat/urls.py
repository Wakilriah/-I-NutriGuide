from django.urls import path

from .views import ChatSessionListView, SendChatMessageView


urlpatterns = [
    path("chat/sessions/", ChatSessionListView.as_view(), name="chat-session-list"),
    path("chat/messages/", SendChatMessageView.as_view(), name="chat-message-create"),
]

