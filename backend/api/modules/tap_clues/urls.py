# backend/api/modules/tap_clues/urls.py
from django.urls import path
from .views import (
    NodeLoadView,
    EvaluateClueView,
    FeedbackView,
    MasteryView,
)

urlpatterns = [
    path('<str:node_id>/',
         NodeLoadView.as_view()),
    path('<str:node_id>/evaluate-clue/',
         EvaluateClueView.as_view()),
    path('<str:node_id>/feedback/',
         FeedbackView.as_view()),
    path('<str:node_id>/mastery/',
         MasteryView.as_view()),
]