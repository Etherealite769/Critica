from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import User
from .email_verification import (
    normalize_email,
    is_valid_email,
    password_policy_errors,
    password_policy_message,
    is_common_password,
    issue_verification_code,
    check_verification_code,
    mark_verified,
    hash_link_token,
    link_token_status,
    resend_cooldown_remaining,
    send_verification_email,
    CheckEmailThrottle,
    VerifyEmailThrottle,
    ResendVerificationThrottle,
)
from .password_reset import (
    issue_reset_token,
    send_password_reset_email,
    find_user_for_reset,
    complete_password_reset,
    reset_cooldown_active,
    ForgotPasswordThrottle,
    ResetPasswordThrottle,
)
from django.contrib.auth.hashers import make_password, check_password
from datetime import datetime
import hashlib
import hmac
import json

def hash_password(password):
    """Salted, slow hash via Django's configured hasher (PBKDF2 by default)."""
    return make_password(password)

def _is_legacy_sha256(hashed_password):
    """Accounts created before PBKDF2 store a bare 64-char SHA-256 hex digest."""
    return bool(hashed_password) and '$' not in hashed_password and len(hashed_password) == 64

def verify_password(password, hashed_password):
    """Verify against Django hashes, falling back to legacy unsalted SHA-256."""
    if not hashed_password:
        return False
    if _is_legacy_sha256(hashed_password):
        legacy = hashlib.sha256(password.encode()).hexdigest()
        return hmac.compare_digest(legacy, hashed_password)
    return check_password(password, hashed_password)

