import secrets
from datetime import timedelta
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
from django.core.exceptions import ValidationError
from core.models import TimeStampedModel, SoftDeleteModel


class CustomUserManager(BaseUserManager):
    """
    Custom user manager for the CustomUser model.
    Handles user creation with proper password hashing and role assignment.
    """

    def create_user(self, username, email, password=None, role='staff', **extra_fields):
        """
        Create and return a regular user with the given username, email, and password.
        """
        if not username:
            raise ValueError('Users must have a username')
        if not email:
            raise ValueError('Users must have an email address')

        email = self.normalize_email(email)
        user = self.model(
            username=username,
            email=email,
            role=role,
            **extra_fields
        )

        if password:
            user.set_password(password)
        else:
            # Generate temporary password if none provided
            from core.utils import generate_temporary_password
            temp_password = generate_temporary_password()
            user.set_password(temp_password)
            user.temporary_password = temp_password
            user.must_change_password = True

        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        """
        Create and return a superuser with admin role.
        """
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('role') != 'admin':
            raise ValueError('Superusers must have admin role')

        return self.create_user(username, email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin, TimeStampedModel, SoftDeleteModel):
    """
    Custom user model for the Dewlon Portal.
    
    Supports two roles: admin and staff.
    Includes account lockout, forced password change, and soft delete functionality.
    """

    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('staff', 'Staff Member'),
    ]

    username = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique username for login."
    )
    email = models.EmailField(
        unique=True,
        db_index=True,
        help_text="Email address for notifications and password reset."
    )
    first_name = models.CharField(
        max_length=50,
        blank=False,
        null=False,
        help_text="User's first name."
    )
    last_name = models.CharField(
        max_length=50,
        blank=False,
        null=False,
        help_text="User's last name."
    )
    phone_number = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        help_text="Contact phone number."
    )
    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default='staff',
        db_index=True,
        help_text="User role: admin or staff."
    )

    # Account security fields
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Designates whether this user should be treated as active."
    )
    is_staff = models.BooleanField(
        default=False,
        help_text="Designates whether the user can log into admin site."
    )
    is_superuser = models.BooleanField(
        default=False,
        help_text="Designates whether this user has all permissions."
    )

    # Password management
    temporary_password = models.CharField(
        max_length=128,
        blank=True,
        null=True,
        help_text="Stores temporary password until changed."
    )
    must_change_password = models.BooleanField(
        default=False,
        help_text="Force password change on next login."
    )
    password_changed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when password was last changed."
    )

    # Account lockout fields
    failed_login_attempts = models.PositiveIntegerField(
        default=0,
        help_text="Count of consecutive failed login attempts."
    )
    locked_until = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Account lockout expiry timestamp."
    )

    # Last seen tracking
    last_seen = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Last time the user was active in the system."
    )

    objects = CustomUserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'first_name', 'last_name']

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['role', 'is_active']),
            models.Index(fields=['locked_until']),
            models.Index(fields=['last_seen']),
        ]

    def __str__(self):
        return f"{self.username} ({self.email})"

    def get_full_name(self):
        """Return the user's full name."""
        return f"{self.first_name} {self.last_name}"

    def get_short_name(self):
        """Return the user's first name."""
        return self.first_name

    @property
    def is_locked(self):
        """
        Check if the account is currently locked.
        """
        if self.locked_until and timezone.now() < self.locked_until:
            return True
        return False

    @property
    def is_first_login(self):
        """
        Check if this is the user's first login (temporary password not changed).
        """
        return self.must_change_password

    def increment_failed_attempts(self):
        """
        Increment failed login attempts and lock account if threshold reached.
        """
        self.failed_login_attempts += 1

        if self.failed_login_attempts >= 3:
            self.locked_until = timezone.now() + timedelta(hours=3)
            self.is_active = False

        self.save(update_fields=['failed_login_attempts', 'locked_until', 'is_active'])

    def reset_failed_attempts(self):
        """
        Reset failed login attempts after successful login.
        """
        self.failed_login_attempts = 0
        self.locked_until = None
        self.is_active = True
        self.save(update_fields=['failed_login_attempts', 'locked_until', 'is_active'])

    def update_last_seen(self):
        """
        Update the last seen timestamp.
        """
        self.last_seen = timezone.now()
        self.save(update_fields=['last_seen'])

    def force_password_change(self):
        """
        Mark user as requiring password change on next login.
        """
        from core.utils import generate_temporary_password
        self.temporary_password = generate_temporary_password()
        self.set_password(self.temporary_password)
        self.must_change_password = True
        self.save(update_fields=['temporary_password', 'must_change_password'])

    def confirm_password_change(self):
        """
        Confirm password has been changed successfully.
        """
        self.must_change_password = False
        self.temporary_password = None
        self.password_changed_at = timezone.now()
        self.save(update_fields=['must_change_password', 'temporary_password', 'password_changed_at'])

    def clean(self):
        """
        Validate user data before saving.
        """
        super().clean()

        # Validate email uniqueness (excluding self)
        if CustomUser.objects.filter(email=self.email).exclude(pk=self.pk).exists():
            raise ValidationError({'email': 'A user with this email already exists.'})

        # Validate username uniqueness (excluding self)
        if CustomUser.objects.filter(username=self.username).exclude(pk=self.pk).exists():
            raise ValidationError({'username': 'A user with this username already exists.'})

        # Validate phone number format if provided
        if self.phone_number:
            import re
            if not re.match(r'^\+?[\d\s-]{10,15}$', self.phone_number):
                raise ValidationError({'phone_number': 'Invalid phone number format.'})


