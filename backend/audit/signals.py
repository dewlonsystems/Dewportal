from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import AuditLog
import logging

logger = logging.getLogger('audit')


@receiver(post_save, sender=AuditLog)
def log_audit_creation(sender, instance, created, **kwargs):
    """
    Log audit log creation for internal tracking.
    """
    if created:
        logger.info(
            f"Audit log created: {instance.action_type} - "
            f"{instance.user.username if instance.user else 'system'} - "
            f"{instance.category}"
        )