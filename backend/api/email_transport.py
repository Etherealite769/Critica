"""
Email dispatch for the verification / password-reset emails.

- send_email(): the single sender used by api/email_verification.py and api/password_reset.py.
  With RESEND_API_KEY set it calls the Resend HTTPS API (port 443, so hosts that block
  outbound SMTP still deliver); otherwise it falls back to Django's SMTP backend.
- verify_email_transport(): the startup check (nodemailer's transporter.verify() equivalent).
  Resend: validates the API key and that EMAIL_FROM's domain is verified. SMTP: connects,
  upgrades with STARTTLS and logs in. Nothing is sent. Run in the background at boot
  (see ApiConfig.ready).
- describe_email_error(): turns a send failure into a one-line summary with the HTTP / SMTP
  status code, e.g. "Resend API 403 validation_error: The gmail.com domain is not verified".
"""
import logging
import smtplib
import socket
import ssl
import threading
from email.utils import parseaddr
from urllib.parse import urlparse

import requests
import resend
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

RESEND_TEST_DOMAIN = 'resend.dev'


def _smtp_text(raw) -> str:
    text = raw.decode(errors='replace') if isinstance(raw, bytes) else str(raw)
    return ' '.join(text.split())


def _from_domain() -> str:
    return parseaddr(settings.DEFAULT_FROM_EMAIL)[1].rpartition('@')[2].lower()


def _configure_resend() -> None:
    resend.api_key = settings.RESEND_API_KEY
    resend.default_http_client = resend.RequestsClient(timeout=settings.EMAIL_TIMEOUT)


def send_email(subject: str, recipient: str, text: str, html: str) -> str:
    """
    Sends one email through the configured provider. Returns the provider message id
    ('' for SMTP). Raises on failure; callers log describe_email_error(exc).
    """
    if settings.EMAIL_PROVIDER == 'resend':
        _configure_resend()
        response = resend.Emails.send({
            'from': settings.DEFAULT_FROM_EMAIL,
            'to': [recipient],
            'subject': subject,
            'html': html,
            'text': text,
        })
        return str((response or {}).get('id', ''))
    send_mail(subject, text, settings.DEFAULT_FROM_EMAIL, [recipient], html_message=html)
    return ''


def _resend_hint(exc: resend.exceptions.ResendError) -> str:
    code = str(exc.code)
    if code == '401' or exc.error_type in ('missing_api_key', 'invalid_api_key', 'restricted_api_key'):
        return 'check RESEND_API_KEY'
    if code == '403':
        return (f'EMAIL_FROM must use a domain verified at resend.com/domains; '
                f'the {RESEND_TEST_DOMAIN} test sender only delivers to your Resend account email')
    if code == '422':
        return 'check the from / to addresses'
    if code == '429':
        return 'rate limit or daily quota reached'
    return ''


def describe_email_error(exc: Exception) -> str:
    """One-line description of a send failure, including the HTTP or SMTP status code when there is one."""
    if isinstance(exc, resend.exceptions.ResendError):
        hint = _resend_hint(exc)
        return f'Resend API {exc.code} {exc.error_type}: {exc.message}' + (f' ({hint})' if hint else '')
    if isinstance(exc, requests.RequestException):
        return f'could not reach the Resend API: {type(exc).__name__}: {exc}'

    host = f'{settings.EMAIL_HOST}:{settings.EMAIL_PORT}'
    if isinstance(exc, smtplib.SMTPRecipientsRefused):
        refused = '; '.join(f'{rcpt}: {code} {_smtp_text(msg)}' for rcpt, (code, msg) in exc.recipients.items())
        return f'recipient refused by {host} ({refused})'
    if isinstance(exc, smtplib.SMTPAuthenticationError):
        return (f'authentication failed at {host}: {exc.smtp_code} {_smtp_text(exc.smtp_error)} '
                '(check EMAIL_SERVER_USER / EMAIL_SERVER_PASSWORD; Gmail needs a 16-character App Password)')
    if isinstance(exc, smtplib.SMTPSenderRefused):
        return (f'sender {exc.sender} refused by {host}: {exc.smtp_code} {_smtp_text(exc.smtp_error)} '
                '(EMAIL_FROM must be the authenticated account or a verified alias)')
    if isinstance(exc, smtplib.SMTPResponseException):
        return f'{host} answered {exc.smtp_code} {_smtp_text(exc.smtp_error)}'
    if isinstance(exc, (socket.timeout, TimeoutError, ConnectionError, OSError)):
        return (f'could not reach {host}: {type(exc).__name__}: {exc} '
                '(the host may block outbound SMTP ports 587/465; set RESEND_API_KEY to send over HTTPS)')
    return f'{type(exc).__name__}: {exc}'


