from django.contrib import admin
from .models import LoginAttempt, TokenBlacklistMetadata


@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    list_display = ['username', 'status', 'user', 'ip_address', 'failure_reason', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['username', 'user__username', 'ip_address']
    readonly_fields = ['created_at']
    ordering = ['-created_at']


@admin.register(TokenBlacklistMetadata)
class TokenBlacklistMetadataAdmin(admin.ModelAdmin):
    list_display = ['user', 'token_jti', 'reason', 'ip_address', 'blacklisted_at']
    list_filter = ['reason', 'blacklisted_at']
    search_fields = ['user__username', 'token_jti', 'ip_address']
    readonly_fields = ['blacklisted_at']
    ordering = ['-blacklisted_at']