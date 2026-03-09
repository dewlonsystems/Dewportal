from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils import timezone
from .models import CustomUser, PasswordResetRequest


@admin.register(CustomUser)
class UserAdmin(BaseUserAdmin):
    list_display = [
        'username',
        'email',
        'first_name',
        'last_name',
        'role',
        'is_active',
        'is_locked_display',
        'locked_until',
        'last_seen',
    ]

    list_filter = [
        'role',
        'is_active',
        'is_staff',
        'is_superuser',
        'must_change_password',
        'locked_until',
    ]

    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['-created_at']

    readonly_fields = [
        'last_login',
        'last_seen',
        'created_at',
        'updated_at',
        'password_changed_at',
    ]

    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {
            'fields': ('first_name', 'last_name', 'email', 'phone_number')
        }),
        ('Role & permissions', {
            'fields': (
                'role',
                'is_active',
                'is_staff',
                'is_superuser',
                'groups',
                'user_permissions',
            )
        }),
        ('Security', {
            'fields': (
                'temporary_password',
                'must_change_password',
                'failed_login_attempts',
                'locked_until',
                'password_changed_at',
            )
        }),
        ('Activity', {
            'fields': (
                'last_login',
                'last_seen',
                'created_at',
                'updated_at',
            )
        }),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'username',
                'email',
                'first_name',
                'last_name',
                'phone_number',
                'role',
                'password1',
                'password2',
                'is_active',
                'is_staff',
                'is_superuser',
            ),
        }),
    )

    @admin.display(boolean=True, description='Locked')
    def is_locked_display(self, obj):
        return obj.is_locked


@admin.register(PasswordResetRequest)
class PasswordResetRequestAdmin(admin.ModelAdmin):
    list_display = ['user', 'status', 'created_at', 'processed_by', 'processed_at']
    list_filter = ['status', 'created_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['processed_at', 'processed_by']