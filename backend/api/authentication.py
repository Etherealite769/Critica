import jwt
from rest_framework import authentication, exceptions
from django.conf import settings
from .models import User # Ensure this imports your User model

class CustomJWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None # No header, let other auth methods try

        try:
            # Assumes header is "Bearer <token>"
            token = auth_header.split(' ')[1]
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            
            # Find the user based on the email we stored in the token
            email = payload.get('email')
            if not email:
                raise exceptions.AuthenticationFailed('Invalid token payload')
            user = User.objects(email=email).first() or User.objects(email__iexact=email).first()
            if not user:
                raise exceptions.AuthenticationFailed('User not found')
            return (user, None)
        except exceptions.AuthenticationFailed:
            raise
        except Exception:
            raise exceptions.AuthenticationFailed('Invalid or expired token')

    def authenticate_header(self, request):
        return 'Bearer'