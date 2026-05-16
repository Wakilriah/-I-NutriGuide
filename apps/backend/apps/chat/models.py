import uuid

from django.conf import settings
from django.db import models


class ChatSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="chat_sessions", on_delete=models.CASCADE)
    title = models.CharField(max_length=120)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["user", "updated_at"], name="chat_sess_user_id_9f9d7e_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.user.email}: {self.title}"


class ChatMessage(models.Model):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"

    session = models.ForeignKey(ChatSession, related_name="messages", on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=Role.choices)
    content = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    recommendation_run = models.ForeignKey(
        "recommendations.RecommendationRun",
        related_name="chat_messages",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    groq_model = models.CharField(max_length=120, blank=True)
    token_usage = models.JSONField(default=dict, blank=True)
    error_code = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["session", "created_at"], name="chat_msg_session_66887f_idx"),
            models.Index(fields=["recommendation_run"], name="chat_msg_reco_run_4a59dc_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.role} message in {self.session_id}"

