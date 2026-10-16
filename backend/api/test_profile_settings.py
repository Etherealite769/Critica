# backend/api/test_profile_settings.py
from datetime import datetime, timedelta
from unittest import mock
from django.test import TestCase
from rest_framework.test import APIClient
from api.views import hash_password, generate_jwt_token


class _FakeQuery:
    def __init__(self, items):
        self._items = items

    def first(self):
        return self._items[0] if self._items else None


class FakeUser:
    store: list = []
    _next_id = 1

    def __init__(self, **kw):
        self.id = kw.get('id', None)
        self.first_name = kw.get('first_name', '')
        self.last_name = kw.get('last_name', '')
        self.email = kw.get('email', '')
        self.password = kw.get('password', '')
        self.is_active = kw.get('is_active', True)
        self.account_status = kw.get('account_status', 'active')
        self.profile_picture = kw.get('profile_picture', '')
        self.streak = kw.get('streak', 3)
        self.total_xp = kw.get('total_xp', 150)
        self.created_at = kw.get('created_at', datetime.utcnow())
        self.updated_at = kw.get('updated_at', datetime.utcnow())
        self.verification_code_hash = None
        self.verification_link_hash = None
        self.verification_expires_at = None
        self.verification_attempts = 0
        self.verification_sent_at = None

    def save(self):
        if self.id is None:
            self.id = FakeUser._next_id
            FakeUser._next_id += 1
        if self not in FakeUser.store:
            FakeUser.store.append(self)
        return self

    @property
    def is_authenticated(self):
        return True

    @classmethod
    def objects(cls, email=None, email__iexact=None, **_):
        target = (email or email__iexact or '').lower()
        matches = [u for u in cls.store if u.email.lower() == target]
        return _FakeQuery(matches)

    @classmethod
    def reset(cls):
        cls.store = []
        cls._next_id = 1


class ProfileSettingsTests(TestCase):
    def setUp(self):
        FakeUser.reset()
        self.user = FakeUser(
            id=101,
            first_name='Sherlock',
            last_name='Holmes',
            email='sherlock@bureau.test',
            password=hash_password('Elementary1@'),
            account_status='unverified',
            streak=5,
            total_xp=250,
        )
        self.user.save()
        self.token = generate_jwt_token(self.user.email)
        self.client = APIClient()

    def test_get_profile_unauthenticated(self):
        res = self.client.get('/api/auth/profile/')
        self.assertEqual(res.status_code, 401)

    @mock.patch('api.authentication.User', FakeUser)
    @mock.patch('api.views.User', FakeUser)
    def test_get_profile_authenticated(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res = self.client.get('/api/auth/profile/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['email'], 'sherlock@bureau.test')
        self.assertEqual(res.data['first_name'], 'Sherlock')
        self.assertEqual(res.data['last_name'], 'Holmes')
        self.assertEqual(res.data['account_status'], 'unverified')
        self.assertFalse(res.data['is_verified'])

    @mock.patch('api.authentication.User', FakeUser)
    @mock.patch('api.views.User', FakeUser)
    def test_update_profile_names(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res = self.client.put('/api/auth/profile/', {
            'first_name': 'Mycroft',
            'last_name': 'Holmes',
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['first_name'], 'Mycroft')
        self.assertEqual(self.user.first_name, 'Mycroft')

    @mock.patch('api.authentication.User', FakeUser)
    @mock.patch('api.views.User', FakeUser)
    def test_update_profile_empty_name_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res = self.client.put('/api/auth/profile/', {
            'first_name': '   ',
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('first_name', res.data.get('field', ''))

    @mock.patch('api.authentication.User', FakeUser)
    @mock.patch('api.views.User', FakeUser)
    def test_update_profile_picture(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res = self.client.put('/api/auth/profile/', {
            'profile_picture': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['profile_picture'].startswith('data:image/png'))
        self.assertEqual(self.user.profile_picture, res.data['profile_picture'])

    @mock.patch('api.authentication.User', FakeUser)
    @mock.patch('api.views.User', FakeUser)
    def test_change_password_success(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res = self.client.post('/api/auth/change-password/', {
            'current_password': 'Elementary1@',
            'new_password': 'NewPassword2#',
            'confirm_password': 'NewPassword2#',
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'success')

    @mock.patch('api.authentication.User', FakeUser)
    @mock.patch('api.views.User', FakeUser)
    def test_change_password_invalid_current(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res = self.client.post('/api/auth/change-password/', {
            'current_password': 'WrongPassword1@',
            'new_password': 'NewPassword2#',
            'confirm_password': 'NewPassword2#',
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data.get('code'), 'invalid_current_password')

    @mock.patch('api.authentication.User', FakeUser)
    @mock.patch('api.views.User', FakeUser)
    def test_change_password_reused(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res = self.client.post('/api/auth/change-password/', {
            'current_password': 'Elementary1@',
            'new_password': 'Elementary1@',
            'confirm_password': 'Elementary1@',
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data.get('code'), 'password_reused')

    @mock.patch('api.authentication.User', FakeUser)
    @mock.patch('api.views.User', FakeUser)
    def test_change_password_mismatched_confirm(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res = self.client.post('/api/auth/change-password/', {
            'current_password': 'Elementary1@',
            'new_password': 'NewPassword2#',
            'confirm_password': 'MismatchPassword2#',
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data.get('code'), 'passwords_mismatch')

    @mock.patch('api.authentication.User', FakeUser)
    @mock.patch('api.views.User', FakeUser)
    def test_change_password_weak_policy(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res = self.client.post('/api/auth/change-password/', {
            'current_password': 'Elementary1@',
            'new_password': 'short',
            'confirm_password': 'short',
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data.get('code'), 'weak_password')

    @mock.patch('api.authentication.User', FakeUser)
    @mock.patch('api.views.User', FakeUser)
    @mock.patch('api.views.send_verification_email', return_value=True)
    def test_send_profile_verification(self, mock_send):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res = self.client.post('/api/auth/send-verification/', format='json')
        self.assertEqual(res.status_code, 200)
        self.assertIn('sherlock@bureau.test', res.data['message'])
        self.assertTrue(mock_send.called)
