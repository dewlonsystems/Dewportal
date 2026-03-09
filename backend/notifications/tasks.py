"""
Celery tasks for notifications app.
"""

import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Notification, WebSocketConnection

logger = logging.getLogger('notifications')


@shared_task
def cleanup_websocket_connections():
    """
    Clean up inactive WebSocket connections.
    Runs daily via Celery Beat.
    """
    now = timezone.now()
    
    # Find connections with no heartbeat in last 24 hours
    stale_connections = WebSocketConnection.objects.filter(
        is_active=True,
        last_heartbeat__lte=now - timedelta(hours=24)
    )
    
    cleaned_count = stale_connections.update(
        is_active=False,
        disconnected_at=now
    )
    
    logger.info(f"Cleaned up {cleaned_count} stale WebSocket connections")
    return {'cleaned_count': cleaned_count}


@shared_task
def cleanup_old_notifications():
    """
    Clean up old dismissed notifications.
    Runs weekly via Celery Beat.
    """
    now = timezone.now()
    
    # Find dismissed notifications older than 30 days
    old_notifications = Notification.objects.filter(
        is_dismissed=True,
        created_at__lte=now - timedelta(days=30)
    )
    
    deleted_count = old_notifications.count()
    old_notifications.delete()
    
    logger.info(f"Cleaned up {deleted_count} old notifications")
    return {'deleted_count': deleted_count}


@shared_task
def send_notification_email(notification_id):
    """
    Send email notification for important notifications.
    """
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        
        notification = Notification.objects.get(pk=notification_id)
        user = notification.user
        
        # Only send email for certain notification types
        if notification.notification_type not in ['payment', 'alert', 'system']:
            return
        
        subject = f'{notification.title} - Dewlon Portal'
        message = f"""
Hello {user.first_name},

{notification.message}

View your notifications at: https://portal.dewlon.com/notifications

Best regards,
Dewlon Portal Team
        """
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        logger.info(f"Notification email sent to {user.email}")
        
    except Exception as e:
        logger.error(f"Failed to send notification email: {str(e)}")