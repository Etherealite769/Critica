# backend/api/test_password_reset.py
"""
Forgot / reset password flow and PBKDF2 password hashing (incl. legacy
SHA-256 upgrade). Uses an in-memory fake User — never touches MongoDB.
"""
import hashlib
import re
from datetime import timedelta
from unittest import mock

from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils.http import urlsafe_base64_decode
from rest_framework.test import APIClient

from api import email_verification as ev
from api.views import hash_password

STRONG = 'Sleuth$2024!'
NEW_STRONG = 'Cipher!Case9'


class _Q:
    def __init__(self, items):
        self._items = items

    def first(self):
        return self._items[0] if self._items else None


class FakeUser:
    store: list = []
    _next = 1

    def __init__(self, **kw):
        self.id = None
        self.first_name = kw.get('first_name', 'Ada')
        self.last_name = kw.get('last_name', 'Lovelace')
        self.email = kw.get('email', 'ada@example.com')
        self.password = kw.get('password', '')
        self.is_active = kw.get('is_active', True)
        self.account_status = kw.get('account_status', 'active')
        self.verification_code_hash = None
        self.verification_link_hash = None
        self.verification_expires_at = None
        self.verification_attempts = 0
        self.verification_sent_at = None
        self.password_reset_hash = None
        self.password_reset_expires_at = None
        self.password_reset_sent_at = None

    def save(self):
        if self.id is None:
            self.id = f'64b{FakeUser._next:021d}'   # ObjectId-like string
            FakeUser._next += 1
            FakeUser.store.append(self)
        return self

    def delete(self):
        FakeUser.store.remove(self)

    @classmethod
    def objects(cls, email__iexact=None, id=None, verification_link_hash=None, **_):
        if id is not None:
            return _Q([u for u in cls.store if str(u.id) == str(id)])
        if verification_link_hash is not None:
            return _Q([u for u in cls.store if u.verification_link_hash == verification_link_hash])
        return _Q([u for u in cls.store if u.email.lower() == (email__iexact or '').lower()])


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
                   EMAIL_DELIVERY_CONFIGURED=True, FRONTEND_URL='http://localhost:3000')
