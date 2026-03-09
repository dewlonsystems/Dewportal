from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import LedgerEntry
import logging

logger = logging.getLogger('ledger')


@receiver(post_save, sender=LedgerEntry)
def log_ledger_entry_creation(sender, instance, created, **kwargs):
    """
    Log ledger entry creation for audit purposes.
    """
    if created:
        from .models import LedgerAuditLog

        LedgerAuditLog.objects.create(
            ledger_entry=instance,
            action='create',
            user=instance.created_by,
            ip_address=instance.ip_address,
            details=f'Ledger entry created: {instance.reference}'
        )

        logger.info(f"Ledger entry created: {instance.reference} - {instance.user.username} - {instance.amount} KES")