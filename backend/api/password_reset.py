# backend/api/password_reset.py
"""
Forgot / reset password support for api/views.py.

A reset link carries `uid` (URL-safe base64 of the user id) and a random
`token`. Only an HMAC of the token is stored on the user, it expires after
RESET_TTL, it is cleared when used, and a new request replaces any previous
token. Requests are rate-limited per IP (DRF throttle) and per account
(cooldown) and always answer generically to avoid account enumeration.
"""
import logging
import secrets
from datetime import timedelta
from html import escape

import hmac
from django.conf import settings
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework.throttling import AnonRateThrottle

from .email_verification import _hash_code, _now

logger = logging.getLogger(__name__)

RESET_TTL = timedelta(minutes=30)
RESET_COOLDOWN = timedelta(seconds=60)


# ── Tokens ──────────────────────────────────────────────────────────────────
def encode_uid(user) -> str:
    return urlsafe_base64_encode(force_bytes(str(user.id)))


def decode_uid(uid: str) -> str | None:
    try:
        return force_str(urlsafe_base64_decode(str(uid or '')))
    except (ValueError, TypeError, UnicodeDecodeError):
        return None


def reset_cooldown_active(user) -> bool:
    sent = getattr(user, 'password_reset_sent_at', None)
    return bool(sent) and _now() < sent + RESET_COOLDOWN


def issue_reset_token(user) -> str:
    """Creates a fresh single-use token (replacing any previous one) and saves."""
    token = secrets.token_urlsafe(32)
    user.password_reset_hash = _hash_code(token)
    user.password_reset_expires_at = _now() + RESET_TTL
    user.password_reset_sent_at = _now()
    user.save()
    return token


def find_user_for_reset(User, uid: str, token: str):
    """
    Returns (user, error_code). error_code is None when the uid/token pair is
    valid and unexpired, otherwise 'invalid' or 'expired'.
    """
    user_id = decode_uid(uid)
    token = str(token or '').strip()
    if not user_id or not token:
        return None, 'invalid'
    try:
        user = User.objects(id=user_id).first()
    except Exception:  # malformed ObjectId etc.
        user = None
    if not user or not user.password_reset_hash:
        return None, 'invalid'
    if not hmac.compare_digest(user.password_reset_hash, _hash_code(token)):
        return None, 'invalid'
    if not user.password_reset_expires_at or _now() > user.password_reset_expires_at:
        return None, 'expired'
    return user, None


def complete_password_reset(user, new_password_hash: str) -> None:
    """Stores the new hash and invalidates the token (single use)."""
    user.password = new_password_hash
    user.password_reset_hash = None
    user.password_reset_expires_at = None
    # Following the emailed link proves ownership of the address
    if getattr(user, 'account_status', 'active') == 'unverified':
        user.account_status = 'active'
        user.verification_code_hash = None
        user.verification_link_hash = None
    user.save()


# ── Email ───────────────────────────────────────────────────────────────────
def reset_url(user, token: str) -> str:
    return f'{settings.FRONTEND_URL}/auth/reset-password?token={token}&uid={encode_uid(user)}'


def _render_reset_email(cadet_name: str, url: str, minutes: int) -> tuple[str, str]:
    name = escape(cadet_name or 'Cadet')
    text = (
        'CRITICA BUREAU — PASSPHRASE RESET\n\n'
        f'Cadet {cadet_name},\n\n'
        'We received a request to reset your Critica passphrase.\n'
        f'Reset it here: {url}\n\n'
        f'This link expires in {minutes} minutes and can be used once.\n'
        "If you didn't request this, ignore this email — your passphrase stays unchanged.\n\n"
        '— Inspector Crit, Forensic Investigation Bureau'
    )
    mascot = f"{settings.FRONTEND_URL}/images/inspector-crit.png"
    html = f"""<!doctype html>
<html><body style="margin:0;padding:24px 12px;background:#1e2227">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0"
       style="max-width:520px;width:100%;background:#e9dcbc;border:1px solid #c9b48a;border-radius:10px;
              font-family:'Courier New',Courier,monospace;color:#2b2016">
  <tr><td style="padding:16px 26px 10px;border-bottom:1px solid rgba(139,115,85,.45)">
    <img src="{escape(mascot)}" alt="Inspector Crit" width="34" height="40"
         style="vertical-align:middle;margin-right:8px;border:0">
    <span style="font-size:12px;font-weight:bold;letter-spacing:.18em;vertical-align:middle">
      CRITICA // FORENSIC INVESTIGATION BUREAU</span>
  </td></tr>
  <tr><td align="center" style="padding:22px 26px 6px">
    <div style="display:inline-block;border:4px double #9e2a2b;color:#9e2a2b;padding:6px 16px;
                font-size:18px;font-weight:bold;letter-spacing:.2em;transform:rotate(-2deg)">
      PASSPHRASE RESET REQUEST
    </div>
  </td></tr>
  <tr><td style="padding:14px 26px 4px;font-size:14px;line-height:1.6">
    Cadet <strong>{name}</strong>,<br>
    A request to reset your Bureau passphrase was filed. Use the button below to set a new one.
  </td></tr>
  <tr><td align="center" style="padding:18px 26px">
    <a href="{escape(url)}"
       style="display:inline-block;background:#4e3629;color:#f9f6ed;text-decoration:none;
              padding:12px 26px;border:2px solid #2b2016;border-radius:6px;
              font:bold 13px 'Courier New',monospace;letter-spacing:.16em">
      RESET MY PASSPHRASE
    </a>
  </td></tr>
  <tr><td style="padding:0 26px 18px;font-size:12px;color:#6b5a44;line-height:1.6">
    This link expires in {minutes} minutes and works once. If you didn't request a reset,
    ignore this email — your passphrase stays unchanged.
  </td></tr>
  <tr><td style="padding:12px 26px 20px;border-top:1px dashed rgba(139,115,85,.6);
                 font:italic 14px 'Segoe Print','Bradley Hand',cursive;color:#9e2a2b">
    Even the best detectives misplace a key now and then. — Inspector Crit
  </td></tr>
</table>
</td></tr></table>
</body></html>"""
    return text, html


def send_password_reset_email(user, token: str) -> bool:
    """
    Sends the reset email. Without SMTP credentials (dev), logs the link to the
    console instead. Returns success; never raises.
    """
    url = reset_url(user, token)
    minutes = int(RESET_TTL.total_seconds() // 60)

    if not getattr(settings, 'EMAIL_DELIVERY_CONFIGURED', False):
        banner = '\n'.join([
            '',
            '=' * 64,
            f'[DEV EMAIL] Password reset for {user.email}',
            f'  Reset link : {url}',
            '  (Set EMAIL_SERVER_USER / EMAIL_SERVER_PASSWORD to send real email.)',
            '=' * 64,
        ])
        logger.warning(banner)
        print(banner, flush=True)
        return True

    text, html = _render_reset_email(user.first_name, url, minutes)
    try:
        send_mail('CRITICA BUREAU — passphrase reset', text, settings.DEFAULT_FROM_EMAIL,
                  [user.email], html_message=html)
        return True
    except Exception:
        logger.exception('Failed to send password reset email to %s', user.email)
        return False


# ── Throttles (rates in settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']) ──
class ForgotPasswordThrottle(AnonRateThrottle):
    scope = 'auth_forgot_password'


class ResetPasswordThrottle(AnonRateThrottle):
    scope = 'auth_reset_password'
