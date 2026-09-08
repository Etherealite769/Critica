# backend/api/ai/urls.py
from django.urls import path
from .views import (
    AIHealthCheckView,
    SessionLoadView,
    SessionRegenerateView,
    SessionEvaluateStepView,
    SessionFeedbackView,
    SessionLiveHintView,
    SessionMasteryView,
)

urlpatterns = [
    path('status/', AIHealthCheckView.as_view(), name='ai_health_check'),

    # Specific routes MUST come before the generic
    # <module>/<node_id> pattern below, since that pattern
    # will otherwise greedily match "session/<id>/mastery/"
    # as module=<id>, node_id="mastery" and route it to
    # SessionLoadView (GET-only), causing a 405 on POST.
    path('session/<str:session_id>/evaluate/<int:exercise_index>/', SessionEvaluateStepView.as_view(), name='ai_session_evaluate'),
    path('session/<str:session_id>/feedback/<int:exercise_index>/', SessionFeedbackView.as_view(), name='ai_session_feedback'),
    path('session/<str:session_id>/live-hint/<int:exercise_index>/', SessionLiveHintView.as_view(), name='ai_session_live_hint'),
    path('session/<str:session_id>/mastery/', SessionMasteryView.as_view(), name='ai_session_mastery'),
    path('session/<str:module>/<str:node_id>/regenerate/', SessionRegenerateView.as_view(), name='ai_session_regenerate'),

    # Generic load route last, since it will match any
    # two-segment path under session/
    path('session/<str:module>/<str:node_id>/', SessionLoadView.as_view(), name='ai_session_load'),
]