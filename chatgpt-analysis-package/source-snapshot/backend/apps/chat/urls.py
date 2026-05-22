from django.urls import path

from .views import AdminChatSessionListView, AdminChatUserClearView, AdminChatUserListView, ChatSessionClearView, ChatSessionListView, SendChatMessageView


urlpatterns = [
    path("chat/sessions/", ChatSessionListView.as_view(), name="chat-session-list"),
    path("chat/sessions/clear/", ChatSessionClearView.as_view(), name="chat-session-clear"),
    path("chat/messages/", SendChatMessageView.as_view(), name="chat-message-create"),
    path("admin/chats/users/", AdminChatUserListView.as_view(), name="admin-chat-user-list"),
    path("admin/chats/users/<int:user_id>/clear/", AdminChatUserClearView.as_view(), name="admin-chat-user-clear"),
    path("admin/chats/", AdminChatSessionListView.as_view(), name="admin-chat-session-list"),
]
