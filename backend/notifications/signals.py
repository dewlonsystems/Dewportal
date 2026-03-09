from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Notification
import logging

logger = logging.getLogger('notifications')


@receiver(post_save, sender=Notification)
def log_notification_creation(sender, instance, created, **kwargs):
    """
    Log notification creation for tracking.
    """
    if created:
        logger.info(
            f"Notification created: {instance.title} - "
            f"User: {instance.user.username} - "
            f"Type: {instance.notification_type}"
        )