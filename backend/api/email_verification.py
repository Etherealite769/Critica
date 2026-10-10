# backend/api/email_verification.py
"""
Password policy, email normalisation/validation and email-verification codes
for the auth views in api/views.py.

Verification uses a 6-digit one-time code plus a one-click link token sent in
the same email. Only HMACs of both are stored on the user (keyed with
SECRET_KEY); they expire together, code attempts are capped, and resends are
rate-limited per account.

Delivery goes through Django's mail framework (Gmail SMTP when configured, see
config/settings.py). Without credentials the code and link are logged to the
server console instead, so local sign-ups still work.
"""
import hashlib
import hmac
import logging
import re
import secrets
from html import escape
from datetime import datetime, timedelta, timezone

from django.conf import settings
from django.core.mail import send_mail
from rest_framework.throttling import AnonRateThrottle

logger = logging.getLogger(__name__)

# ── Policies ────────────────────────────────────────────────────────────────
EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')

PASSWORD_SPECIALS = '@$!%*?&'
PASSWORD_RULES = [
    (re.compile(r'.{8,}'), 'at least 8 characters'),
    (re.compile(r'[A-Z]'), 'an uppercase letter'),
    (re.compile(r'[a-z]'), 'a lowercase letter'),
    (re.compile(r'\d'), 'a number'),
    (re.compile('[' + re.escape(PASSWORD_SPECIALS) + ']'), f'a special character ({PASSWORD_SPECIALS})'),
]

CODE_TTL = timedelta(minutes=15)
MAX_CODE_ATTEMPTS = 5
RESEND_COOLDOWN = timedelta(seconds=60)


def normalize_email(email) -> str:
    return str(email or '').strip().lower()


def is_valid_email(email: str) -> bool:
    return bool(EMAIL_RE.match(email)) and len(email) <= 254


def password_policy_errors(password: str) -> list[str]:
    """Returns the unmet requirements (empty list = password is acceptable)."""
    return [label for rule, label in PASSWORD_RULES if not rule.search(password or '')]


# ── Verification codes ──────────────────────────────────────────────────────
def _now() -> datetime:
    # mongoengine stores naive UTC datetimes
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _hash_code(code: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), code.encode(), hashlib.sha256).hexdigest()


def issue_verification_code(user) -> tuple[str, str]:
    """
    Generates a fresh 6-digit code and a one-click link token, stores their
    HMACs on the user and saves. Returns (code, link_token).
    """
    code = f'{secrets.randbelow(1_000_000):06d}'
    link_token = secrets.token_urlsafe(32)
    user.verification_code_hash = _hash_code(code)
    user.verification_link_hash = _hash_code(link_token)
    user.verification_expires_at = _now() + CODE_TTL
    user.verification_attempts = 0
    user.verification_sent_at = _now()
    user.save()
    return code, link_token


def resend_cooldown_remaining(user) -> int:
    """Seconds until another code may be sent (0 = allowed now)."""
    if not user.verification_sent_at:
        return 0
    remaining = (user.verification_sent_at + RESEND_COOLDOWN) - _now()
    return max(0, int(remaining.total_seconds()))


def check_verification_code(user, code: str) -> str:
    """
    Validates a submitted code. Returns one of:
    'ok' | 'invalid' | 'expired' | 'too_many_attempts' | 'no_code'.
    Increments the attempt counter on failure (and saves).
    """
    if not user.verification_code_hash or not user.verification_expires_at:
        return 'no_code'
    if user.verification_attempts >= MAX_CODE_ATTEMPTS:
        return 'too_many_attempts'
    if _now() > user.verification_expires_at:
        return 'expired'
    if not hmac.compare_digest(user.verification_code_hash, _hash_code(str(code or '').strip())):
        user.verification_attempts = (user.verification_attempts or 0) + 1
        user.save()
        return 'invalid'
    return 'ok'


def hash_link_token(token: str) -> str:
    """Lookup key for the one-click link (the raw token is never stored)."""
    return _hash_code(str(token or '').strip())


def link_token_status(user) -> str:
    """'ok' | 'expired' for a user found by their link-token hash."""
    if not user.verification_expires_at or _now() > user.verification_expires_at:
        return 'expired'
    return 'ok'


def mark_verified(user) -> None:
    user.account_status = 'active'
    user.verification_code_hash = None
    user.verification_link_hash = None
    user.verification_expires_at = None
    user.verification_attempts = 0
    user.save()


def verification_url(link_token: str) -> str:
    return f"{settings.FRONTEND_URL}/auth/verify?token={link_token}"


