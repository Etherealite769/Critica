from django.urls import path, include
from .views import api_root, register, login

urlpatterns = [
    path('', api_root, name='api_root'),
    path('auth/register/', register, name='register'),
    path('auth/login/', login, name='login'),

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
]