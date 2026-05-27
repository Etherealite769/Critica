from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import User
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

@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    return Response({
        'message': 'Welcome to the API',
        'status': 'success'
    })

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
    """
    try:
        data = request.data
        
        # Validation
        if not all([data.get('first_name'), data.get('last_name'), 
                   data.get('email'), data.get('password'), 
                   data.get('password_confirm')]):
            return Response({
                'error': 'All fields are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if data['password'] != data['password_confirm']:
            return Response({
                'error': 'Passwords do not match'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if email already exists
        if User.objects(email=data['email']).first():
            return Response({
                'error': 'Email already registered'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create user
        user = User(
            first_name=data['first_name'],
            last_name=data['last_name'],
            email=data['email'],
            password=hash_password(data['password'])
        )
        user.save()
        
        # Generate token
        token = generate_jwt_token(user.email)
        
        return Response({
            'message': 'Registration successful',
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
    """
    try:
        data = request.data
        
        # Validation
        if not data.get('email') or not data.get('password'):
            return Response({
                'error': 'Email and password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find user
        user = User.objects(email=data['email']).first()
        
        if not user or not verify_password(data['password'], user.password):
            return Response({
                'error': 'Invalid email or password'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not user.is_active:
            return Response({
                'error': 'User account is inactive'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Generate token
        token = generate_jwt_token(user.email)
        
        return Response({
            'message': 'Login successful',
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
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
