import secrets
import string
from django.db import models
from django.conf import settings
from core.models import TimeStampedModel, SoftDeleteModel


class TransactionManager(models.Manager):
    """
    Custom manager for Transaction model.
    Provides methods for transaction queries and statistics.
    """

    def generate_reference(self):
        """
        Generate unique transaction reference code.
        Format: DP followed by 8 alphanumeric characters (e.g., DP5TG20VG1)
        """
        chars = string.ascii_uppercase + string.digits
        while True:
            random_part = ''.join(secrets.choice(chars) for _ in range(8))
            reference = f"DP{random_part}"
            if not self.filter(reference=reference).exists():
                return reference

    def get_total_revenue(self, user=None):
        """
        Get total revenue from completed transactions.
        """
        from django.db.models import Sum
        queryset = self.filter(status='completed')
        if user:
            queryset = queryset.filter(user=user)
        result = queryset.aggregate(total=Sum('amount'))
        return result['total'] or 0

    def get_transaction_count(self, status=None, user=None):
        """
        Get transaction count with optional filters.
        """
        queryset = self.all()
        if status:
            queryset = queryset.filter(status=status)
        if user:
            queryset = queryset.filter(user=user)
        return queryset.count()


class Transaction(TimeStampedModel, SoftDeleteModel):
    """
    Transaction model for all payment transactions (Mpesa and Paystack).
    
    Immutable financial record - once created, only status can change
    via legitimate payment provider callbacks/webhooks.
    """

    PAYMENT_METHOD_CHOICES = [
        ('mpesa', 'Mpesa'),
        ('paystack', 'Paystack'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    # Transaction identification
    reference = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="Internal transaction reference (e.g., DP5TG20VG1)"
    )
    provider_reference = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        db_index=True,
        help_text="Payment provider's reference code (Mpesa MerchantRequestID or Paystack reference)"
    )

    # User and amount
    user = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.PROTECT,
        related_name='transactions',
        help_text="User who initiated the transaction."
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Transaction amount in KES."
    )

    # Payment details
    payment_method = models.CharField(
        max_length=10,
        choices=PAYMENT_METHOD_CHOICES,
        db_index=True,
        help_text="Payment method used."
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True,
        help_text="Transaction status."
    )

    # Mpesa specific fields
    mpesa_phone_number = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        help_text="Phone number for Mpesa transactions."
    )
    mpesa_checkout_request_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        db_index=True,
        help_text="Mpesa CheckoutRequestID from STK Push."
    )
    mpesa_response_description = models.TextField(
        blank=True,
        null=True,
        help_text="Mpesa response description or failure reason."
    )
    mpesa_receipt_number = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Mpesa transaction receipt number (upon completion)."
    )

    # Paystack specific fields
    paystack_access_code = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Paystack access code for redirect checkout."
    )
    paystack_authorization_url = models.URLField(
        blank=True,
        null=True,
        help_text="Paystack authorization URL for redirect checkout."
    )

    # Metadata
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Transaction description or purpose."
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional transaction metadata."
    )

    # Callback/Webhook tracking
    callback_received_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when callback/webhook was received."
    )
    callback_payload = models.JSONField(
        default=dict,
        blank=True,
        help_text="Raw callback/webhook payload for audit."
    )

    objects = TransactionManager()

    class Meta:
        db_table = 'transactions'
        verbose_name = 'Transaction'
        verbose_name_plural = 'Transactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['reference']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['payment_method', 'status']),
            models.Index(fields=['created_at', 'status']),
            models.Index(fields=['provider_reference']),
        ]
        constraints = [
            # Ensure amount is positive
            models.CheckConstraint(
                condition=models.Q(amount__gt=0),
                name='positive_amount'
            ),
        ]

    def __str__(self):
        return f"{self.reference} - {self.user.username} - {self.amount} KES"

    def save(self, *args, **kwargs):
        """
        Generate reference on creation if not provided.
        """
        if not self.reference:
            self.reference = Transaction.objects.generate_reference()
        super().save(*args, **kwargs)

    def can_transition_to(self, new_status):
        """
        Validate permitted status transitions.
        
        Allowed transitions:
        - pending -> completed
        - pending -> failed
        - pending -> cancelled
        - completed -> refunded (future)
        
        All other transitions are rejected to maintain ledger integrity.
        """
        allowed_transitions = {
            'pending': ['completed', 'failed', 'cancelled'],
            'completed': ['refunded'],  # Future feature
            'failed': [],
            'cancelled': [],
        }
        return new_status in allowed_transitions.get(self.status, [])

    def update_status(self, new_status, callback_payload=None, provider_reference=None):
        """
        Update transaction status with validation.
        Only allowed via legitimate callbacks/webhooks.
        """
        import logging
        logger = logging.getLogger('payments')

        if not self.can_transition_to(new_status):
            logger.warning(
                f"Invalid status transition for {self.reference}: "
                f"{self.status} -> {new_status}"
            )
            raise ValueError(f"Invalid status transition from {self.status} to {new_status}")

        self.status = new_status
        if callback_payload:
            self.callback_payload = callback_payload
            self.callback_received_at = timezone.now()
        if provider_reference:
            self.provider_reference = provider_reference

        self.save(update_fields=['status', 'callback_payload', 'callback_received_at', 'provider_reference'])

        logger.info(f"Transaction {self.reference} status updated to {new_status}")

        # Notify via WebSocket
        self._notify_status_change()

        # Create ledger entry if completed
        if new_status == 'completed':
            self._create_ledger_entry()

    def _notify_status_change(self):
        """
        Send WebSocket notification for status change.
        """
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()

        # Notify user's personal channel
        async_to_sync(channel_layer.group_send)(
            f'user_{self.user.id}',
            {
                'type': 'transaction_update',
                'data': {
                    'transaction_id': self.id,
                    'reference': self.reference,
                    'status': self.status,
                    'amount': str(self.amount),
                    'payment_method': self.payment_method
                }
            }
        )

        # Notify admin channel for all transactions
        async_to_sync(channel_layer.group_send)(
            'admin_notifications',
            {
                'type': 'transaction_update',
                'data': {
                    'transaction_id': self.id,
                    'reference': self.reference,
                    'user_id': self.user.id,
                    'username': self.user.username,
                    'status': self.status,
                    'amount': str(self.amount),
                    'payment_method': self.payment_method
                }
            }
        )

    def _create_ledger_entry(self):
        """
        Create immutable ledger entry for completed transaction.
        """
        try:
            from ledger.models import LedgerEntry
            LedgerEntry.objects.create(
                transaction=self,
                user=self.user,
                amount=self.amount,
                entry_type='credit',
                description=f"Payment completed via {self.payment_method} - {self.reference}",
                reference=self.reference
            )
        except ImportError:
            pass  # Ledger app may not be ready yet


class PaymentProviderConfig(models.Model):
    """
    Configuration for payment providers.
    Stored in database for easy management without code changes.
    """

    PROVIDER_CHOICES = [
        ('mpesa', 'Mpesa Daraja'),
        ('paystack', 'Paystack'),
    ]

    provider = models.CharField(
        max_length=10,
        choices=PROVIDER_CHOICES,
        unique=True,
        help_text="Payment provider name."
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this provider is active."
    )
    config = models.JSONField(
        default=dict,
        help_text="Provider-specific configuration (encrypted in production)."
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Last configuration update timestamp."
    )

    class Meta:
        db_table = 'payment_provider_config'
        verbose_name = 'Payment Provider Configuration'
        verbose_name_plural = 'Payment Provider Configurations'

    def __str__(self):
        return f"{self.provider} Configuration"