from django.urls import path, include
from .views import api_root, register, login, check_email, verify_email, resend_verification

urlpatterns = [
    path('', api_root, name='api_root'),
    path('auth/register/', register, name='register'),
    path('auth/login/', login, name='login'),
    path('auth/check-email/', check_email, name='check_email'),
    path('auth/verify-email/', verify_email, name='verify_email'),
    path('auth/resend-verification/', resend_verification, name='resend_verification'),

    # new routes — add these
    path('progression/',
         include('api.progression.urls')),
    path('lexical/',
         include('api.lexical.urls')),
    path('nodes/logic-thread/',
         include('api.modules.logic_thread.urls')),
    path('nodes/snap-gap/',
         include('api.modules.snap_gap.urls')),
    path('nodes/tap-clues/',
         include('api.modules.tap_clues.urls')),
    path('nodes/fact-scanner/',
         include('api.modules.fact_scanner.urls')),
    path('ai/',
         include('api.ai.urls')),
]