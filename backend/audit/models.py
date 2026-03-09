from django.db import models
from django.utils import timezone
from core.models import TimeStampedModel
import logging

logger = logging.getLogger('audit')


class AuditLogManager(models.Manager):
    """
    Custom manager for AuditLog model.
    Provides cursor-based pagination and audit queries.
    """

    def get_cursor_paginated(self, cursor=None, limit=20, filters=None):
        """
        Implement cursor-based pagination for audit logs.
        
        Args:
            cursor: Base64-encoded timestamp + ID for pagination
            limit: Number of records to return (default: 20)
            filters: Dictionary of filter criteria
        
        Returns:
            dict: Records, next cursor, previous cursor, has more
        """
        import base64
        from django.db.models import Q

        queryset = self.all()

        # Apply filters
        if filters:
            if filters.get('user_id'):
                queryset = queryset.filter(user_id=filters['user_id'])
            if filters.get('action_type'):
                queryset = queryset.filter(action_type=filters['action_type'])
            if filters.get('date_from'):
                queryset = queryset.filter(created_at__gte=filters['date_from'])
            if filters.get('date_to'):
                queryset = queryset.filter(created_at__lte=filters['date_to'])
            if filters.get('search'):
                queryset = queryset.filter(
                    Q(details__icontains=filters['search']) |
                    Q(ip_address__icontains=filters['search'])
                )

        # Apply cursor pagination
        if cursor:
            try:
                # Decode cursor (format: timestamp:id)
                decoded = base64.b64decode(cursor).decode('utf-8')
                timestamp, record_id = decoded.split(':')
                queryset = queryset.filter(
                    models.Q(created_at__lt=timestamp) |
                    models.Q(created_at=timestamp, id__lt=record_id)
                )
            except Exception:
                pass  # Invalid cursor, start from beginning

        # Order by created_at DESC, id DESC for consistent pagination
        queryset = queryset.order_by('-created_at', '-id')

        # Get limit + 1 to check if there are more records
        records = list(queryset[:limit + 1])

        has_more = len(records) > limit
        if has_more:
            records = records[:limit]

        # Generate next cursor
        next_cursor = None
        if has_more and records:
            last_record = records[-1]
            cursor_data = f"{last_record.created_at.isoformat()}:{last_record.id}"
            next_cursor = base64.b64encode(cursor_data.encode('utf-8')).decode('utf-8')

        # Generate previous cursor (simplified - would need full implementation for bidirectional)
        previous_cursor = None

        return {
            'records': records,
            'next_cursor': next_cursor,
            'previous_cursor': previous_cursor,
            'has_more': has_more,
            'limit': limit,
            'total_returned': len(records)
        }


