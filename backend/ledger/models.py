from django.db import models
from django.db.models import Sum, Q
from django.core.exceptions import ValidationError
from django.utils import timezone
from core.models import TimeStampedModel
import logging

logger = logging.getLogger('ledger')


class LedgerEntryManager(models.Manager):
    """
    Custom manager for LedgerEntry model.
    Enforces append-only behavior and provides financial queries.
    """

    def get_queryset(self):
        """
        Return all ledger entries (no soft delete filtering).
        Ledger entries are NEVER deleted.
        """
        return super().get_queryset()

    def get_balance(self, user=None):
        """
        Calculate total balance from completed ledger entries.
        """
        queryset = self.filter(entry_type='credit', transaction__status='completed')
        if user:
            queryset = queryset.filter(user=user)
        result = queryset.aggregate(total=Sum('amount'))
        return result['total'] or 0

    def get_total_credits(self, user=None):
        """
        Get total credit entries.
        """
        queryset = self.filter(entry_type='credit')
        if user:
            queryset = queryset.filter(user=user)
        return queryset.aggregate(total=Sum('amount'))['total'] or 0

    def get_total_debits(self, user=None):
        """
        Get total debit entries.
        """
        queryset = self.filter(entry_type='debit')
        if user:
            queryset = queryset.filter(user=user)
        return queryset.aggregate(total=Sum('amount'))['total'] or 0


