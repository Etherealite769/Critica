from django.urls import path
from .views import (
    LexicalDeckLogView,
    LexicalDeckListView,
    LexicalWordReviewView,
)

urlpatterns = [
    path('log/',    LexicalDeckLogView.as_view()),
    path('deck/',   LexicalDeckListView.as_view()),
    path('review/', LexicalWordReviewView.as_view()),
]