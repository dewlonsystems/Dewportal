from django.contrib import admin
from .models import Notification, WebSocketConnection


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'user', 'notification_type', 'severity',
        'is_read', 'delivered_via_websocket', 'created_at'
    ]
    list_filter = ['notification_type', 'severity', 'is_read', 'is_dismissed', 'created_at']
    search_fields = ['title', 'message', 'user__username', 'user__email']
    readonly_fields = [
        'user', 'notification_type', 'severity', 'title', 'message',
        'related_object_type', 'related_object_id', 'related_object_reference',
        'is_read', 'read_at', 'is_dismissed', 'dismissed_at',
        'delivered_via_websocket', 'websocket_delivered_at', 'data',
        'action_url', 'created_at'
    ]
    ordering = ['-created_at']
    date_hierarchy = 'created_at'

    def has_delete_permission(self, request, obj=None):
        """
        Allow deletion for notification management.
        """
        return True


@admin.register(WebSocketConnection)
class WebSocketConnectionAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'channel_name', 'ip_address', 'is_active',
        'last_heartbeat', 'created_at'
    ]
    list_filter = ['is_active', 'created_at', 'last_heartbeat']
    search_fields = ['user__username', 'channel_name', 'ip_address']
    readonly_fields = ['created_at', 'disconnected_at']
    ordering = ['-last_heartbeat']

    def has_delete_permission(self, request, obj=None):
        """
        Allow deletion for connection management.
        """
        return True