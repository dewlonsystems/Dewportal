from django.db.models.signals import post_save
from django.dispatch import receiver
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from django.utils import timezone
import logging

from authentication.models import TokenBlacklistMetadata
from users.models import CustomUser

logger = logging.getLogger('authentication')


@receiver(post_save, sender=BlacklistedToken)
def create_token_blacklist_metadata(sender, instance, created, **kwargs):
    """
    Automatically create metadata when a token is blacklisted.
    This ensures all blacklisted tokens are tracked for audit purposes.
    """
    if created:
        try:
            # Get user from outstanding token
            outstanding = instance.token
            user_id = outstanding.user_id

            if user_id:
                try:
                    user = CustomUser.objects.get(pk=user_id)
                except CustomUser.DoesNotExist:
                    user = None

                # Check if metadata already exists
                exists = TokenBlacklistMetadata.objects.filter(
                    token_jti=outstanding.jti
                ).exists()

                if not exists:
                    TokenBlacklistMetadata.objects.create(
                        token_jti=outstanding.jti,
                        user=user,
                        reason='auto_blacklist',
                        blacklisted_at=timezone.now()
                    )
        except Exception as e:
            logger.error(f"Failed to create token blacklist metadata: {str(e)}")