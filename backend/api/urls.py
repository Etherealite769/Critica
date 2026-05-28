from django.urls import path
from .views import api_root, register, login, get_progression

urlpatterns = [
    path('', api_root, name='api_root'),
    path('auth/register/', register, name='register'),
    path('auth/login/', login, name='login'),
    path('progression/', get_progression, name='get_progression'),
]
