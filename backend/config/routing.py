from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from django.urls import re_path, path
from notifications.routing import websocket_urlpatterns
from notifications.consumers import NotificationConsumer, HealthCheckConsumer
import os

# WebSocket application configuration
application = ProtocolTypeRouter({
    # HTTP handled by Django
    "http": None,  # Handled by Django's WSGI/ASGI

    # WebSocket connections
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(
                websocket_urlpatterns + [
                    # Fallback patterns
                    re_path(r"ws/notifications/(?P<token>[^/]+)/$", NotificationConsumer.as_asgi()),
                    re_path(r"ws/health/$", HealthCheckConsumer.as_asgi()),
                ]
            )
        )
    ),
})