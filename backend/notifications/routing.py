from django.urls import re_path
from .consumers import NotificationConsumer, HealthCheckConsumer

# WebSocket URL routing
websocket_urlpatterns = [
    # Main notification WebSocket (authenticated users)
    re_path(r'ws/notifications/(?P<token>[^/]+)/$', NotificationConsumer.as_asgi()),

    # Health check WebSocket (public)
    re_path(r'ws/health/$', HealthCheckConsumer.as_asgi()),
]