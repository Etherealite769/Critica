# backend/api/urls.py
from django.urls import path, include
from .views import RegisterView, LoginView, RefreshView

urlpatterns = [
    # Auth
    path('auth/register/', RegisterView.as_view()),
    path('auth/login/',    LoginView.as_view()),
    path('auth/refresh/',  RefreshView.as_view()),

    # Progression dashboard
    path('progression/',
         include('api.progression.urls')),

    # Lexical deck
    path('lexical/',
         include('api.lexical.urls')),

    # Module 1 — Logic Thread
    path('nodes/logic-thread/',
         include('api.modules.logic_thread.urls')),

    # Module 2 — Snap-in Gap
    path('nodes/snap-gap/',
         include('api.modules.snap_gap.urls')),

    # Module 3 — Tap the Clues
    path('nodes/tap-clues/',
         include('api.modules.tap_clues.urls')),

    # Module 4 — Fact Scanner
    path('nodes/fact-scanner/',
         include('api.modules.fact_scanner.urls')),
]