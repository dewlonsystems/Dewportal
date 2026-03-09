from rest_framework import serializers
from .models import LedgerEntry, LedgerAuditLog


class LedgerEntrySerializer(serializers.ModelSerializer):
    """
    Serializer for ledger entry data.
    Read-only - ledger entries cannot be modified.
    """
    user_details = serializers.SerializerMethodField()
    transaction_details = serializers.SerializerMethodField()
    created_by_details = serializers.SerializerMethodField()

    class Meta:
        model = LedgerEntry
        fields = [
            'id', 'reference', 'transaction', 'transaction_details', 'user', 'user_details',
            'amount', 'entry_type', 'balance_after', 'description', 'source',
            'is_finalized', 'created_by', 'created_by_details', 'ip_address', 'created_at'
        ]
        read_only_fields = [
            'id', 'reference', 'transaction', 'user', 'amount', 'entry_type',
            'balance_after', 'description', 'source', 'is_finalized',
            'created_by', 'ip_address', 'created_at'
        ]

    def get_user_details(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'email': obj.user.email,
            'first_name': obj.user.first_name,
            'last_name': obj.user.last_name
        }

    def get_transaction_details(self, obj):
        if obj.transaction:
            return {
                'id': obj.transaction.id,
                'reference': obj.transaction.reference,
                'payment_method': obj.transaction.payment_method,
                'status': obj.transaction.status
            }
        return None

    def get_created_by_details(self, obj):
        if obj.created_by:
            return {
                'id': obj.created_by.id,
                'username': obj.created_by.username
            }
        return None


class LedgerEntryCreateSerializer(serializers.Serializer):
    """
    Serializer for creating ledger entries.
    ONLY used internally from transaction completion.
    Not exposed via public API.
    """
    transaction_id = serializers.IntegerField(required=True)
    created_by = serializers.IntegerField(required=False)
    ip_address = serializers.IPAddressField(required=False)

    def validate(self, attrs):
        from payments.models import Transaction

        try:
            transaction = Transaction.objects.get(pk=attrs['transaction_id'])
        except Transaction.DoesNotExist:
            raise serializers.ValidationError({'transaction_id': 'Transaction not found.'})

        if transaction.status != 'completed':
            raise serializers.ValidationError({
                'transaction_id': 'Ledger entries can only be created for completed transactions.'
            })

        # Check if ledger entry already exists
        if hasattr(transaction, 'ledger_entry'):
            raise serializers.ValidationError({
                'transaction_id': 'Ledger entry already exists for this transaction.'
            })

        attrs['transaction'] = transaction
        return attrs


class LedgerAuditLogSerializer(serializers.ModelSerializer):
    """
    Serializer for ledger audit log data.
    """
    user_details = serializers.SerializerMethodField()
    ledger_entry_details = serializers.SerializerMethodField()

    class Meta:
        model = LedgerAuditLog
        fields = [
            'id', 'ledger_entry', 'ledger_entry_details', 'action', 'user',
            'user_details', 'details', 'ip_address', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_user_details(self, obj):
        if obj.user:
            return {
                'id': obj.user.id,
                'username': obj.user.username
            }
        return None

    def get_ledger_entry_details(self, obj):
        if obj.ledger_entry:
            return {
                'id': obj.ledger_entry.id,
                'reference': obj.ledger_entry.reference
            }
        return None