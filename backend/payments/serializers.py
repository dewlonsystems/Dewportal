from rest_framework import serializers
from django.core.exceptions import ValidationError
from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    """
    Serializer for transaction data.
    Used for transaction listing and detail views.
    """
    user_details = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            'id', 'reference', 'provider_reference', 'user', 'user_details',
            'amount', 'payment_method', 'status', 'description',
            'mpesa_phone_number', 'mpesa_receipt_number',
            'paystack_authorization_url', 'created_at', 'callback_received_at'
        ]
        read_only_fields = [
            'id', 'reference', 'provider_reference', 'status',
            'created_at', 'callback_received_at'
        ]

    def get_user_details(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'first_name': obj.user.first_name,
            'last_name': obj.user.last_name,
            'email': obj.user.email
        }


class TransactionInitiateSerializer(serializers.Serializer):
    """
    Serializer for initiating a transaction.
    """
    payment_method = serializers.ChoiceField(choices=['mpesa', 'paystack'])
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=1)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        payment_method = attrs.get('payment_method')
        phone_number = attrs.get('phone_number')

        # Phone number required for Mpesa
        if payment_method == 'mpesa' and not phone_number:
            raise serializers.ValidationError({
                'phone_number': 'Phone number is required for Mpesa payments.'
            })

        # Validate phone number format for Mpesa
        if payment_method == 'mpesa' and phone_number:
            import re
            if not re.match(r'^\+?[\d\s-]{10,15}$', phone_number):
                raise serializers.ValidationError({
                    'phone_number': 'Invalid phone number format.'
                })

        # Validate amount
        if attrs.get('amount') < 1:
            raise serializers.ValidationError({
                'amount': 'Minimum amount is 1 KES.'
            })

        return attrs


class MpesaCallbackSerializer(serializers.Serializer):
    """
    Serializer for Mpesa callback payload.
    """
    Body = serializers.DictField(required=True)


class PaystackWebhookSerializer(serializers.Serializer):
    """
    Serializer for Paystack webhook payload.
    """
    event = serializers.CharField(required=True)
    data = serializers.DictField(required=True)