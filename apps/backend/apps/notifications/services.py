import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.utils import timezone
from pywebpush import WebPushException, webpush

from .models import DevicePushToken, NotificationLog


EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_push_notification(user, *, notification_type: str, title: str, body: str, data: dict | None = None):
    tokens = list(DevicePushToken.objects.filter(user=user, active=True))
    log = NotificationLog.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        body=body,
        provider_response={"data": data or {}},
    )
    payload_data = {**(data or {}), "notification_id": log.id}
    unread_count = NotificationLog.objects.filter(user=user, read_at__isnull=True).count()
    if not tokens:
        log.status = NotificationLog.Status.SKIPPED
        log.provider_response = {"reason": "no_active_tokens", "data": payload_data}
        log.save(update_fields=["status", "provider_response"])
        return log

    expo_tokens = [token for token in tokens if token.platform != DevicePushToken.Platform.WEB]
    web_tokens = [token for token in tokens if token.platform == DevicePushToken.Platform.WEB]
    expo_payload, expo_sent = _send_expo_notifications(
        expo_tokens,
        notification_type=notification_type,
        title=title,
        body=body,
        data=payload_data,
        badge=unread_count,
    )
    web_payload, web_sent = _send_web_notifications(
        web_tokens,
        title=title,
        body=body,
        data=payload_data,
        badge=unread_count,
    )
    sent_count = expo_sent + web_sent
    log.status = NotificationLog.Status.SENT if sent_count else NotificationLog.Status.FAILED
    log.sent_at = timezone.now() if sent_count else None
    log.provider_response = {
        "data": payload_data,
        "expo": expo_payload,
        "web": web_payload,
        "sent_count": sent_count,
    }
    log.save(update_fields=["status", "sent_at", "provider_response"])
    return log


def _send_expo_notifications(tokens, *, notification_type: str, title: str, body: str, data: dict, badge: int):
    if not tokens:
        return None, 0
    messages = [
        {
            "to": token.token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data,
            "badge": badge,
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
        _deactivate_invalid_tokens(messages, payload)
        return payload, max(len(messages) - len(ticket_errors), 0)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        return {"error": str(exc)}, 0


def _send_web_notifications(tokens, *, title: str, body: str, data: dict, badge: int):
    if not tokens:
        return [], 0
    if not settings.WEB_PUSH_VAPID_PRIVATE_KEY:
        return [{"status": "error", "error": "WEB_PUSH_VAPID_PRIVATE_KEY is not configured"}], 0

    payload = json.dumps({"title": title, "body": body, "data": data, "badge": badge})
    results = []
    sent = 0
    for token in tokens:
        try:
            webpush(
                subscription_info=json.loads(token.token),
                data=payload,
                vapid_private_key=settings.WEB_PUSH_VAPID_PRIVATE_KEY,
                vapid_claims={"sub": settings.WEB_PUSH_VAPID_SUBJECT},
            )
            results.append({"status": "ok", "token_id": token.id})
            sent += 1
        except (WebPushException, ValueError, TypeError) as exc:
            status_code = getattr(getattr(exc, "response", None), "status_code", None)
            if status_code in {404, 410}:
                DevicePushToken.objects.filter(id=token.id).update(active=False)
            results.append({"status": "error", "token_id": token.id, "error": str(exc), "status_code": status_code})
    return results, sent


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
