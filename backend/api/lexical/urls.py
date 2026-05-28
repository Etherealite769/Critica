# backend/api/lexical/urls.py
from django.urls import path
from .views import (
    LexicalDeckLogView,
    LexicalDeckListView,
)

urlpatterns = [
    path('log/',  LexicalDeckLogView.as_view()),
    path('deck/', LexicalDeckListView.as_view()),
]