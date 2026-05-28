# backend/api/progression/urls.py
from django.urls import path
from .views import DashboardView, ModuleNodesView

urlpatterns = [
    path('dashboard/',
         DashboardView.as_view()),
    path('modules/<str:module_key>/nodes/',
         ModuleNodesView.as_view()),
]