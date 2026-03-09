from django.contrib import admin
from .models import Transaction, PaymentProviderConfig


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = [
        'reference', 'user', 'amount', 'payment_method', 'status',
        'mpesa_receipt_number', 'created_at', 'callback_received_at'
    ]
    list_filter = ['status', 'payment_method', 'created_at']
    search_fields = ['reference', 'provider_reference', 'user__username', 'user__email']
    readonly_fields = [
        'reference', 'provider_reference', 'callback_received_at', 'callback_payload'
    ]
    ordering = ['-created_at']
    date_hierarchy = 'created_at'


@admin.register(PaymentProviderConfig)
class PaymentProviderConfigAdmin(admin.ModelAdmin):
    list_display = ['provider', 'is_active', 'updated_at']
    readonly_fields = ['updated_at']