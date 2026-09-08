# api/modules/logic_thread/urls.py
from django.urls import path
from .views import (
    NodeLoadView,
    EvaluateConnectionView,
    FeedbackView,
    MasteryView,
)

urlpatterns = [
    path('<str:node_id>/',
         NodeLoadView.as_view()),
    path('<str:node_id>/evaluate-connection/',
         EvaluateConnectionView.as_view()),
    path('<str:node_id>/feedback/',
         FeedbackView.as_view()),
    path('<str:node_id>/mastery/',
         MasteryView.as_view()),
]