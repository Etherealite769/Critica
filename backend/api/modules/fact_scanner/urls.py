# backend/api/modules/fact_scanner/urls.py
from django.urls import path
from .views import (
    NodeLoadView,
    EvaluateSentenceView,
    FeedbackView,
    MasteryView,
)

urlpatterns = [
    path('<str:node_id>/',
         NodeLoadView.as_view()),
    path('<str:node_id>/evaluate-sentence/',
         EvaluateSentenceView.as_view()),
    path('<str:node_id>/feedback/',
         FeedbackView.as_view()),
    path('<str:node_id>/mastery/',
         MasteryView.as_view()),
]