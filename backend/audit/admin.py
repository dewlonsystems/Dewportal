from django.contrib import admin
from .models import AuditLog, UserSession


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = [
        'action_type', 'severity', 'category', 'user', 'ip_address',
        'related_object_reference', 'created_at'
    ]
    list_filter = ['action_type', 'severity', 'category', 'created_at']
    search_fields = [
        'description', 'details', 'user__username', 'user__email',
        'ip_address', 'related_object_reference'
    ]
    readonly_fields = [
        'user', 'action_type', 'severity', 'category', 'description',
        'details', 'related_object_type', 'related_object_id',
        'related_object_reference', 'ip_address', 'user_agent',
        'request_method', 'request_path', 'session_id', 'server_hostname',
        'is_finalized', 'created_at', 'updated_at'
    ]
    ordering = ['-created_at']
    date_hierarchy = 'created_at'

    def has_delete_permission(self, request, obj=None):
        """
        CRITICAL: Prevent deletion of audit logs in admin.
        """
        return False

    def has_change_permission(self, request, obj=None):
        """
        CRITICAL: Prevent modification of audit logs in admin.
        """
        if obj and obj.is_finalized:
            return False
        return True


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'session_key', 'ip_address', 'is_active', 'last_activity', 'expires_at']
    list_filter = ['is_active', 'last_activity', 'created_at']
    search_fields = ['user__username', 'session_key', 'ip_address']
    readonly_fields = ['created_at']
    ordering = ['-last_activity']

    def has_delete_permission(self, request, obj=None):
        """
        Allow deletion for session management (terminate sessions).
        """
        return True