class AuditLog(TimeStampedModel):
    """
    Immutable audit log for all significant system actions.
    
    CRITICAL: This model is append-only. Once created, audit logs CANNOT be
    modified or deleted. This ensures unconditional audit trail integrity
    for compliance and security purposes.
    
    Records:
    - User logins and logouts
    - Password changes and resets
    - Transaction events
    - User management actions (create, update, delete, disable)
    - Payment events
    - System configuration changes
    - Permission and access events
    """

    ACTION_TYPE_CHOICES = [
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('login_failed', 'Login Failed'),
        ('account_locked', 'Account Locked'),
        ('password_changed', 'Password Changed'),
        ('password_reset_requested', 'Password Reset Requested'),
        ('password_reset_approved', 'Password Reset Approved'),
        ('password_reset_rejected', 'Password Reset Rejected'),
        ('user_created', 'User Created'),
        ('user_updated', 'User Updated'),
        ('user_deleted', 'User Deleted'),
        ('user_disabled', 'User Disabled'),
        ('user_enabled', 'User Enabled'),
        ('transaction_initiated', 'Transaction Initiated'),
        ('transaction_completed', 'Transaction Completed'),
        ('transaction_failed', 'Transaction Failed'),
        ('payment_initiated', 'Payment Initiated'),
        ('payment_callback', 'Payment Callback'),
        ('payment_webhook', 'Payment Webhook'),
        ('ledger_entry_created', 'Ledger Entry Created'),
        ('profile_updated', 'Profile Updated'),
        ('token_blacklisted', 'Token Blacklisted'),
        ('token_refreshed', 'Token Refreshed'),
        ('session_expired', 'Session Expired'),
        ('permission_denied', 'Permission Denied'),
        ('api_request', 'API Request'),
        ('websocket_connected', 'WebSocket Connected'),
        ('websocket_disconnected', 'WebSocket Disconnected'),
        ('system_event', 'System Event'),
        ('config_changed', 'Configuration Changed'),
        ('export_data', 'Data Exported'),
        ('integrity_check', 'Integrity Check'),
        ('other', 'Other'),
    ]

    SEVERITY_CHOICES = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('critical', 'Critical'),
    ]

    # User who performed the action
    user = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        help_text="User who performed the action."
    )

    # Action details
    action_type = models.CharField(
        max_length=50,
        choices=ACTION_TYPE_CHOICES,
        db_index=True,
        help_text="Type of action performed."
    )
    severity = models.CharField(
        max_length=10,
        choices=SEVERITY_CHOICES,
        default='info',
        db_index=True,
        help_text="Severity level of the action."
    )
    category = models.CharField(
        max_length=50,
        db_index=True,
        help_text="Category of the action (authentication, payment, user_management, etc.)."
    )

    # Action details
    description = models.TextField(
        help_text="Human-readable description of the action."
    )
    details = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional structured data about the action."
    )

    # Related objects (polymorphic references stored as JSON)
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
        db_index=True,
        help_text="Reference code of the related object (e.g., transaction reference)."
    )

    # Request metadata
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address from which the action was performed."
    )
    user_agent = models.TextField(
        blank=True,
        null=True,
        help_text="User agent string from the request."
    )
    request_method = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text="HTTP method (GET, POST, etc.)."
    )
    request_path = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Request path/endpoint."
    )

    # System metadata
    session_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Session identifier."
    )
    server_hostname = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Server hostname where action was processed."
    )

    # Immutability enforcement
    is_finalized = models.BooleanField(
        default=True,
        help_text="Once True, entry cannot be modified (always True for audit logs)."
    )

    objects = AuditLogManager()

    class Meta:
        db_table = 'audit_logs'
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['action_type', 'created_at']),
            models.Index(fields=['category', 'created_at']),
            models.Index(fields=['severity', 'created_at']),
            models.Index(fields=['related_object_type', 'related_object_id']),
            models.Index(fields=['ip_address', 'created_at']),
            models.Index(fields=['created_at', 'id']),  # For cursor pagination
        ]
        constraints = [
            # Ensure finalized entries cannot be modified (application-level enforcement)
        ]

    def __str__(self):
        return f"{self.action_type} - {self.user.username if self.user else 'system'} - {self.created_at}"

    def save(self, *args, **kwargs):
        """
        Override save to enforce immutability.
        
        CRITICAL: Once an audit log is created, it CANNOT be modified.
        """
        if self.pk and self.is_finalized:
            raise Exception("Audit logs are immutable. Cannot modify an existing entry.")

        self.is_finalized = True
        super().save(*args, **kwargs)

        # Notify via WebSocket for real-time updates
        self._notify_audit_event()

    def delete(self, *args, **kwargs):
        """
        Override delete to prevent deletion.
        
        CRITICAL: Audit logs CANNOT be deleted.
        """
        raise Exception("Audit logs are immutable. Cannot delete audit logs.")

    def _notify_audit_event(self):
        """
        Send WebSocket notification for new audit log entry.
        """
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            channel_layer = get_channel_layer()

            # Notify admin channel for all audit events
            async_to_sync(channel_layer.group_send)(
                'admin_notifications',
                {
                    'type': 'audit_log_entry',
                    'data': {
                        'log_id': self.id,
                        'action_type': self.action_type,
                        'user': self.user.username if self.user else 'system',
                        'category': self.category,
                        'severity': self.severity,
                        'created_at': self.created_at.isoformat()
                    }
                }
            )

            # Notify user's personal channel for their own events
            if self.user:
                async_to_sync(channel_layer.group_send)(
                    f'user_{self.user.id}',
                    {
                        'type': 'audit_log_entry',
                        'data': {
                            'log_id': self.id,
                            'action_type': self.action_type,
                            'category': self.category,
                            'created_at': self.created_at.isoformat()
                        }
                    }
                )

        except Exception as e:
            logger.error(f"Failed to send audit log WebSocket notification: {str(e)}")

    @classmethod
    def log_event(cls, user, action_type, category, description, details=None,
                  ip_address=None, user_agent=None, request=None,
                  related_object=None, severity='info'):
        """
        Create a new audit log entry.
        
        This is the primary method for creating audit logs throughout the system.
        
        Args:
            user: User who performed the action
            action_type: Type of action (from ACTION_TYPE_CHOICES)
            category: Category of action (authentication, payment, user_management, etc.)
            description: Human-readable description
            details: Additional structured data (dict)
            ip_address: IP address of the request
            user_agent: User agent string
            request: Django request object (extracts IP, user agent, path, method)
            related_object: Related model instance (Transaction, User, etc.)
            severity: Severity level (info, warning, error, critical)
        
        Returns:
            AuditLog instance
        """
        import socket

        # Extract request metadata if request object provided
        if request:
            ip_address = ip_address or request.META.get('REMOTE_ADDR')
            user_agent = user_agent or request.META.get('HTTP_USER_AGENT', '')[:255]
            request_method = request.method
            request_path = request.path
        else:
            request_method = None
            request_path = None

        # Extract related object info
        related_object_type = None
        related_object_id = None
        related_object_reference = None

        if related_object:
            related_object_type = related_object.__class__.__name__
            related_object_id = related_object.id
            if hasattr(related_object, 'reference'):
                related_object_reference = related_object.reference
            elif hasattr(related_object, 'username'):
                related_object_reference = related_object.username

        # Get server hostname
        try:
            server_hostname = socket.gethostname()
        except Exception:
            server_hostname = 'unknown'

        return cls.objects.create(
            user=user,
            action_type=action_type,
            category=category,
            description=description,
            details=details or {},
            related_object_type=related_object_type,
            related_object_id=related_object_id,
            related_object_reference=related_object_reference,
            ip_address=ip_address,
            user_agent=user_agent,
            request_method=request_method,
            request_path=request_path,
            severity=severity,
            server_hostname=server_hostname
        )


class UserSession(TimeStampedModel):
    """
    Track active user sessions for last seen tracking.
    Updated on each authenticated request.
    """

    user = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.CASCADE,
        related_name='sessions',
        help_text="User associated with this session."
    )
    session_key = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Session key identifier."
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address of the session."
    )
    user_agent = models.TextField(
        blank=True,
        null=True,
        help_text="User agent string."
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether the session is currently active."
    )
    last_activity = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        help_text="Last activity timestamp for this session."
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Session expiration timestamp."
    )

    class Meta:
        db_table = 'user_sessions'
        verbose_name = 'User Session'
        verbose_name_plural = 'User Sessions'
        ordering = ['-last_activity']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['session_key']),
            models.Index(fields=['last_activity']),
        ]

    def __str__(self):
        return f"Session for {self.user.username} - {self.session_key}"

    def is_expired(self):
        """
        Check if session has expired.
        """
        if self.expires_at and timezone.now() > self.expires_at:
            return True
        return False

    def mark_inactive(self):
        """
        Mark session as inactive.
        """
        self.is_active = False
        self.save(update_fields=['is_active'])