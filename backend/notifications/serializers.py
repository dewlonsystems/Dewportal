from rest_framework import serializers
from .models import Notification, WebSocketConnection


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for notification data.
    """
    related_object_details = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'severity', 'title', 'message',
            'related_object_type', 'related_object_id', 'related_object_reference',
            'related_object_details', 'is_read', 'read_at', 'is_dismissed',
            'dismissed_at', 'data', 'action_url', 'delivered_via_websocket',
            'websocket_delivered_at', 'created_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'read_at', 'dismissed_at',
            'delivered_via_websocket', 'websocket_delivered_at'
        ]

    def get_related_object_details(self, obj):
        if obj.related_object_reference:
            return {
                'type': obj.related_object_type,
                'id': obj.related_object_id,
                'reference': obj.related_object_reference
            }
        return None


class NotificationCreateSerializer(serializers.Serializer):
    """
    Serializer for creating notifications.
    Internal use only - notifications are typically created via model methods.
    """
    user_id = serializers.IntegerField(required=True)
    notification_type = serializers.ChoiceField(choices=Notification.TYPE_CHOICES, required=True)
    severity = serializers.ChoiceField(choices=Notification.SEVERITY_CHOICES, default='info')
    title = serializers.CharField(max_length=200, required=True)
    message = serializers.CharField(required=True)
    related_object_id = serializers.IntegerField(required=False, allow_null=True)
    data = serializers.DictField(required=False, default=dict)
    action_url = serializers.CharField(max_length=500, required=False, allow_null=True)
    deliver_websocket = serializers.BooleanField(default=True)


class NotificationBulkUpdateSerializer(serializers.Serializer):
    """
    Serializer for bulk updating notifications (mark as read/dismiss).
    """
    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        max_length=100
    )
    action = serializers.ChoiceField(choices=['mark_read', 'dismiss'], required=True)


class WebSocketConnectionSerializer(serializers.ModelSerializer):
    """
    Serializer for WebSocket connection data.
    Admin only - monitoring purposes.
    """
    user_details = serializers.SerializerMethodField()

    class Meta:
        model = WebSocketConnection
        fields = [
            'id', 'user', 'user_details', 'channel_name', 'ip_address',
            'user_agent', 'is_active', 'last_heartbeat', 'disconnected_at',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_user_details(self, obj):
        if obj.user:
            return {
                'id': obj.user.id,
                'username': obj.user.username,
                'email': obj.user.email,
                'role': obj.user.role
            }
        return None