class PasswordResetTests(TestCase):
    def setUp(self):
        FakeUser.store = []
        cache.clear()
        for target in ('api.views.User',):
            p = mock.patch(target, FakeUser)
            p.start()
            self.addCleanup(p.stop)
        self.client = APIClient()
        self.user = FakeUser(password=hash_password(STRONG)).save()

    def _forgot(self, email='ada@example.com'):
        return self.client.post('/api/auth/forgot-password/', {'email': email}, format='json')

    def _link(self):
        m = re.search(r'/auth/reset-password\?token=([\w-]+)&uid=([\w-]+)', mail.outbox[-1].body)
        return m.group(1), m.group(2)

    def _reset(self, token, uid, pw=NEW_STRONG):
        return self.client.post('/api/auth/reset-password/', {'uid': uid, 'token': token, 'new_password': pw},
                                format='json')

    def _login(self, pw):
        return self.client.post('/api/auth/login/', {'email': 'ada@example.com', 'password': pw}, format='json')

    # ── forgot-password ──
    def test_generic_response_for_known_and_unknown(self):
        known = self._forgot()
        unknown = self._forgot('ghost@example.com')
        self.assertEqual(known.status_code, 200)
        self.assertEqual(unknown.status_code, 200)
        self.assertEqual(known.data, unknown.data)
        self.assertEqual(len(mail.outbox), 1)   # only the real account gets mail

    def test_email_contains_branded_reset_link(self):
        self._forgot()
        msg = mail.outbox[-1]
        html = msg.alternatives[0][0]
        self.assertIn('PASSPHRASE RESET', html)
        self.assertIn('Inspector Crit', html)
        self.assertIn('/images/inspector-crit.png', html)
        token, uid = self._link()
        self.assertEqual(urlsafe_base64_decode(uid).decode(), str(self.user.id))
        self.assertNotEqual(self.user.password_reset_hash, token)   # only HMAC stored

    def test_invalid_email_format(self):
        self.assertEqual(self._forgot('nope').status_code, 400)

    def test_per_account_cooldown(self):
        self._forgot()
        self._forgot()
        self.assertEqual(len(mail.outbox), 1)
        self.user.password_reset_sent_at = ev._now() - timedelta(minutes=2)
        self._forgot()
        self.assertEqual(len(mail.outbox), 2)

    def test_send_failure_still_generic(self):
        with mock.patch('api.password_reset.send_mail', side_effect=OSError('smtp down')):
            res = self._forgot()
        self.assertEqual(res.status_code, 200)

    # ── reset-password ──
    def test_successful_reset_uses_pbkdf2_and_allows_login(self):
        self._forgot()
        token, uid = self._link()
        res = self._reset(token, uid)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(self.user.password.startswith('pbkdf2_sha256$'))
        self.assertIsNone(self.user.password_reset_hash)
        self.assertEqual(self._login(STRONG).status_code, 401)
        self.assertEqual(self._login(NEW_STRONG).status_code, 200)

    def test_token_is_single_use(self):
        self._forgot()
        token, uid = self._link()
        self._reset(token, uid)
        again = self._reset(token, uid, 'Another$Pass1')
        self.assertEqual(again.data['code'], 'invalid_link')

    def test_new_request_invalidates_old_link(self):
        self._forgot()
        old_token, uid = self._link()
        self.user.password_reset_sent_at = ev._now() - timedelta(minutes=2)
        self._forgot()
        self.assertEqual(self._reset(old_token, uid).data['code'], 'invalid_link')

    def test_expired_token(self):
        self._forgot()
        token, uid = self._link()
        self.user.password_reset_expires_at = ev._now() - timedelta(seconds=1)
        self.assertEqual(self._reset(token, uid).data['code'], 'expired')

    def test_tampered_token_or_uid(self):
        self._forgot()
        token, uid = self._link()
        self.assertEqual(self._reset(token[:-2] + 'xx', uid).data['code'], 'invalid_link')
        self.assertEqual(self._reset(token, 'bm90LWFuLWlk').data['code'], 'invalid_link')
        self.assertEqual(self._reset('', '').data['code'], 'invalid_link')

    def test_weak_new_password_rejected(self):
        self._forgot()
        token, uid = self._link()
        old_hash = self.user.password
        res = self._reset(token, uid, 'weakpass')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['code'], 'weak_password')
        self.assertEqual(self.user.password, old_hash)
        self.assertIsNotNone(self.user.password_reset_hash)   # token still usable

    def test_reset_verifies_unverified_account(self):
        self.user.account_status = 'unverified'
        self._forgot()
        token, uid = self._link()
        self._reset(token, uid)
        self.assertEqual(self.user.account_status, 'active')

    # ── hashing ──
    def test_legacy_sha256_login_upgrades_hash(self):
        self.user.password = hashlib.sha256(STRONG.encode()).hexdigest()
        res = self._login(STRONG)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(self.user.password.startswith('pbkdf2_sha256$'))
        self.assertEqual(self._login(STRONG).status_code, 200)   # still works after upgrade

    def test_registration_hashes_with_pbkdf2(self):
        self.assertTrue(hash_password('x').startswith('pbkdf2_sha256$'))

    # ── error surfacing ──
    @override_settings(DEBUG=True)
    def test_smtp_failure_returns_json_500_in_debug(self):
        with mock.patch('api.password_reset.send_mail', side_effect=OSError('smtp down')):
            res = self._forgot()
        self.assertEqual(res.status_code, 500)
        self.assertEqual(res.json()['detail'], 'Failed to send reset email. Check SMTP settings.')

    def test_unhandled_errors_are_json(self):
        with mock.patch('api.views.ForgotPasswordThrottle.allow_request', side_effect=RuntimeError('boom')):
            res = self._forgot()
        self.assertEqual(res.status_code, 500)
        self.assertEqual(res['Content-Type'], 'application/json')
        self.assertIn('detail', res.json())

    # ── complexity engine & reuse prevention ──
    def test_reset_rejects_current_password(self):
        self._forgot()
        token, uid = self._link()
        res = self._reset(token, uid, STRONG)   # same as current
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['code'], 'password_reused')
        self.assertEqual(res.data['error'], 'New passphrase cannot be the same as your previous passphrase.')
        self.assertIsNotNone(self.user.password_reset_hash)   # link still usable

    def test_reset_rejects_reuse_of_legacy_sha256_password(self):
        self.user.password = hashlib.sha256(STRONG.encode()).hexdigest()
        self._forgot()
        token, uid = self._link()
        self.assertEqual(self._reset(token, uid, STRONG).data['code'], 'password_reused')

    def test_common_passwords_rejected(self):
        self._forgot()
        token, uid = self._link()
        for pw in ('Password123!', 'Qwerty123!'):
            res = self._reset(token, uid, pw)
            self.assertEqual(res.status_code, 400, pw)
            self.assertIn(ev.COMMON_PASSWORD_LABEL, res.data['password_requirements'])

    def test_extended_special_characters_accepted(self):
        for pw in ('Sleuth#Case2026', 'Sleuth^Case2026', 'Sleuth[Case]26', 'Sleuth_Case2026'):
            self.assertEqual(ev.password_policy_errors(pw), [], pw)
        self.assertIn(f'a special character ({ev.PASSWORD_SPECIALS})', ev.password_policy_errors('Sleuth~Case2026'))
