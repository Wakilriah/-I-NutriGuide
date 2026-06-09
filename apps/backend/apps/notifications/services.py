import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.utils import timezone

from .models import DevicePushToken, NotificationLog


EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_push_notification(user, *, notification_type: str, title: str, body: str, data: dict | None = None):
    tokens = list(DevicePushToken.objects.filter(user=user, active=True).values_list("token", flat=True))
    log = NotificationLog.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        body=body,
        provider_response={"data": data or {}},
    )
    if not tokens:
        log.status = NotificationLog.Status.SKIPPED
        log.provider_response = {"reason": "no_active_tokens", "data": data or {}}
        log.save(update_fields=["status", "provider_response"])
        return log

    messages = [
        {
            "to": token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {},
            "channelId": _channel_id(notification_type),
        }
        for token in tokens
    ]
    request = Request(
        EXPO_PUSH_URL,
        data=json.dumps(messages).encode("utf-8"),
        headers=_expo_headers(),
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
        ticket_errors = _ticket_errors(payload)
        log.status = NotificationLog.Status.FAILED if ticket_errors else NotificationLog.Status.SENT
        log.sent_at = timezone.now() if not ticket_errors else None
        log.provider_response = {"expo": payload, "data": data or {}}
        _deactivate_invalid_tokens(messages, payload)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        log.status = NotificationLog.Status.FAILED
        log.provider_response = {"error": str(exc), "data": data or {}}
    log.save(update_fields=["status", "sent_at", "provider_response"])
    return log


def _channel_id(notification_type: str) -> str:
    if notification_type == NotificationLog.NotificationType.RECOMMENDATION_READY:
        return "recommendations"
    if notification_type == NotificationLog.NotificationType.SUPPLEMENT_REMINDER:
        return "supplements"
    return "daily-reminders"


def _ticket_errors(payload: dict) -> list[dict]:
    tickets = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(tickets, list):
        return [{"message": "Invalid Expo push response"}]
    return [ticket for ticket in tickets if not isinstance(ticket, dict) or ticket.get("status") != "ok"]


def _expo_headers():
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    access_token = os.getenv("EXPO_ACCESS_TOKEN", "")
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    return headers


def _deactivate_invalid_tokens(messages: list[dict], payload: dict):
    tickets = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(tickets, list):
        return
    invalid_tokens = []
    for message, ticket in zip(messages, tickets, strict=False):
        details = ticket.get("details") if isinstance(ticket, dict) else None
        if isinstance(details, dict) and details.get("error") == "DeviceNotRegistered":
            invalid_tokens.append(message["to"])
    if invalid_tokens:
        DevicePushToken.objects.filter(token__in=invalid_tokens).update(active=False)
