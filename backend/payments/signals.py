from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Transaction
import logging

logger = logging.getLogger('payments')


@receiver(post_save, sender=Transaction)
def log_transaction_creation(sender, instance, created, **kwargs):
    """
    Log transaction creation for audit purposes.
    """
    if created:
        logger.info(f"Transaction created: {instance.reference} - {instance.user.username} - {instance.amount} KES")