from rest_framework import serializers
from .models import AuditLog, UserSession


class AuditLogSerializer(serializers.ModelSerializer):
    """
    Serializer for audit log data.
    Read-only - audit logs cannot be modified.
    """
    user_details = serializers.SerializerMethodField()
    related_object_details = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_details', 'action_type', 'severity', 'category',
            'description', 'details', 'related_object_type', 'related_object_id',
            'related_object_reference', 'related_object_details', 'ip_address',
            'user_agent', 'request_method', 'request_path', 'session_id',
            'server_hostname', 'is_finalized', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'action_type', 'severity', 'category', 'description',
            'details', 'ip_address', 'user_agent', 'request_method', 'request_path',
            'session_id', 'server_hostname', 'is_finalized', 'created_at', 'updated_at'
        ]

    def get_user_details(self, obj):
        if obj.user:
            return {
                'id': obj.user.id,
                'username': obj.user.username,
                'email': obj.user.email,
                'first_name': obj.user.first_name,
                'last_name': obj.user.last_name,
                'role': obj.user.role
            }
        return None

    def get_related_object_details(self, obj):
        if obj.related_object_reference:
            return {
                'type': obj.related_object_type,
                'id': obj.related_object_id,
                'reference': obj.related_object_reference
            }
        return None


class AuditLogCursorPaginationSerializer(serializers.Serializer):
    """
    Serializer for cursor-paginated audit log response.
    """
    records = AuditLogSerializer(many=True, read_only=True)
    next_cursor = serializers.CharField(allow_null=True)
    previous_cursor = serializers.CharField(allow_null=True)
    has_more = serializers.BooleanField()
    limit = serializers.IntegerField()
    total_returned = serializers.IntegerField()


class UserSessionSerializer(serializers.ModelSerializer):
    """
    Serializer for user session data.
    """
    class Meta:
        model = UserSession
        fields = [
            'id', 'session_key', 'ip_address', 'user_agent', 'is_active',
            'last_activity', 'expires_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AuditLogFilterSerializer(serializers.Serializer):
    """
    Serializer for audit log filter parameters.
    """
    user_id = serializers.IntegerField(required=False)
    action_type = serializers.CharField(required=False)
    category = serializers.CharField(required=False)
    severity = serializers.CharField(required=False)
    date_from = serializers.DateTimeField(required=False)
    date_to = serializers.DateTimeField(required=False)
    search = serializers.CharField(required=False, allow_blank=True)
    cursor = serializers.CharField(required=False, allow_null=True)
    limit = serializers.IntegerField(required=False, default=20, min_value=1, max_value=100)