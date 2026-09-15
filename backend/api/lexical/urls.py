from django.urls import path
from .views import (
    LexicalDeckLogView,
    LexicalDeckListView,
    LexicalWordReviewView,
    LexicalDeckStatusView,
)

urlpatterns = [
    path('log/',    LexicalDeckLogView.as_view()),
    path('deck/',   LexicalDeckListView.as_view()),
    path('review/', LexicalWordReviewView.as_view()),
    path('status/', LexicalDeckStatusView.as_view()),
]