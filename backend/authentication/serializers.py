from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import get_user_model
from django.utils import timezone
import logging

from core.utils import sanitize_log_data

logger = logging.getLogger('authentication')
User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        token['role'] = user.role
        token['must_change_password'] = user.must_change_password

        return token


    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        # Get client IP and user agent for logging
        request = self.context.get('request')
        ip_address = self._get_client_ip(request) if request else None
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:255] if request else ''

        # Find user
        try:
            user = User.objects.get(username=username, is_deleted=False)
        except User.DoesNotExist:
            # Log failed attempt (user not found)
            from authentication.models import LoginAttempt
            LoginAttempt.objects.create(
                username=username,
                status='failed',
                ip_address=ip_address,
                user_agent=user_agent,
                failure_reason='User not found'
            )
            logger.warning(f"Login attempt for non-existent user: {username}")
            raise serializers.ValidationError({'error': 'Invalid credentials'})

        # Check if account is locked
        if user.is_locked:
            # Log locked attempt
            from authentication.models import LoginAttempt
            LoginAttempt.objects.create(
                username=username,
                status='locked',
                ip_address=ip_address,
                user_agent=user_agent,
                user=user,
                failure_reason='Account locked due to failed attempts'
            )
            logger.warning(f"Login attempt on locked account: {username}")
            raise serializers.ValidationError({
                'error': 'Account is temporarily locked due to multiple failed login attempts.',
                'locked_until': user.locked_until.isoformat() if user.locked_until else None
            })

        # Check if account is active
        if not user.is_active:
            from authentication.models import LoginAttempt
            LoginAttempt.objects.create(
                username=username,
                status='failed',
                ip_address=ip_address,
                user_agent=user_agent,
                user=user,
                failure_reason='Account disabled'
            )
            logger.warning(f"Login attempt on disabled account: {username}")
            raise serializers.ValidationError({'error': 'Account is disabled. Contact administrator.'})

        # Verify password
        if not user.check_password(password):
            # Increment failed attempts
            user.increment_failed_attempts()

            # Log failed attempt
            from authentication.models import LoginAttempt
            LoginAttempt.objects.create(
                username=username,
                status='failed',
                ip_address=ip_address,
                user_agent=user_agent,
                user=user,
                failure_reason='Invalid password'
            )
            logger.warning(f"Failed login attempt for user: {username}")

            # Send lockout email if this triggered the lock
            if user.is_locked:
                self._send_lockout_email(user)

            raise serializers.ValidationError({'error': 'Invalid credentials'})

        # Password is correct - reset failed attempts
        user.reset_failed_attempts()
        user.update_last_seen()

        # Log successful attempt
        from authentication.models import LoginAttempt
        LoginAttempt.objects.create(
            username=username,
            status='success',
            ip_address=ip_address,
            user_agent=user_agent,
            user=user
        )
        logger.info(f"Successful login for user: {username}")

        # Check for forced password change
        if user.must_change_password:
            # Generate tokens but flag that password change is required
            refresh = RefreshToken.for_user(user)
            return {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'must_change_password': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role
                }
            }

        # Normal login flow
        data = super().validate(attrs)

        # Add user info to response
        data.update({
            'must_change_password': False,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role
            }
        })

        return data

    def _get_client_ip(self, request):
        """
        Extract client IP address from request, handling proxies.
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')

    def _send_lockout_email(self, user):
        """
        Send email notification when account is locked.
        """
        from django.core.mail import send_mail
        from django.conf import settings

        try:
            send_mail(
                subject='Account Locked - Dewlon Portal',
                message=f"Hello {user.first_name},\n\nYour account has been temporarily locked due to multiple failed login attempts.\n\nIt will be automatically reactivated in 3 hours.\n\nIf you did not attempt to log in, please contact support immediately.\n\nBest regards,\nDewlon Portal Team",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            logger.info(f"Lockout email sent to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send lockout email to {user.email}: {str(e)}")


class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    """
    Custom token refresh serializer with user status validation.
    """

    def validate(self, attrs):
        refresh_token = attrs.get('refresh')

        try:
            refresh = RefreshToken(refresh_token)
            user_id = refresh.payload.get('user_id')

            if not user_id:
                raise serializers.ValidationError({'error': 'Invalid token'})

            # Verify user still exists and is active
            User = get_user_model()
            try:
                user = User.objects.get(pk=user_id, is_deleted=False)
            except User.DoesNotExist:
                raise serializers.ValidationError({'error': 'User no longer exists'})

            if not user.is_active:
                raise serializers.ValidationError({'error': 'Account is disabled'})

            if user.is_locked:
                raise serializers.ValidationError({'error': 'Account is locked'})

            # Update last seen
            user.update_last_seen()

        except Exception as e:
            logger.error(f"Token refresh failed: {str(e)}")
            raise serializers.ValidationError({'error': 'Token refresh failed'})

        return super().validate(attrs)


class LogoutSerializer(serializers.Serializer):
    """
    Serializer for logout endpoint.
    Blacklists the refresh token to invalidate the session.
    """
    refresh = serializers.CharField(required=True)

    def validate(self, attrs):
        refresh_token = attrs.get('refresh')

        try:
            refresh = RefreshToken(refresh_token)
            user_id = refresh.payload.get('user_id')

            # Get user for logging
            User = get_user_model()
            try:
                user = User.objects.get(pk=user_id)
            except User.DoesNotExist:
                user = None

            # Blacklist the token
            refresh.blacklist()

            # Store metadata
            from authentication.models import TokenBlacklistMetadata
            request = self.context.get('request')
            ip_address = request.META.get('REMOTE_ADDR') if request else None

            TokenBlacklistMetadata.objects.get_or_create(
                token_jti=refresh.payload.get('jti'),
                defaults={
                    'user': user,
                    'reason': 'logout',
                    'ip_address': ip_address,
                }
            )

            logger.info(f"User {user.username if user else 'unknown'} logged out")
            return attrs

        except TokenError as e:
            # ✅ Token already blacklisted or expired — user is already logged out
            logger.info(f"Logout token already invalid: {str(e)}")
            return attrs

        except Exception as e:
            logger.error(f"Logout failed: {str(e)}", exc_info=True)
            raise serializers.ValidationError({'error': f'Logout failed: {str(e)}'})


class ForcePasswordChangeSerializer(serializers.Serializer):
    """
    Serializer for forced password change on first login.
    """
    temporary_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    confirm_new_password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_new_password']:
            raise serializers.ValidationError({'confirm_new_password': 'Passwords do not match.'})

        if attrs['temporary_password'] == attrs['new_password']:
            raise serializers.ValidationError({'new_password': 'New password must be different from temporary password.'})

        return attrs