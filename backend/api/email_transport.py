"""
SMTP diagnostics for the verification / password-reset emails.

- verify_smtp_connection(): the Django equivalent of nodemailer's transporter.verify().
  Connects, upgrades with STARTTLS and logs in (no email is sent), then logs the outcome.
  Run once in the background when the server starts (see ApiConfig.ready).
- describe_smtp_error(): turns an exception from send_mail() into a one-line summary with
  the SMTP status code, e.g. "535 5.7.8 Username and Password not accepted".
"""
import logging
import smtplib
import socket
import ssl
import threading
from urllib.parse import urlparse

from django.conf import settings

logger = logging.getLogger(__name__)


def _smtp_text(raw) -> str:
    text = raw.decode(errors='replace') if isinstance(raw, bytes) else str(raw)
    return ' '.join(text.split())


def describe_smtp_error(exc: Exception) -> str:
    """One-line description of a send failure, including the SMTP status code when there is one."""
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
                '(the host may block outbound SMTP ports 587/465)')
    return f'{type(exc).__name__}: {exc}'


def verify_smtp_connection() -> bool:
    """Connect + STARTTLS + LOGIN without sending anything. Logs and returns the outcome."""
    if not getattr(settings, 'EMAIL_DELIVERY_CONFIGURED', False):
        logger.warning('Email: EMAIL_SERVER_USER / EMAIL_SERVER_PASSWORD not set, so verification and '
                       'reset emails are printed to this console instead of being sent.')
        return False

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
        logger.error('Email: SMTP check FAILED, %s', describe_smtp_error(exc))
        return False


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
    """Startup check in a daemon thread so a slow SMTP server never delays boot."""
    def run():
        check_frontend_url()
        verify_smtp_connection()
    threading.Thread(target=run, name='smtp-startup-check', daemon=True).start()
