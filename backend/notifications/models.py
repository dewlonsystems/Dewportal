from django.db import models
from django.utils import timezone
from core.models import TimeStampedModel
import logging

logger = logging.getLogger('notifications')


class Notification(TimeStampedModel):
    """
    Persistent notification model for storing notifications.
    WebSocket delivers real-time, but this provides persistence and history.
    """

    TYPE_CHOICES = [
        ('payment', 'Payment Notification'),
        ('transaction', 'Transaction Notification'),
        ('user_management', 'User Management Notification'),
        ('password_reset', 'Password Reset Notification'),
        ('system', 'System Notification'),
        ('audit', 'Audit Notification'),
        ('alert', 'Alert'),
    ]

    SEVERITY_CHOICES = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('success', 'Success'),
    ]

    # User recipient
    user = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.CASCADE,
        related_name='notifications',
        help_text="User who should receive this notification."
    )

    # Notification details
    notification_type = models.CharField(
        max_length=30,
        choices=TYPE_CHOICES,
        db_index=True,
        help_text="Type of notification."
    )
    severity = models.CharField(
        max_length=10,
        choices=SEVERITY_CHOICES,
        default='info',
        help_text="Severity level of the notification."
    )
    title = models.CharField(
        max_length=200,
        help_text="Notification title."
    )
    message = models.TextField(
        help_text="Notification message content."
    )

    # Related object (optional)
    related_object_type = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Type of related object (e.g., 'Transaction', 'User')."
    )
    related_object_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="ID of the related object."
    )
    related_object_reference = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Reference code of the related object."
    )

    # Delivery status
    is_read = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Whether the notification has been read."
    )
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Timestamp when notification was read."
    )
    is_dismissed = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Whether the notification has been dismissed."
    )
    dismissed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when notification was dismissed."
    )

    # WebSocket delivery tracking
    delivered_via_websocket = models.BooleanField(
        default=False,
        help_text="Whether notification was delivered via WebSocket."
    )
    websocket_delivered_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when WebSocket delivery occurred."
    )

    # Additional data
    data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional notification data (e.g., transaction details)."
    )
    action_url = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text="URL for notification action (optional)."
    )

    class Meta:
        db_table = 'notifications'
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', 'created_at']),
            models.Index(fields=['notification_type', 'created_at']),
            models.Index(fields=['severity', 'created_at']),
            models.Index(fields=['is_read', 'created_at']),
        ]

    def __str__(self):
        return f"{self.title} - {self.user.username}"

    def mark_as_read(self):
        """
        Mark notification as read.
        """
        self.is_read = True
        self.read_at = timezone.now()
        self.save(update_fields=['is_read', 'read_at'])

    def dismiss(self):
        """
        Dismiss notification.
        """
        self.is_dismissed = True
        self.dismissed_at = timezone.now()
        self.save(update_fields=['is_dismissed', 'dismissed_at'])

    @classmethod
    def create_notification(cls, user, notification_type, title, message,
                           severity='info', related_object=None, data=None,
                           action_url=None, deliver_websocket=True):
        """
        Create a notification and optionally deliver via WebSocket.
        
        Args:
            user: User recipient
            notification_type: Type from TYPE_CHOICES
            title: Notification title
            message: Notification message
            severity: Severity level
            related_object: Related model instance
            data: Additional data dict
            action_url: Optional action URL
            deliver_websocket: Whether to deliver via WebSocket immediately
        
        Returns:
            Notification instance
        """
        # Extract related object info
        related_object_type = None
        related_object_id = None
        related_object_reference = None

        if related_object:
            related_object_type = related_object.__class__.__name__
            related_object_id = related_object.id
            if hasattr(related_object, 'reference'):
                related_object_reference = related_object.reference

        notification = cls.objects.create(
            user=user,
            notification_type=notification_type,
            severity=severity,
            title=title,
            message=message,
            related_object_type=related_object_type,
            related_object_id=related_object_id,
            related_object_reference=related_object_reference,
            data=data or {},
            action_url=action_url
        )

        # Deliver via WebSocket
        if deliver_websocket:
            notification.deliver_via_websocket()

        return notification

    def deliver_via_websocket(self):
        """
        Deliver notification via WebSocket to the user.
        """
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            channel_layer = get_channel_layer()

            # Send to user's personal channel
            async_to_sync(channel_layer.group_send)(
                f'user_{self.user.id}',
                {
                    'type': 'notification',
                    'data': {
                        'id': self.id,
                        'type': self.notification_type,
                        'severity': self.severity,
                        'title': self.title,
                        'message': self.message,
                        'data': self.data,
                        'action_url': self.action_url,
                        'created_at': self.created_at.isoformat()
                    }
                }
            )

            # Update delivery status
            self.delivered_via_websocket = True
            self.websocket_delivered_at = timezone.now()
            self.save(update_fields=['delivered_via_websocket', 'websocket_delivered_at'])

            logger.info(f"Notification {self.id} delivered via WebSocket to user {self.user.username}")

        except Exception as e:
            logger.error(f"Failed to deliver notification {self.id} via WebSocket: {str(e)}")


class WebSocketConnection(TimeStampedModel):
    """
    Track active WebSocket connections for monitoring and debugging.
    """

    user = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.CASCADE,
        related_name='websocket_connections',
        help_text="User associated with this WebSocket connection."
    )
    channel_name = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Channels channel name for this connection."
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address of the WebSocket connection."
    )
    user_agent = models.TextField(
        blank=True,
        null=True,
        help_text="User agent string from the connection."
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether the connection is currently active."
    )
    disconnected_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the connection was disconnected."
    )
    last_heartbeat = models.DateTimeField(
        default=timezone.now,
        help_text="Last heartbeat timestamp for connection health monitoring."
    )

    class Meta:
        db_table = 'websocket_connections'
        verbose_name = 'WebSocket Connection'
        verbose_name_plural = 'WebSocket Connections'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['channel_name']),
            models.Index(fields=['last_heartbeat']),
        ]

    def __str__(self):
        return f"WebSocket for {self.user.username} - {self.channel_name}"

    def mark_disconnected(self):
        """
        Mark connection as disconnected.
        """
        self.is_active = False
        self.disconnected_at = timezone.now()
        self.save(update_fields=['is_active', 'disconnected_at'])

    def update_heartbeat(self):
        """
        Update last heartbeat timestamp.
        """
        self.last_heartbeat = timezone.now()
        self.save(update_fields=['last_heartbeat'])