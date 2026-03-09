from django.urls import path
from core.views import DashboardView, SystemHealthView

app_name = 'core'

urlpatterns = [
    # Dashboard aggregation endpoint
    path('dashboard/', DashboardView.as_view(), name='dashboard'),

    # System health check (internal monitoring)
    path('health/', SystemHealthView.as_view(), name='system-health'),
]