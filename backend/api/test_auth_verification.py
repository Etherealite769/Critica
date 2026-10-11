# backend/api/test_auth_verification.py
"""
Tests for registration policy, email availability, verification codes and
login gating. The MongoEngine User model is replaced with an in-memory fake so
these tests never touch the real database.
"""
import io
import re
from contextlib import redirect_stdout
from datetime import timedelta
from unittest import mock

from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from api import email_verification as ev
from api.views import hash_password


class _FakeQuery:
    def __init__(self, items):
        self._items = items

    def first(self):
        return self._items[0] if self._items else None


class FakeUser:
    """Minimal stand-in for api.models.User (mongoengine Document)."""
    store: list = []
    _next_id = 1

    def __init__(self, **kw):
        self.id = None
        self.first_name = kw.get('first_name', '')
        self.last_name = kw.get('last_name', '')
        self.email = kw.get('email', '')
        self.password = kw.get('password', '')
        self.is_active = kw.get('is_active', True)
        self.account_status = kw.get('account_status', 'active')
        self.verification_code_hash = None
        self.verification_link_hash = None
        self.verification_expires_at = None
        self.verification_attempts = 0
        self.verification_sent_at = None

    def save(self):
        if self.id is None:
            self.id = FakeUser._next_id
            FakeUser._next_id += 1
            FakeUser.store.append(self)
        return self

    def delete(self):
        FakeUser.store.remove(self)

    @classmethod
    def objects(cls, email__iexact=None, verification_link_hash=None, **_):
        if verification_link_hash is not None:
            return _FakeQuery([u for u in cls.store if u.verification_link_hash == verification_link_hash])
        return _FakeQuery([u for u in cls.store if u.email.lower() == (email__iexact or '').lower()])


STRONG = 'Sleuth$2024!'  # satisfies all five rules


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
                   EMAIL_DELIVERY_CONFIGURED=True, FRONTEND_URL='http://localhost:3000')
