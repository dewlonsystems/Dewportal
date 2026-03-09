from django.contrib import admin
from .models import LedgerEntry, LedgerAuditLog


@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    list_display = [
        'reference', 'user', 'amount', 'entry_type', 'balance_after',
        'source', 'transaction', 'created_at', 'is_finalized'
    ]
    list_filter = ['entry_type', 'source', 'created_at', 'is_finalized']
    search_fields = ['reference', 'user__username', 'user__email', 'description']
    readonly_fields = [
        'reference', 'transaction', 'user', 'amount', 'entry_type',
        'balance_after', 'description', 'source', 'is_finalized',
        'created_by', 'ip_address', 'created_at'
    ]
    ordering = ['-created_at']
    date_hierarchy = 'created_at'

    def has_delete_permission(self, request, obj=None):
        """
        CRITICAL: Prevent deletion of ledger entries in admin.
        """
        return False

    def has_change_permission(self, request, obj=None):
        """
        CRITICAL: Prevent modification of ledger entries in admin.
        """
        if obj and obj.is_finalized:
            return False
        return True


@admin.register(LedgerAuditLog)
class LedgerAuditLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'ledger_entry', 'user', 'ip_address', 'created_at']
    list_filter = ['action', 'created_at']
    search_fields = ['details', 'user__username', 'ledger_entry__reference']
    readonly_fields = ['created_at']
    ordering = ['-created_at']

    def has_delete_permission(self, request, obj=None):
        """
        Prevent deletion of audit logs.
        """
        return False

    def has_change_permission(self, request, obj=None):
        """
        Prevent modification of audit logs.
        """
        return False