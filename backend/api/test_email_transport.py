# backend/api/test_email_transport.py
# Email dispatch through Resend (HTTPS) with the SMTP fallback. The Resend SDK is mocked:
# no request leaves the test run.
from types import SimpleNamespace
from unittest import mock

import requests
import resend
from django.core import mail
from django.test import TestCase, override_settings

from api.email_transport import describe_email_error, send_email, verify_resend
from api.email_verification import send_verification_email
from api.password_reset import send_password_reset_email

RESEND = dict(
    EMAIL_PROVIDER='resend', RESEND_API_KEY='re_test_key', EMAIL_DELIVERY_CONFIGURED=True,
    DEFAULT_FROM_EMAIL='Critica Bureau <no-reply@critica.example>', FRONTEND_URL='https://critica.example',
)


def resend_error(code, error_type, message):
    return resend.exceptions.ResendError(code=code, error_type=error_type, message=message, suggested_action='')


@override_settings(**RESEND)
class ResendDispatchTests(TestCase):
    @mock.patch('resend.Emails.send', return_value={'id': 'msg_123'})
    def test_verification_email_goes_through_resend(self, send):
        with self.assertLogs('api.email_verification', level='INFO') as logs:
            self.assertTrue(send_verification_email('cadet@example.com', '123456', 'Ada', 'tok'))
        payload = send.call_args.args[0]
        self.assertEqual(payload['from'], 'Critica Bureau <no-reply@critica.example>')
        self.assertEqual(payload['to'], ['cadet@example.com'])
        self.assertIn('verification code', payload['subject'])
        self.assertIn('https://critica.example/auth/verify?token=tok', payload['html'])
        self.assertIn('123456', payload['text'])   # the HTML shows the code one digit per cell
        self.assertIn('https://critica.example/auth/verify?token=tok', payload['text'])
        self.assertTrue(any('via resend msg_123' in line for line in logs.output))
        self.assertEqual(resend.api_key, 're_test_key')
        self.assertEqual(len(mail.outbox), 0)   # SMTP backend untouched

    @mock.patch('resend.Emails.send', return_value={'id': 'msg_456'})
    def test_password_reset_goes_through_resend(self, send):
        user = SimpleNamespace(id='abc123', email='cadet@example.com', first_name='Ada')
        self.assertTrue(send_password_reset_email(user, 'reset-token'))
        payload = send.call_args.args[0]
        self.assertEqual(payload['to'], ['cadet@example.com'])
        self.assertIn('https://critica.example/auth/reset-password?token=reset-token', payload['html'])

    def test_unverified_domain_403_is_logged_with_code(self):
        err = resend_error(403, 'validation_error', 'The gmail.com domain is not verified.')
        with mock.patch('resend.Emails.send', side_effect=err):
            with self.assertLogs('api.email_verification', level='ERROR') as logs:
                self.assertFalse(send_verification_email('cadet@example.com', '123456', 'Ada', 'tok'))
        line = logs.output[0]
        self.assertIn('Resend API 403 validation_error', line)
        self.assertIn('resend.com/domains', line)

    def test_invalid_key_is_reported(self):
        msg = describe_email_error(resend_error(401, 'invalid_api_key', 'API key is invalid'))
        self.assertIn('Resend API 401 invalid_api_key', msg)
        self.assertIn('RESEND_API_KEY', msg)

    def test_rate_limit_is_reported(self):
        self.assertIn('quota', describe_email_error(resend_error(429, 'daily_quota_exceeded', 'Quota hit')))

    def test_network_failure_is_reported(self):
        user = SimpleNamespace(id='abc123', email='cadet@example.com', first_name='Ada')
        with mock.patch('resend.Emails.send', side_effect=requests.ConnectionError('dns failure')):
            with self.assertLogs('api.password_reset', level='ERROR') as logs:
                self.assertFalse(send_password_reset_email(user, 'reset-token'))
        self.assertIn('could not reach the Resend API', logs.output[0])


@override_settings(EMAIL_PROVIDER='smtp', RESEND_API_KEY='', EMAIL_DELIVERY_CONFIGURED=True,
                   EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
                   DEFAULT_FROM_EMAIL='Inspector Crit <bureau@example.com>')
class SmtpFallbackTests(TestCase):
    @mock.patch('resend.Emails.send')
    def test_without_resend_key_smtp_is_used(self, resend_send):
        self.assertEqual(send_email('Subject', 'cadet@example.com', 'plain', '<p>html</p>'), '')
        resend_send.assert_not_called()
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['cadet@example.com'])
        self.assertEqual(mail.outbox[0].alternatives[0][0], '<p>html</p>')


@override_settings(**RESEND)
class ResendStartupCheckTests(TestCase):
    def test_key_without_prefix_fails(self):
        with override_settings(RESEND_API_KEY='sk_not_resend'), self.assertLogs('api.email_transport', level='ERROR'):
            self.assertFalse(verify_resend())

    @mock.patch('resend.Domains.list', return_value={'data': [{'name': 'critica.example', 'status': 'verified'}]})
    def test_verified_domain_passes(self, _):
        with self.assertLogs('api.email_transport', level='INFO') as logs:
            self.assertTrue(verify_resend())
        self.assertIn('Resend check OK', logs.output[-1])

    @mock.patch('resend.Domains.list', return_value={'data': [{'name': 'other.example', 'status': 'verified'}]})
    def test_unverified_from_domain_fails(self, _):
        with self.assertLogs('api.email_transport', level='ERROR') as logs:
            self.assertFalse(verify_resend())
        self.assertIn("'critica.example' is not verified", logs.output[0])

    def test_sending_only_key_is_accepted(self):
        err = resend_error(401, 'restricted_api_key', 'This API key is restricted to only send emails')
        with mock.patch('resend.Domains.list', side_effect=err), self.assertLogs('api.email_transport', level='INFO'):
            self.assertTrue(verify_resend())

    def test_bad_key_fails(self):
        err = resend_error(403, 'invalid_api_key', 'API key is invalid')
        with mock.patch('resend.Domains.list', side_effect=err), \
                self.assertLogs('api.email_transport', level='ERROR') as logs:
            self.assertFalse(verify_resend())
        self.assertIn('Resend check FAILED', logs.output[0])

    def test_test_sender_warns(self):
        with override_settings(DEFAULT_FROM_EMAIL='Critica Bureau <onboarding@resend.dev>'), \
                mock.patch('resend.Domains.list', return_value={'data': []}), \
                self.assertLogs('api.email_transport', level='WARNING') as logs:
            self.assertTrue(verify_resend())
        self.assertIn('test sender', logs.output[0])