class AuthVerificationTests(TestCase):
    def setUp(self):
        FakeUser.store = []
        cache.clear()  # reset throttles
        patcher = mock.patch('api.views.User', FakeUser)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client = APIClient()

    def _register(self, **overrides):
        body = {
            'first_name': 'Ada', 'last_name': 'Lovelace', 'email': 'Ada@Example.com',
            'password': STRONG, 'password_confirm': STRONG,
        }
        body.update(overrides)
        return self.client.post('/api/auth/register/', body, format='json')

    def _code_from_outbox(self):
        return re.search(r'code is: (\d{6})', mail.outbox[-1].body).group(1)

    def _link_token_from_outbox(self):
        return re.search(r'/auth/verify\?token=([\w-]+)', mail.outbox[-1].body).group(1)

    # ── password policy ──
    def test_policy_helper(self):
        self.assertEqual(ev.password_policy_errors(STRONG), [])
        self.assertIn('an uppercase letter', ev.password_policy_errors('sleuth$2024'))
        self.assertIn(f'a special character ({ev.PASSWORD_SPECIALS})', ev.password_policy_errors('Sleuth2024x'))
        self.assertIn('at least 8 characters', ev.password_policy_errors('Ab1$'))

    def test_register_rejects_weak_password(self):
        res = self._register(password='password1', password_confirm='password1')
        self.assertEqual(res.status_code, 400)
        self.assertIn('password_requirements', res.data)
        self.assertEqual(FakeUser.store, [])

    def test_register_rejects_bad_email(self):
        res = self._register(email='not-an-email')
        self.assertEqual(res.status_code, 400)

    # ── registration + verification ──
    def test_register_creates_unverified_user_and_sends_code(self):
        res = self._register()
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['status'], 'unverified')
        self.assertNotIn('tokens', res.data)
        user = FakeUser.store[0]
        self.assertEqual(user.email, 'ada@example.com')        # normalised
        self.assertEqual(user.account_status, 'unverified')
        self.assertEqual(len(mail.outbox), 1)
        code = self._code_from_outbox()
        self.assertNotIn(code, user.verification_code_hash)    # only the HMAC is stored

    def test_duplicate_email_is_rejected_case_insensitively(self):
        self._register()
        res = self._register(email='ADA@example.com')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['code'], 'email_taken')

    def test_check_email(self):
        self._register()
        taken = self.client.get('/api/auth/check-email/', {'email': 'ada@example.com'})
        free = self.client.get('/api/auth/check-email/', {'email': 'new@example.com'})
        bad = self.client.get('/api/auth/check-email/', {'email': 'nope'})
        self.assertEqual(taken.data, {'valid': True, 'available': False})
        self.assertEqual(free.data, {'valid': True, 'available': True})
        self.assertEqual(bad.data, {'valid': False, 'available': False})

    def test_login_blocked_until_verified_then_allowed(self):
        self._register()
        blocked = self.client.post('/api/auth/login/', {'email': 'ada@example.com', 'password': STRONG}, format='json')
        self.assertEqual(blocked.status_code, 403)
        self.assertEqual(blocked.data['code'], 'email_unverified')

        verified = self.client.post('/api/auth/verify-email/',
                                    {'email': 'ada@example.com', 'code': self._code_from_outbox()}, format='json')
        self.assertEqual(verified.status_code, 200)
        self.assertIn('access', verified.data['tokens'])
        self.assertEqual(FakeUser.store[0].account_status, 'active')

        ok = self.client.post('/api/auth/login/', {'email': 'ada@example.com', 'password': STRONG}, format='json')
        self.assertEqual(ok.status_code, 200)

    def test_wrong_password_on_unverified_account_does_not_reveal_status(self):
        self._register()
        res = self.client.post('/api/auth/login/', {'email': 'ada@example.com', 'password': 'Wrong$123'}, format='json')
        self.assertEqual(res.status_code, 401)

    def test_wrong_code_counts_attempts_and_locks(self):
        self._register()
        for _ in range(ev.MAX_CODE_ATTEMPTS):
            r = self.client.post('/api/auth/verify-email/', {'email': 'ada@example.com', 'code': '000000'}, format='json')
            self.assertIn(r.data['code'], ('invalid', 'too_many_attempts'))
        locked = self.client.post('/api/auth/verify-email/',
                                  {'email': 'ada@example.com', 'code': self._code_from_outbox()}, format='json')
        self.assertEqual(locked.data['code'], 'too_many_attempts')

    def test_expired_code(self):
        self._register()
        user = FakeUser.store[0]
        user.verification_expires_at = ev._now() - timedelta(seconds=1)
        res = self.client.post('/api/auth/verify-email/',
                               {'email': 'ada@example.com', 'code': self._code_from_outbox()}, format='json')
        self.assertEqual(res.data['code'], 'expired')

    def test_resend_cooldown_and_new_code(self):
        self._register()
        first_code = self._code_from_outbox()
        too_soon = self.client.post('/api/auth/resend-verification/', {'email': 'ada@example.com'}, format='json')
        self.assertEqual(too_soon.status_code, 429)

        FakeUser.store[0].verification_sent_at = ev._now() - timedelta(minutes=2)
        again = self.client.post('/api/auth/resend-verification/', {'email': 'ada@example.com'}, format='json')
        self.assertEqual(again.status_code, 200)
        self.assertEqual(len(mail.outbox), 2)
        new_code = self._code_from_outbox()
        old = self.client.post('/api/auth/verify-email/', {'email': 'ada@example.com', 'code': first_code}, format='json')
        if first_code != new_code:
            self.assertEqual(old.data['code'], 'invalid')
        ok = self.client.post('/api/auth/verify-email/', {'email': 'ada@example.com', 'code': new_code}, format='json')
        self.assertEqual(ok.status_code, 200)

    def test_resend_is_generic_for_unknown_email(self):
        res = self.client.post('/api/auth/resend-verification/', {'email': 'ghost@example.com'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    def test_existing_accounts_without_status_still_log_in(self):
        legacy = FakeUser(first_name='Old', last_name='Timer', email='old@example.com',
                          password=hash_password('whatever'))  # account_status defaults to 'active'
        legacy.save()
        res = self.client.post('/api/auth/login/', {'email': 'old@example.com', 'password': 'whatever'}, format='json')
        self.assertEqual(res.status_code, 200)

    # ── one-click link, send failure, dev fallback ──
    def test_email_contains_bureau_branding_code_and_link(self):
        self._register()
        html = mail.outbox[-1].alternatives[0][0]
        self.assertIn('CRITICA BUREAU CLEARANCE', html)
        self.assertIn('Inspector Crit', html)
        self.assertIn('http://localhost:3000/auth/verify?token=', html)
        for digit in self._code_from_outbox():
            self.assertIn(f'>{digit}</td>', html)

    def test_one_click_link_verifies_once(self):
        self._register()
        token = self._link_token_from_outbox()
        self.assertNotEqual(FakeUser.store[0].verification_link_hash, token)   # only the HMAC is stored
        ok = self.client.post('/api/auth/verify-email/', {'token': token}, format='json')
        self.assertEqual(ok.status_code, 200)
        self.assertIn('access', ok.data['tokens'])
        self.assertEqual(FakeUser.store[0].account_status, 'active')
        again = self.client.post('/api/auth/verify-email/', {'token': token}, format='json')
        self.assertEqual(again.data['code'], 'invalid_link')

    def test_expired_link(self):
        self._register()
        token = self._link_token_from_outbox()
        FakeUser.store[0].verification_expires_at = ev._now() - timedelta(seconds=1)
        res = self.client.post('/api/auth/verify-email/', {'token': token}, format='json')
        self.assertEqual(res.data['code'], 'expired')

    def test_send_failure_rolls_back_and_reports(self):
        with mock.patch('api.email_verification.send_mail', side_effect=OSError('smtp down')):
            res = self._register()
        self.assertEqual(res.status_code, 502)
        self.assertEqual(res.data['error'], 'Failed to send clearance code to specified email address')
        self.assertEqual(FakeUser.store, [])   # cadet can simply retry sign-up

    @override_settings(EMAIL_DELIVERY_CONFIGURED=False)
    def test_dev_fallback_logs_code_and_link_without_sending(self):
        out = io.StringIO()
        with redirect_stdout(out), self.assertLogs('api.email_verification', level='WARNING'):
            res = self._register()
        self.assertEqual(res.status_code, 201)
        self.assertEqual(len(mail.outbox), 0)
        printed = out.getvalue()
        self.assertRegex(printed, r'Clearance code : \d{6}')
        self.assertIn('http://localhost:3000/auth/verify?token=', printed)
