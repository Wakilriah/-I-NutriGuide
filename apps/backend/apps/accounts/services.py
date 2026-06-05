import logging
import secrets
from datetime import timedelta

import requests
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone

logger = logging.getLogger(__name__)


class EmailDeliveryError(Exception):
    pass


def issue_email_verification_code(user):
    code = _new_code()
    now = timezone.now()
    user.email_verification_code_hash = make_password(code)
    user.email_verification_expires_at = now + timedelta(minutes=settings.EMAIL_VERIFICATION_CODE_TTL_MINUTES)
    user.email_verification_sent_at = now
    user.save(
        update_fields=[
            "email_verification_code_hash",
            "email_verification_expires_at",
            "email_verification_sent_at",
        ]
    )
    send_email_verification(user, code)
    return code


def issue_password_reset_code(user):
    code = _new_code()
    now = timezone.now()
    user.password_reset_code_hash = make_password(code)
    user.password_reset_expires_at = now + timedelta(minutes=settings.PASSWORD_RESET_CODE_TTL_MINUTES)
    user.password_reset_sent_at = now
    user.save(
        update_fields=[
            "password_reset_code_hash",
            "password_reset_expires_at",
            "password_reset_sent_at",
        ]
    )
    send_password_reset(user, code)
    return code


def can_resend_email_verification(user):
    if user.is_email_verified or not user.email_verification_sent_at:
        return True
    cooldown = timedelta(seconds=settings.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS)
    return timezone.now() >= user.email_verification_sent_at + cooldown


def can_send_password_reset(user):
    if not user.password_reset_sent_at:
        return True
    cooldown = timedelta(seconds=settings.PASSWORD_RESET_RESEND_COOLDOWN_SECONDS)
    return timezone.now() >= user.password_reset_sent_at + cooldown


def verify_email_code(user, code):
    if user.is_email_verified:
        return True
    if not user.email_verification_code_hash or not user.email_verification_expires_at:
        return False
    if timezone.now() > user.email_verification_expires_at:
        return False
    if not check_password(code.strip(), user.email_verification_code_hash):
        return False

    user.is_email_verified = True
    user.email_verification_code_hash = ""
    user.email_verification_expires_at = None
    user.email_verification_sent_at = None
    user.save(
        update_fields=[
            "is_email_verified",
            "email_verification_code_hash",
            "email_verification_expires_at",
            "email_verification_sent_at",
        ]
    )
    return True


def reset_password_with_code(user, code, password):
    if not user.password_reset_code_hash or not user.password_reset_expires_at:
        return False
    if timezone.now() > user.password_reset_expires_at:
        return False
    if not check_password(code.strip(), user.password_reset_code_hash):
        return False

    user.set_password(password)
    user.is_email_verified = True
    user.password_reset_code_hash = ""
    user.password_reset_expires_at = None
    user.password_reset_sent_at = None
    user.save(
        update_fields=[
            "password",
            "is_email_verified",
            "password_reset_code_hash",
            "password_reset_expires_at",
            "password_reset_sent_at",
        ]
    )
    return True


def send_email_verification(user, code):
    subject = "Verify your I-NutriGuide email"
    text = (
        f"Hi {user.name},\n\n"
        f"Your I-NutriGuide verification code is {code}.\n"
        f"It expires in {settings.EMAIL_VERIFICATION_CODE_TTL_MINUTES} minutes."
    )
    html = (
        f"<p>Hi {user.name},</p>"
        f"<p>Your I-NutriGuide verification code is:</p>"
        f"<p style=\"font-size:28px;font-weight:700;letter-spacing:4px\">{code}</p>"
        f"<p>This code expires in {settings.EMAIL_VERIFICATION_CODE_TTL_MINUTES} minutes.</p>"
    )
    if settings.EMAIL_VERIFICATION_URL:
        verify_url = f"{settings.EMAIL_VERIFICATION_URL}?email={user.email}&code={code}"
        text = f"{text}\n\nOpen this link to verify: {verify_url}"
        html = f'{html}<p><a href="{verify_url}">Verify email</a></p>'

    send_email(user.email, subject, text, html, fallback_log_message="Email verification code for %s: %s", fallback_log_args=(user.email, code))


def send_password_reset(user, code):
    subject = "Reset your I-NutriGuide password"
    text = (
        f"Hi {user.name},\n\n"
        f"Your I-NutriGuide password reset code is {code}.\n"
        f"It expires in {settings.PASSWORD_RESET_CODE_TTL_MINUTES} minutes.\n\n"
        "If you did not request this, you can ignore this email."
    )
    html = (
        f"<p>Hi {user.name},</p>"
        f"<p>Your I-NutriGuide password reset code is:</p>"
        f"<p style=\"font-size:28px;font-weight:700;letter-spacing:4px\">{code}</p>"
        f"<p>This code expires in {settings.PASSWORD_RESET_CODE_TTL_MINUTES} minutes.</p>"
        "<p>If you did not request this, you can ignore this email.</p>"
    )
    if settings.PASSWORD_RESET_URL:
        reset_url = f"{settings.PASSWORD_RESET_URL}?email={user.email}&code={code}"
        text = f"{text}\n\nOpen this link to reset your password: {reset_url}"
        html = f'{html}<p><a href="{reset_url}">Reset password</a></p>'

    send_email(user.email, subject, text, html, fallback_log_message="Password reset code for %s: %s", fallback_log_args=(user.email, code))


def send_email(to_email, subject, text, html, fallback_log_message, fallback_log_args):
    if not settings.RESEND_API_KEY:
        logger.warning(fallback_log_message, *fallback_log_args)
        return

    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.RESEND_FROM_EMAIL,
                "to": [to_email],
                "subject": subject,
                "text": text,
                "html": html,
            },
            timeout=10,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        detail = getattr(exc.response, "text", "") if getattr(exc, "response", None) is not None else ""
        raise EmailDeliveryError(f"Could not send email with Resend. {detail}".strip()) from exc


def _new_code():
    return f"{secrets.randbelow(1_000_000):06d}"