def _render_verification_email(cadet_name: str, code: str, url: str, minutes: int) -> tuple[str, str]:
    name = escape(cadet_name or 'Cadet')
    text = (
        'CRITICA BUREAU CLEARANCE\n\n'
        f'Cadet {cadet_name},\n\n'
        f'Your clearance code is: {code}\n\n'
        f'Or verify in one click: {url}\n\n'
        f'The code and link expire in {minutes} minutes.\n'
        "If you didn't enroll at Critica, ignore this email.\n\n"
        '— Inspector Crit, Forensic Investigation Bureau'
    )
    code_cells = ''.join(
        '<td style="width:38px;height:48px;border:2px solid #4e3629;background:#fffdf6;'
        "font:bold 26px 'Courier New',monospace;color:#2b2016;text-align:center\">"
        f'{d}</td><td style="width:6px"></td>'
        for d in code
    )
    html = f"""<!doctype html>
<html><body style="margin:0;padding:24px 12px;background:#1e2227">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0"
       style="max-width:520px;width:100%;background:#e9dcbc;border:1px solid #c9b48a;border-radius:10px;
              font-family:'Courier New',Courier,monospace;color:#2b2016">
  <tr><td style="padding:18px 26px 10px;border-bottom:1px solid rgba(139,115,85,.45)">
    <span style="font-size:12px;font-weight:bold;letter-spacing:.18em">CRITICA // FORENSIC INVESTIGATION BUREAU</span>
  </td></tr>
  <tr><td align="center" style="padding:22px 26px 6px">
    <div style="display:inline-block;border:4px double #9e2a2b;color:#9e2a2b;padding:6px 16px;
                font-size:18px;font-weight:bold;letter-spacing:.2em;transform:rotate(-2deg)">
      CRITICA BUREAU CLEARANCE
    </div>
  </td></tr>
  <tr><td style="padding:14px 26px 4px;font-size:14px;line-height:1.6">
    Cadet <strong>{name}</strong>,<br>
    Your induction form has been received. Enter this clearance code on the enrollment screen:
  </td></tr>
  <tr><td align="center" style="padding:14px 26px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>{code_cells}</tr></table>
  </td></tr>
  <tr><td align="center" style="padding:4px 26px 18px">
    <a href="{escape(url)}"
       style="display:inline-block;background:#4e3629;color:#f9f6ed;text-decoration:none;
              padding:12px 26px;border:2px solid #2b2016;border-radius:6px;
              font:bold 13px 'Courier New',monospace;letter-spacing:.16em">
      VERIFY IN ONE CLICK
    </a>
  </td></tr>
  <tr><td style="padding:0 26px 18px;font-size:12px;color:#6b5a44;line-height:1.6">
    The code and link expire in {minutes} minutes. If you didn't enroll at Critica, you can ignore this email.
  </td></tr>
  <tr><td style="padding:12px 26px 20px;border-top:1px dashed rgba(139,115,85,.6);
                 font:italic 14px 'Segoe Print','Bradley Hand',cursive;color:#9e2a2b">
    Every great case starts with a verified identity. — Inspector Crit
  </td></tr>
</table>
</td></tr></table>
</body></html>"""
    return text, html


def send_verification_email(to: str, code: str, cadet_name: str, link_token: str) -> bool:
    """
    Sends the Bureau clearance email (code + one-click link). Returns success.
    Dev fallback: without SMTP credentials, logs the code and URL to the
    server console and returns True (no exception).
    """
    minutes = int(CODE_TTL.total_seconds() // 60)
    url = verification_url(link_token)

    if not getattr(settings, 'EMAIL_DELIVERY_CONFIGURED', False):
        banner = '\n'.join([
            '',
            '=' * 64,
            f'[DEV EMAIL] Verification for {to}',
            f'  Clearance code : {code}',
            f'  One-click link : {url}',
            '  (Set EMAIL_SERVER_USER / EMAIL_SERVER_PASSWORD to send real email.)',
            '=' * 64,
        ])
        logger.warning(banner)
        print(banner, flush=True)
        return True

    subject = 'CRITICA BUREAU CLEARANCE — your verification code'
    text, html = _render_verification_email(cadet_name, code, url, minutes)
    try:
        send_mail(subject, text, settings.DEFAULT_FROM_EMAIL, [to], html_message=html)
        return True
    except Exception:
        logger.exception('Failed to send verification email to %s', to)
        return False


# ── Throttles (rates in settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']) ──
class CheckEmailThrottle(AnonRateThrottle):
    scope = 'auth_check_email'


class VerifyEmailThrottle(AnonRateThrottle):
    scope = 'auth_verify_email'


class ResendVerificationThrottle(AnonRateThrottle):
    scope = 'auth_resend_verification'