def generate_jwt_token(user_id):
    """Simple JWT token generation"""
    # For production, use proper JWT library
    import jwt
    from datetime import timedelta, datetime
    from django.conf import settings
    
    payload = {
        'user_id': str(user_id),
        'email': str(user_id),
        'exp': datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

def verify_jwt_token(token):
    """Verify JWT token and return email"""
    try:
        import jwt
        from django.conf import settings
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        return decoded.get('email')
    except Exception:
        return None

@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    return Response({
        'message': 'Welcome to the API',
        'status': 'success'
    })

def _auth_success_payload(user, message):
    """Login-style response: user summary + access token."""
    token = generate_jwt_token(user.email)
    return {
        'message': message,
        'user': {
            'id': str(user.id),
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'profile_picture': getattr(user, 'profile_picture', '') or '',
        },
        'tokens': {
            'access': token,
            'refresh': 'refresh_token_placeholder'
        }
    }

def _find_user_by_email(email):
    """Case-insensitive lookup (older accounts may have mixed-case emails)."""
    return User.objects(email__iexact=email).first()

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """
    User registration endpoint
    Expected data: {
        "first_name": "string",
        "last_name": "string",
        "email": "string",
        "password": "string",
        "password_confirm": "string"
    }
    Creates the account as 'unverified' and emails a 6-digit verification
    code. No tokens are issued until the code is confirmed via
    /auth/verify-email/.
    """
    try:
        data = request.data
        first_name = str(data.get('first_name') or '').strip()
        last_name = str(data.get('last_name') or '').strip()
        email = normalize_email(data.get('email'))
        password = data.get('password') or ''
        password_confirm = data.get('password_confirm') or ''

        # Validation
        if not all([first_name, last_name, email, password, password_confirm]):
            return Response({
                'error': 'All fields are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        if not is_valid_email(email):
            return Response({
                'error': 'Please enter a valid email address'
            }, status=status.HTTP_400_BAD_REQUEST)

        if password != password_confirm:
            return Response({
                'error': 'Passwords do not match'
            }, status=status.HTTP_400_BAD_REQUEST)

        unmet = password_policy_errors(password)
        if unmet:
            return Response({
                'error': password_policy_message(unmet),
                'password_requirements': unmet
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if email already exists
        if _find_user_by_email(email):
            return Response({
                'error': 'Cadet email is already registered in the Bureau database.',
                'code': 'email_taken'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Create user (unverified until the emailed code is confirmed)
        user = User(
            first_name=first_name,
            last_name=last_name,
            email=email,
            password=hash_password(password),
            account_status='unverified',
        )
        user.save()

        code, link_token = issue_verification_code(user)
        if not send_verification_email(user.email, code, user.first_name, link_token):
            # Roll back so the cadet can simply retry sign-up
            user.delete()
            return Response({
                'error': 'Failed to send clearance code to specified email address',
                'code': 'email_send_failed'
            }, status=status.HTTP_502_BAD_GATEWAY)

        return Response({
            'message': 'Registration successful. Verification code sent.',
            'status': 'unverified',
            'email': user.email,
            'email_sent': True,
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """
    User login endpoint
    Expected data: {
        "email": "string",
        "password": "string"
    }
    Unverified accounts get 403 with code 'email_unverified'.
    """
    try:
        data = request.data

        # Validation
        if not data.get('email') or not data.get('password'):
            return Response({
                'error': 'Email and password are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Find user
        user = _find_user_by_email(normalize_email(data['email']))

        if not user or not verify_password(data['password'], user.password):
            return Response({
                'error': 'Invalid email or password'
            }, status=status.HTTP_401_UNAUTHORIZED)

        # Transparent upgrade: re-hash legacy SHA-256 passwords with PBKDF2
        if _is_legacy_sha256(user.password):
            user.password = hash_password(data['password'])
            user.save()

        if not user.is_active:
            return Response({
                'error': 'User account is inactive'
            }, status=status.HTTP_401_UNAUTHORIZED)

        # Only reached with a correct password, so this doesn't leak account status
        if user.account_status == 'unverified':
            return Response({
                'error': 'Account pending verification. Check your email or resend verification link.',
                'code': 'email_unverified',
                'email': user.email,
            }, status=status.HTTP_403_FORBIDDEN)

        return Response(_auth_success_payload(user, 'Login successful'), status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
@throttle_classes([CheckEmailThrottle])
def check_email(request):
    """
    GET /api/auth/check-email/?email=<email>
    Returns { valid, available } for live sign-up feedback.
    """
    email = normalize_email(request.query_params.get('email'))
    if not is_valid_email(email):
        return Response({'valid': False, 'available': False}, status=status.HTTP_200_OK)
    try:
        available = _find_user_by_email(email) is None
    except Exception:
        return Response({'error': 'Could not check email right now'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response({'valid': True, 'available': available}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([VerifyEmailThrottle])
def verify_email(request):
    """
    POST /api/auth/verify-email/  { email, code }   (6-digit code)
                               or  { token }         (one-click email link)
    Activates the account and returns the same payload as login.
    """
    try:
        link_token = str(request.data.get('token') or '').strip()
        if link_token:
            user = User.objects(verification_link_hash=hash_link_token(link_token)).first()
            if not user or user.account_status != 'unverified':
                return Response({'error': 'This verification link is invalid or has already been used.', 'code': 'invalid_link'},
                                status=status.HTTP_400_BAD_REQUEST)
            if link_token_status(user) == 'expired':
                return Response({'error': 'This verification link has expired. Request a new one.', 'code': 'expired'},
                                status=status.HTTP_400_BAD_REQUEST)
            mark_verified(user)
            return Response(_auth_success_payload(user, 'Email verified'), status=status.HTTP_200_OK)

        email = normalize_email(request.data.get('email'))
        if not email and hasattr(request, 'user') and getattr(request.user, 'email', None):
            email = normalize_email(request.user.email)
        code = str(request.data.get('code') or '').strip()
        if not email or not code:
            return Response({'error': 'Email and verification code are required'},
                            status=status.HTTP_400_BAD_REQUEST)

        user = _find_user_by_email(email)
        if not user:
            return Response({'error': 'Invalid verification code', 'code': 'invalid'},
                            status=status.HTTP_400_BAD_REQUEST)
        if user.account_status != 'unverified':
            return Response({'error': 'This account is already verified. Please sign in.', 'code': 'already_verified'},
                            status=status.HTTP_400_BAD_REQUEST)

        result = check_verification_code(user, code)
        messages = {
            'invalid': 'Invalid verification code',
            'expired': 'This verification code has expired. Request a new one.',
            'too_many_attempts': 'Too many incorrect attempts. Request a new code.',
            'no_code': 'No active verification code. Request a new one.',
        }
        if result != 'ok':
            return Response({'error': messages[result], 'code': result}, status=status.HTTP_400_BAD_REQUEST)

        mark_verified(user)
        return Response(_auth_success_payload(user, 'Email verified'), status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ResendVerificationThrottle])
def resend_verification(request):
    """
    POST /api/auth/resend-verification/  { email }
    Sends a fresh code to an unverified account (60s cooldown per account).
    Responds generically when the email isn't a pending account.
    """
    try:
        email = normalize_email(request.data.get('email'))
        generic = {'message': 'If this account is pending verification, a new code has been sent.'}
        if not is_valid_email(email):
            return Response({'error': 'Please enter a valid email address'}, status=status.HTTP_400_BAD_REQUEST)

        user = _find_user_by_email(email)
        if not user or user.account_status != 'unverified':
            return Response(generic, status=status.HTTP_200_OK)

        wait = resend_cooldown_remaining(user)
        if wait:
            return Response({'error': f'Please wait {wait}s before requesting another code.', 'retry_after': wait},
                            status=status.HTTP_429_TOO_MANY_REQUESTS)

        code, link_token = issue_verification_code(user)
        if not send_verification_email(user.email, code, user.first_name, link_token):
            return Response({'error': 'Failed to send clearance code to specified email address', 'code': 'email_send_failed'},
                            status=status.HTTP_502_BAD_GATEWAY)
        return Response(generic, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

FORGOT_PASSWORD_GENERIC = 'If that cadet email is registered, a passphrase reset link is on its way.'

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ForgotPasswordThrottle])
def forgot_password(request):
    """
    POST /api/auth/forgot-password/  { email }
    Always answers 200 with the same message (no account enumeration).
    If the account exists, emails a single-use reset link (30 min expiry).
    """
    email = normalize_email(request.data.get('email'))
    if not is_valid_email(email):
        return Response({'error': 'Please enter a valid email address'}, status=status.HTTP_400_BAD_REQUEST)

    from django.conf import settings
    import logging
    log = logging.getLogger(__name__)

    sent = True
    try:
        user = _find_user_by_email(email)
        # Silently skip unknown/inactive accounts and rapid repeats (per-account cooldown)
        if user and user.is_active and not reset_cooldown_active(user):
            token = issue_reset_token(user)
            try:
                sent = send_password_reset_email(user, token)
            except Exception:
                log.exception('Password reset email failed for %s', email)
                sent = False
    except Exception:
        log.exception('forgot_password failed for %s', email)
        sent = False

    if not sent:
        # Development: surface SMTP problems. Production: stay generic so a mail
        # failure (which only happens for real accounts) can't reveal which
        # emails are registered.
        if settings.DEBUG:
            return Response({'detail': 'Failed to send reset email. Check SMTP settings.'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        log.error('Password reset email not delivered for %s (SMTP failure)', email)

    return Response({'message': FORGOT_PASSWORD_GENERIC}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ResetPasswordThrottle])
def reset_password(request):
    """
    POST /api/auth/reset-password/  { uid, token, new_password }
    Validates the link, enforces the password policy, stores a PBKDF2 hash and
    invalidates the token.
    """
    try:
        uid = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password') or ''

        user, err = find_user_for_reset(User, uid, token)
        if err == 'expired':
            return Response({'error': 'This reset link has expired. Request a new one.', 'code': 'expired'},
                            status=status.HTTP_400_BAD_REQUEST)
        if err:
            return Response({'error': 'This reset link is invalid or has already been used.', 'code': 'invalid_link'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Old password prevention — evaluated before anything is updated.
        # Django hashes go through check_password; legacy SHA-256 accounts
        # (not yet upgraded on login) are compared via verify_password.
        if _is_legacy_sha256(user.password):
            reused = verify_password(new_password, user.password)
        else:
            reused = check_password(new_password, user.password)
        if reused:
            return Response({
                'error': 'New passphrase cannot be the same as your previous passphrase.',
                'code': 'password_reused',
            }, status=status.HTTP_400_BAD_REQUEST)

        unmet = password_policy_errors(new_password)
        if unmet:
            return Response({
                'error': password_policy_message(unmet),
                'password_requirements': unmet,
                'code': 'weak_password',
            }, status=status.HTTP_400_BAD_REQUEST)

        complete_password_reset(user, hash_password(new_password))
        return Response({'message': 'Passphrase updated. You can now sign in.'}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_progression(request):
    """
    Get user's progression data (streak, XP, skill node progress)
    Required header: X-User-Email: <email>
    """
    try:
        # Extract email from custom header
        email = request.headers.get('X-User-Email', '')
        
        if not email:
            # Return default values if no email provided
            return Response({
                'streak': 0,
                'total_xp': 0,
                'skill_node_progress': []
            }, status=status.HTTP_200_OK)
        
        # Find user
        user = User.objects(email=email).first()
        
        if not user:
            # Return default values if user not found
            return Response({
                'streak': 0,
                'total_xp': 0,
                'skill_node_progress': []
            }, status=status.HTTP_200_OK)
        
        # Build skill node progress response
        skill_progress = []
        if user.skill_node_progress:
            for node in user.skill_node_progress:
                skill_progress.append({
                    'skill_node_id': node.skill_node_id,
                    'completed_exercises': node.completed_exercises,
                    'total_exercises': node.total_exercises,
                    'is_unlocked': node.is_unlocked,
                    'is_completed': node.is_completed
                })
        
        return Response({
            'streak': user.streak,
            'total_xp': user.total_xp,
            'skill_node_progress': skill_progress
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        # Return default values on error
        return Response({
            'streak': 0,
            'total_xp': 0,
            'skill_node_progress': []
        }, status=status.HTTP_200_OK)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def cadet_profile(request):
    """
    GET /api/auth/profile/
    Returns full cadet dossier info (name, email, verification status, streak, XP, rank).

    PUT / PATCH /api/auth/profile/
    Updates editable personnel fields (first_name, last_name).
    """
    user = request.user
    if request.method in ('PUT', 'PATCH'):
        data = request.data
        updated = False
        if 'first_name' in data:
            fn = str(data.get('first_name') or '').strip()
            if not fn:
                return Response({'error': 'First name cannot be empty.', 'field': 'first_name'},
                                status=status.HTTP_400_BAD_REQUEST)
            user.first_name = fn
            updated = True
        if 'last_name' in data:
            ln = str(data.get('last_name') or '').strip()
            if not ln:
                return Response({'error': 'Last name cannot be empty.', 'field': 'last_name'},
                                status=status.HTTP_400_BAD_REQUEST)
            user.last_name = ln
            updated = True
        if 'profile_picture' in data:
            pic = str(data.get('profile_picture') or '').strip()
            if len(pic) > 2_500_000:
                return Response({'error': 'Profile picture image is too large (max 2MB).'},
                                status=status.HTTP_400_BAD_REQUEST)
            user.profile_picture = pic
            updated = True
            try:
                from api.progression.mongo_models import StudentProfileDocument
                sp = StudentProfileDocument.objects(student_id=str(user.id)).first()
                if sp:
                    sp.profile_picture = pic
                    sp.save()
            except Exception:
                pass

        if updated:
            user.updated_at = datetime.utcnow()
            user.save()

    # Calculate progression metrics for the dossier
    streak = getattr(user, 'streak', 0)
    total_xp = getattr(user, 'total_xp', 0)
    level = 1
    rank_title = 'Novice Analyst (Level 1)'
    completed_count = 0
    try:
        from api.progression.services import ProgressionManagementService
        profile = ProgressionManagementService.get_or_create_profile(str(user.id), user.email)
        rank_info = ProgressionManagementService.calculate_rank_and_level(getattr(profile, 'total_xp', 0))
        streak = getattr(profile, 'streak_count', streak)
        total_xp = rank_info['total_xp']
        level = rank_info['level']
        rank_title = rank_info['rank_title']
        completed_count = len(getattr(profile, 'completed_nodes', []))
    except Exception:
        pass

    account_status = getattr(user, 'account_status', 'active') or 'active'
    is_verified = (account_status == 'active')

    return Response({
        'id': str(user.id),
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'profile_picture': getattr(user, 'profile_picture', '') or '',
        'account_status': account_status,
        'is_verified': is_verified,
        'created_at': user.created_at.isoformat() if getattr(user, 'created_at', None) else None,
        'streak': streak,
        'total_xp': total_xp,
        'level': level,
        'rank_title': rank_title,
        'completed_count': completed_count,
        'message': 'Personnel record updated successfully.' if request.method in ('PUT', 'PATCH') else None,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    POST /api/auth/change-password/
    Payload: { "current_password": "...", "new_password": "...", "confirm_password": "..." }
    Validates current password, enforces policy on new password, hashes and updates.
    """
    try:
        user = request.user
        current_password = request.data.get('current_password') or ''
        new_password = request.data.get('new_password') or ''
        confirm_password = request.data.get('confirm_password') or ''

        if not current_password or not new_password or not confirm_password:
            return Response({
                'error': 'Current passphrase, new passphrase, and confirmation are required.',
                'code': 'missing_fields'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 1. Verify current password
        if _is_legacy_sha256(user.password):
            current_valid = verify_password(current_password, user.password)
        else:
            current_valid = check_password(current_password, user.password)

        if not current_valid:
            return Response({
                'error': 'Current security passphrase is incorrect.',
                'code': 'invalid_current_password'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 2. Prevent reusing the existing password
        if new_password == current_password or verify_password(new_password, user.password):
            return Response({
                'error': 'New passphrase cannot be the same as your current passphrase.',
                'code': 'password_reused'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 3. Check confirmation match
        if new_password != confirm_password:
            return Response({
                'error': 'New passphrases do not match.',
                'code': 'passwords_mismatch'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 4. Check policy errors
        unmet = password_policy_errors(new_password)
        if unmet:
            return Response({
                'error': password_policy_message(unmet),
                'password_requirements': unmet,
                'code': 'weak_password'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 5. Check against common breached passwords
        if is_common_password(new_password):
            return Response({
                'error': 'This passphrase is too common. Please choose a more unique security key.',
                'code': 'common_password'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 6. Hash and save
        user.password = hash_password(new_password)
        user.updated_at = datetime.utcnow()
        user.save()

        return Response({
            'message': 'Security passphrase successfully updated.',
            'status': 'success'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_profile_verification(request):
    """
    POST /api/auth/send-verification/
    Dispatches a 6-digit clearance code to the authenticated cadet's email.
    """
    try:
        user = request.user
        if getattr(user, 'account_status', 'active') == 'active':
            return Response({
                'message': 'Your cadet clearance is already active and verified.',
                'already_verified': True
            }, status=status.HTTP_200_OK)

        wait = resend_cooldown_remaining(user)
        if wait:
            return Response({
                'error': f'Please wait {wait}s before requesting another clearance code.',
                'retry_after': wait
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        code, link_token = issue_verification_code(user)
        if not send_verification_email(user.email, code, user.first_name, link_token):
            return Response({
                'error': 'Failed to dispatch clearance code to your email address.',
                'code': 'email_send_failed'
            }, status=status.HTTP_502_BAD_GATEWAY)

        return Response({
            'message': f'Clearance code sent to {user.email}.',
            'email': user.email,
            'cooldown': 60
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