class LedgerEntry(TimeStampedModel):
    """
    Immutable financial ledger entry.
    
    CRITICAL: This model is append-only. Once created, entries CANNOT be
    modified or deleted. This ensures unconditional financial record integrity.
    
    All modifications are rejected at both application and database level.
    Only permitted state transitions are those triggered by legitimate
    Mpesa callbacks or Paystack webhooks that move a transaction from
    pending to either completed or failed.
    """

    ENTRY_TYPE_CHOICES = [
        ('credit', 'Credit'),
        ('debit', 'Debit'),
    ]

    SOURCE_CHOICES = [
        ('mpesa', 'Mpesa'),
        ('paystack', 'Paystack'),
        ('manual', 'Manual Adjustment'),
        ('refund', 'Refund'),
        ('system', 'System'),
    ]

    # Transaction linkage
    transaction = models.OneToOneField(
        'payments.Transaction',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='ledger_entry',
        help_text="Linked transaction (if applicable)."
    )

    # User linkage
    user = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.PROTECT,
        related_name='ledger_entries',
        help_text="User associated with this ledger entry."
    )

    # Financial data
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Transaction amount in KES."
    )
    entry_type = models.CharField(
        max_length=10,
        choices=ENTRY_TYPE_CHOICES,
        db_index=True,
        help_text="Type of ledger entry (credit/debit)."
    )
    balance_after = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Running balance after this entry."
    )

    # Metadata
    description = models.TextField(
        help_text="Description of the ledger entry."
    )
    reference = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique reference for this ledger entry."
    )
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default='system',
        help_text="Source of the ledger entry."
    )

    # Immutability enforcement
    is_finalized = models.BooleanField(
        default=True,
        help_text="Once True, entry cannot be modified (always True for ledger entries)."
    )

    # Audit trail
    created_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_ledger_entries',
        help_text="User or system that created this entry."
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address from which entry was created."
    )

    objects = LedgerEntryManager()

    class Meta:
        db_table = 'ledger_entries'
        verbose_name = 'Ledger Entry'
        verbose_name_plural = 'Ledger Entries'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['entry_type', 'created_at']),
            models.Index(fields=['transaction', 'created_at']),
            models.Index(fields=['reference']),
            models.Index(fields=['source', 'created_at']),
        ]
        constraints = [
            # Ensure amount is positive
            models.CheckConstraint(
                condition=models.Q(amount__gt=0),
                name='positive_ledger_amount'
            ),
            # Ensure balance_after is not negative
            models.CheckConstraint(
                condition=models.Q(balance_after__gte=0),
                name='non_negative_balance'
            ),
        ]

    def __str__(self):
        return f"{self.reference} - {self.user.username} - {self.amount} KES ({self.entry_type})"

    def save(self, *args, **kwargs):
        """
        Override save to enforce immutability.
        
        CRITICAL: Once a ledger entry is created, it CANNOT be modified.
        This is enforced at the application level here.
        """
        if self.pk and self.is_finalized:
            # Entry already exists and is finalized - reject any modifications
            raise ValidationError(
                "Ledger entries are immutable. Cannot modify an existing entry."
            )

        # Calculate running balance if not provided
        if not self.balance_after:
            self.balance_after = self._calculate_running_balance()

        # Generate reference if not provided
        if not self.reference:
            self.reference = self._generate_reference()

        self.is_finalized = True
        super().save(*args, **kwargs)

        logger.info(f"Ledger entry created: {self.reference} - {self.user.username} - {self.amount} KES")

    def delete(self, *args, **kwargs):
        """
        Override delete to prevent deletion.
        
        CRITICAL: Ledger entries CANNOT be deleted.
        This is enforced at the application level here.
        """
        raise ValidationError(
            "Ledger entries are immutable. Cannot delete ledger entries."
        )

    def _calculate_running_balance(self):
        """
        Calculate running balance for the user up to this point.
        """
        # Get all previous credit entries for this user
        previous_credits = LedgerEntry.objects.filter(
            user=self.user,
            entry_type='credit',
            created_at__lt=timezone.now()
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Get all previous debit entries for this user
        previous_debits = LedgerEntry.objects.filter(
            user=self.user,
            entry_type='debit',
            created_at__lt=timezone.now()
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Calculate balance
        if self.entry_type == 'credit':
            return previous_credits + self.amount - previous_debits
        else:
            return previous_credits - (previous_debits + self.amount)

    def _generate_reference(self):
        """
        Generate unique ledger reference.
        Format: LE followed by timestamp and random characters.
        """
        import secrets
        import string
        from django.utils import timezone

        timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
        random_part = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))
        return f"LE{timestamp}{random_part}"

    @classmethod
    def create_from_transaction(cls, transaction, created_by=None, ip_address=None):
        """
        Create a ledger entry from a completed transaction.
        
        This is the ONLY way to create ledger entries - through legitimate
        transaction completion (Mpesa callback or Paystack webhook).
        """
        if transaction.status != 'completed':
            raise ValidationError(
                "Ledger entries can only be created for completed transactions."
            )

        # Check if ledger entry already exists for this transaction
        if hasattr(transaction, 'ledger_entry'):
            raise ValidationError(
                "Ledger entry already exists for this transaction."
            )

        return cls.objects.create(
            transaction=transaction,
            user=transaction.user,
            amount=transaction.amount,
            entry_type='credit',
            description=f"Payment completed via {transaction.payment_method} - {transaction.reference}",
            source=transaction.payment_method,
            reference=f"LE-{transaction.reference}",
            created_by=created_by,
            ip_address=ip_address
        )


class LedgerAuditLog(TimeStampedModel):
    """
    Audit log for all ledger operations.
    Records every attempt to create, modify, or delete ledger entries.
    """

    ACTION_CHOICES = [
        ('create', 'Create'),
        ('modify_attempted', 'Modify Attempted'),
        ('delete_attempted', 'Delete Attempted'),
        ('view', 'View'),
        ('export', 'Export'),
    ]

    ledger_entry = models.ForeignKey(
        LedgerEntry,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='audit_logs',
        help_text="Ledger entry associated with this audit log."
    )
    action = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES,
        db_index=True,
        help_text="Action performed."
    )
    user = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ledger_audit_logs',
        help_text="User who performed the action."
    )
    details = models.TextField(
        blank=True,
        null=True,
        help_text="Additional details about the action."
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address from which action was performed."
    )
    user_agent = models.TextField(
        blank=True,
        null=True,
        help_text="User agent string from the request."
    )

    class Meta:
        db_table = 'ledger_audit_logs'
        verbose_name = 'Ledger Audit Log'
        verbose_name_plural = 'Ledger Audit Logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['ledger_entry', 'created_at']),
        ]

    def __str__(self):
        return f"{self.action} - {self.ledger_entry.reference if self.ledger_entry else 'N/A'} - {self.created_at}"