# backend/api/progression/urls.py
from django.urls import path
from .views import DashboardView, ModuleNodesView, NodeResetView

urlpatterns = [
    path('dashboard/',
         DashboardView.as_view()),
    path('modules/<str:module_key>/nodes/',
         ModuleNodesView.as_view()),
    path('reset/',
         NodeResetView.as_view()),
]