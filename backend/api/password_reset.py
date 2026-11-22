# backend/api/password_reset.py
"""
Forgot / reset password support for api/views.py.

A reset link carries `uid` (URL-safe base64 of the user id) and a random
`token`. Only an HMAC of the token is stored on the user, it expires after
RESET_TTL, it is cleared when used, and a new request replaces any previous
token. Requests are rate-limited per IP (DRF throttle) and per account
(cooldown) and always answer generically to avoid account enumeration.
"""
import hashlib
import logging
import math
import secrets
from datetime import datetime, timedelta, timezone
from html import escape

import mongoengine as me
from pymongo.errors import DuplicateKeyError

import hmac
from django.conf import settings
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework.throttling import AnonRateThrottle

from .email_verification import _hash_code, _now
from .email_transport import describe_email_error, send_email

logger = logging.getLogger(__name__)

RESET_TTL = timedelta(minutes=30)
RESET_COOLDOWN = timedelta(seconds=60)


# ── Per-email request cooldown ──────────────────────────────────────────────
class PasswordResetRequest(me.Document):
    """
    When a forgot-password request was last accepted for an email address. Keyed by a SHA-256 of the normalized
    address (the address itself is never stored), and kept for every submitted email, registered or not, so the
    cooldown behaves the same for both and cannot reveal which addresses have accounts. Lives in MongoDB so every
    worker and restart sees it. Old entries expire after a day.
    """
    key = me.StringField(primary_key=True)
    requested_at = me.DateTimeField(required=True)
    meta = {
        'collection': 'password_reset_requests',
        'indexes': [{'fields': ['requested_at'], 'expireAfterSeconds': 86400}],
    }


def _utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)   # MongoDB stores and returns naive UTC


def claim_reset_request(email: str) -> int:
    """
    Atomically claims a reset request for a normalized email. Returns 0 if the request may go ahead (and records
    it), otherwise the whole seconds left in the RESET_COOLDOWN window (at least 1). Fails open on a database error.
    """
    key = hashlib.sha256(email.encode('utf-8')).hexdigest()
    now = _utcnow_naive()
    try:
        coll = PasswordResetRequest._get_collection()
        # Seen before and the window has passed: take it (atomic, so two parallel requests cannot both pass)
        if coll.find_one_and_update({'_id': key, 'requested_at': {'$lte': now - RESET_COOLDOWN}},
                                    {'$set': {'requested_at': now}}) is not None:
            return 0
        # First request for this address: the unique _id lets exactly one parallel insert win
        try:
            coll.insert_one({'_id': key, 'requested_at': now})
            return 0
        except DuplicateKeyError:
            pass
        last = (coll.find_one({'_id': key}) or {}).get('requested_at') or now
        return max(1, math.ceil((last + RESET_COOLDOWN - now).total_seconds()))
    except Exception:
        logger.exception('Password reset cooldown check failed; allowing the request')
        return 0


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
            '  (Set BREVO_API_KEY to send real email.)',
            '=' * 64,
        ])
        logger.warning(banner)
        print(banner, flush=True)
        return True

    text, html = _render_reset_email(user.first_name, url, minutes)
    try:
        message_id = send_email('CRITICA BUREAU — passphrase reset', user.email, text, html)
        logger.info('Password reset email sent to %s via %s %s', user.email, settings.EMAIL_PROVIDER, message_id)
        return True
    except Exception as exc:
        logger.error('Failed to send password reset email to %s: %s', user.email, describe_email_error(exc),
                     exc_info=True)
        return False


# ── Throttles (rates in settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']) ──
class ForgotPasswordThrottle(AnonRateThrottle):
    scope = 'auth_forgot_password'


class ResetPasswordThrottle(AnonRateThrottle):
    scope = 'auth_reset_password'
