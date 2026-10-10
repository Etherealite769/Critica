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
from datetime import datetime
import hashlib
import json

def hash_password(password):
    """Simple password hashing - use a proper library in production"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, hashed_password):
    """Verify password against hash"""
    return hash_password(password) == hashed_password

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
            'last_name': user.last_name
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
                'error': 'Password must contain ' + ', '.join(unmet),
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