class PasswordResetRequest(TimeStampedModel):
    """
    Model to track password reset requests from staff users.
    Admins can view and action these requests from the user management page.
    """

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='password_reset_requests',
        help_text="User who requested the password reset."
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True,
        help_text="Status of the password reset request."
    )
    reason = models.TextField(
        blank=True,
        null=True,
        help_text="Reason provided for the password reset request."
    )
    admin_notes = models.TextField(
        blank=True,
        null=True,
        help_text="Admin notes when approving or rejecting."
    )
    processed_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_reset_requests',
        help_text="Admin who processed this request."
    )
    processed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the request was processed."
    )

    class Meta:
        db_table = 'password_reset_requests'
        verbose_name = 'Password Reset Request'
        verbose_name_plural = 'Password Reset Requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"Password reset request for {self.user.username} - {self.status}"

    def approve(self, admin_user):
        """
        Approve the password reset request.
        """
        from core.utils import generate_temporary_password
        from django.core.mail import send_mail
        from django.conf import settings
        import logging

        logger = logging.getLogger('users')

        # Generate new temporary password
        temp_password = generate_temporary_password()
        self.user.set_password(temp_password)
        self.user.temporary_password = temp_password
        self.user.must_change_password = True
        self.user.save(update_fields=['temporary_password', 'must_change_password'])

        # Update request status
        self.status = 'approved'
        self.processed_by = admin_user
        self.processed_at = timezone.now()
        self.save(update_fields=['status', 'processed_by', 'processed_at'])

        # Send email to user
        try:
            send_mail(
                subject='Password Reset Approved - Dewlon Portal',
                message=f"Your password has been reset. Your temporary password is: {temp_password}\n\nPlease log in and change your password immediately.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[self.user.email],
                fail_silently=False,
            )
            logger.info(f"Password reset email sent to {self.user.email}")
        except Exception as e:
            logger.error(f"Failed to send password reset email to {self.user.email}: {str(e)}")
            raise

    def reject(self, admin_user, notes=None):
        """
        Reject the password reset request.
        """
        self.status = 'rejected'
        self.processed_by = admin_user
        self.processed_at = timezone.now()
        self.admin_notes = notes or ''
        self.save(update_fields=['status', 'processed_by', 'processed_at', 'admin_notes'])