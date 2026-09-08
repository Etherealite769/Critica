# backend/api/modules/snap_gap/urls.py
from django.urls import path
from .views import (
    NodeLoadView,
    EvaluateGapView,
    FeedbackView,
    MasteryView,
)

urlpatterns = [
    path('<str:node_id>/',
         NodeLoadView.as_view()),
    path('<str:node_id>/evaluate-gap/',
         EvaluateGapView.as_view()),
    path('<str:node_id>/feedback/',
         FeedbackView.as_view()),
    path('<str:node_id>/mastery/',
         MasteryView.as_view()),
]