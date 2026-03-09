from django.urls import path
from .views import (
    NotificationListView,
    NotificationDetailView,
    NotificationMarkAsReadView,
    NotificationMarkAllAsReadView,
    NotificationBulkUpdateView,
    NotificationSummaryView,
    WebSocketConnectionListView,
    WebSocketConnectionTerminateView
)

app_name = 'notifications'

urlpatterns = [
    # Notifications
    path('', NotificationListView.as_view(), name='notification-list'),
    path('<int:pk>/', NotificationDetailView.as_view(), name='notification-detail'),
    path('mark-read/', NotificationMarkAsReadView.as_view(), name='notification-mark-read'),
    path('mark-all-read/', NotificationMarkAllAsReadView.as_view(), name='notification-mark-all-read'),
    path('bulk-update/', NotificationBulkUpdateView.as_view(), name='notification-bulk-update'),
    path('summary/', NotificationSummaryView.as_view(), name='notification-summary'),

    # WebSocket connections (admin monitoring)
    path('websocket-connections/', WebSocketConnectionListView.as_view(), name='websocket-connection-list'),
    path('websocket-connections/<int:connection_id>/terminate/', WebSocketConnectionTerminateView.as_view(), name='websocket-connection-terminate'),
]