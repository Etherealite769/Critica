from django.urls import path
from .views import api_root, register, login

urlpatterns = [
    path('', api_root, name='api_root'),
    path('auth/register/', register, name='register'),
    path('auth/login/', login, name='login'),
]
