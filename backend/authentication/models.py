from django.db import models
from core.models import TimeStampedModel


class LoginAttempt(TimeStampedModel):
    """
    Track login attempts for security monitoring and rate limiting.
    Used for audit trail and detecting brute force attacks.
    """

    STATUS_CHOICES = [
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('locked', 'Account Locked'),
    ]

    username = models.CharField(
        max_length=50,
        db_index=True,
        help_text="Username attempted for login."
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        db_index=True,
        help_text="Status of the login attempt."
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address of the login attempt."
    )
    user_agent = models.TextField(
        blank=True,
        null=True,
        help_text="User agent string from the request."
    )
    failure_reason = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Reason for login failure (e.g., invalid password, account locked)."
    )
    user = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='login_attempts',
        help_text="User associated with the login attempt (if found)."
    )

    class Meta:
        db_table = 'login_attempts'
        verbose_name = 'Login Attempt'
        verbose_name_plural = 'Login Attempts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['username', 'status', 'created_at']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['ip_address', 'created_at']),
        ]

    def __str__(self):
        return f"Login attempt for {self.username} - {self.status}"


class TokenBlacklistMetadata(TimeStampedModel):
    """
    Additional metadata for blacklisted tokens.
    Extends SimpleJWT's blacklist with audit information.
    """

    token_jti = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        help_text="JWT JTI claim of the blacklisted token."
    )
    user = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.CASCADE,
        related_name='blacklisted_tokens',
        help_text="User who owned the blacklisted token."
    )
    blacklisted_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the token was blacklisted."
    )
    reason = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Reason for blacklisting (logout, disable, delete, etc.)."
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address from which the token was blacklisted."
    )

    class Meta:
        db_table = 'token_blacklist_metadata'
        verbose_name = 'Token Blacklist Metadata'
        verbose_name_plural = 'Token Blacklist Metadata'
        ordering = ['-blacklisted_at']
        indexes = [
            models.Index(fields=['user', 'blacklisted_at']),
            models.Index(fields=['token_jti']),
        ]

    def __str__(self):
        return f"Blacklisted token for {self.user.username}"