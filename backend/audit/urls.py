from django.urls import path
from .views import (
    AuditLogListView,
    AuditLogDetailView,
    AuditLogSummaryView,
    UserLastSeenView,
    UserSessionListView
)

app_name = 'audit'

urlpatterns = [
    # Audit logs with cursor pagination
    path('logs/', AuditLogListView.as_view(), name='audit-logs'),
    path('logs/<int:pk>/', AuditLogDetailView.as_view(), name='audit-log-detail'),

    # Summary statistics
    path('summary/', AuditLogSummaryView.as_view(), name='audit-summary'),

    # User last seen tracking
    path('users/last-seen/', UserLastSeenView.as_view(), name='user-last-seen'),

    # User session management
    path('sessions/', UserSessionListView.as_view(), name='user-sessions'),
]