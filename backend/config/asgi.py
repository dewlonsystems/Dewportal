"""
ASGI config for Dewlon Portal.

This file configures the ASGI application for Django Channels.
It serves both HTTP requests and WebSocket connections.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from django.urls import re_path
from notifications.routing import websocket_urlpatterns

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Get Django ASGI application
django_asgi_app = get_asgi_application()

# Import consumers after Django setup
from notifications.consumers import NotificationConsumer, HealthCheckConsumer

# ASGI application with HTTP and WebSocket support
application = ProtocolTypeRouter({
    # HTTP requests handled by Django
    "http": django_asgi_app,

    # WebSocket connections handled by Channels
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