# Kept for callers written against the SMTP-only version
describe_smtp_error = describe_email_error


def verify_resend() -> bool:
    """Checks the API key and the sending domain without sending anything."""
    if not settings.RESEND_API_KEY.startswith('re_'):
        logger.error('Email: RESEND_API_KEY does not look like a Resend key (expected the "re_" prefix).')
        return False
    domain = _from_domain()
    if domain == RESEND_TEST_DOMAIN:
        logger.warning('Email: EMAIL_FROM uses the %s test sender, which only delivers to the Resend '
                       'account owner\'s address. Verify your own domain before inviting students.',
                       RESEND_TEST_DOMAIN)
    _configure_resend()
    try:
        domains = (resend.Domains.list() or {}).get('data', [])
    except resend.exceptions.ResendError as exc:
        if exc.error_type == 'restricted_api_key':
            # A sending-only key cannot list domains, but the API accepted it
            logger.info('Email: Resend API key accepted (sending access only); sending from %s.',
                        settings.DEFAULT_FROM_EMAIL)
            return True
        logger.error('Email: Resend check FAILED, %s', describe_email_error(exc))
        return False
    except requests.RequestException as exc:
        logger.error('Email: Resend check FAILED, %s', describe_email_error(exc))
        return False

    verified = {d.get('name', '').lower() for d in domains if d.get('status') == 'verified'}
    if domain != RESEND_TEST_DOMAIN and domain not in verified:
        logger.error('Email: Resend key OK, but EMAIL_FROM domain %r is not verified (verified: %s). '
                     'Resend will reject sends with 403.', domain, ', '.join(sorted(verified)) or 'none')
        return False
    logger.info('Email: Resend check OK, sending from %s over HTTPS.', settings.DEFAULT_FROM_EMAIL)
    return True


def verify_smtp_connection() -> bool:
    """Connect + STARTTLS + LOGIN without sending anything. Logs and returns the outcome."""
    host, port = settings.EMAIL_HOST, settings.EMAIL_PORT
    try:
        smtp_cls = smtplib.SMTP_SSL if settings.EMAIL_USE_SSL else smtplib.SMTP
        with smtp_cls(host, port, timeout=settings.EMAIL_TIMEOUT) as smtp:
            smtp.ehlo()
            if settings.EMAIL_USE_TLS:
                smtp.starttls(context=ssl.create_default_context())
                smtp.ehlo()
            code, msg = smtp.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
        logger.info('Email: SMTP check OK, %s:%s login answered %s %s', host, port, code, _smtp_text(msg))
        return True
    except Exception as exc:
        logger.error('Email: SMTP check FAILED, %s', describe_email_error(exc))
        return False


def verify_email_transport() -> bool:
    """Startup check for whichever provider is configured."""
    if not getattr(settings, 'EMAIL_DELIVERY_CONFIGURED', False):
        logger.warning('Email: neither RESEND_API_KEY nor EMAIL_SERVER_USER / EMAIL_SERVER_PASSWORD is set, so '
                       'verification and reset emails are printed to this console instead of being sent.')
        return False
    if settings.EMAIL_PROVIDER == 'resend':
        return verify_resend()
    return verify_smtp_connection()


def check_frontend_url() -> None:
    """Links in the emails are built from FRONTEND_URL; warn when they cannot work."""
    url = urlparse(settings.FRONTEND_URL)
    if url.scheme not in ('http', 'https') or not url.netloc:
        logger.error('Email: FRONTEND_URL %r is not an absolute http(s) URL, so email links will be broken.',
                     settings.FRONTEND_URL)
    elif not settings.DEBUG and url.hostname in ('localhost', '127.0.0.1'):
        logger.warning('Email: FRONTEND_URL is %s in a non-DEBUG deployment, so verification and reset '
                       'links will point at localhost. Set FRONTEND_URL to the public frontend address.',
                       settings.FRONTEND_URL)


def check_email_transport_async() -> None:
    """Startup check in a daemon thread so a slow provider never delays boot."""
    def run():
        check_frontend_url()
        verify_email_transport()
    threading.Thread(target=run, name='email-startup-check', daemon=True).start()
