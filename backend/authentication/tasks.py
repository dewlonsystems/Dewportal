"""
Celery tasks for authentication app.
"""

import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
from django.conf import settings
from users.models import CustomUser

logger = logging.getLogger('authentication')


@shared_task
def reactivate_locked_accounts():
    """
    Reactivate accounts that have been locked due to failed login attempts.
    Runs every 15 minutes via Celery Beat.
    """
    now = timezone.now()
    
    # Find accounts that are locked and past their lockout time
    locked_accounts = CustomUser.objects.filter(
        is_active=False,
        locked_until__isnull=False,
        locked_until__lte=now
    )
    
    reactivated_count = 0
    
    for user in locked_accounts:
        try:
            user.is_active = True
            user.locked_until = None
            user.failed_login_attempts = 0
            user.save(update_fields=['is_active', 'locked_until', 'failed_login_attempts'])
            
            logger.info(f"Account reactivated: {user.username}")
            reactivated_count += 1
            
            # Log audit event
            from audit.models import AuditLog
            AuditLog.log_event(
                user=user,
                action_type='account_locked',
                category='authentication',
                description=f'Account automatically reactivated after lockout period',
                severity='info'
            )
            
        except Exception as e:
            logger.error(f"Failed to reactivate account {user.username}: {str(e)}")
    
    logger.info(f"Reactivated {reactivated_count} locked accounts")
    return {'reactivated_count': reactivated_count}


@shared_task
def send_lockout_email(user_id):
    """
    Send account lockout notification email.
    """
    try:
        user = CustomUser.objects.get(pk=user_id)
        
        subject = 'Account Locked - Dewlon Portal'
        message = f"""
Hello {user.first_name},

Your account has been temporarily locked due to multiple failed login attempts.

Lockout Time: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}
Auto-Reactivation: {(timezone.now() + timedelta(hours=3)).strftime('%Y-%m-%d %H:%M:%S')}

Your account will be automatically reactivated after 3 hours.

If you did not attempt to log in, please contact our security team immediately.

Best regards,
Dewlon Portal Security Team
        """
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        logger.info(f"Lockout email sent to {user.email}")
        
    except Exception as e:
        logger.error(f"Failed to send lockout email to user {user_id}: {str(e)}")


@shared_task
def blacklist_user_tokens(user_id, reason='account_disabled'):
    """
    Blacklist all tokens for a user when they are disabled or deleted.
    """
    try:
        from rest_framework_simplejwt.tokens import RefreshToken
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
        
        # Find all outstanding tokens for this user
        tokens = OutstandingToken.objects.filter(user_id=user_id)
        
        blacklisted_count = 0
        for token in tokens:
            try:
                refresh = RefreshToken(token.token)
                refresh.blacklist()
                blacklisted_count += 1
            except Exception:
                pass
        
        logger.info(f"Blacklisted {blacklisted_count} tokens for user {user_id}")
        return {'blacklisted_count': blacklisted_count}
        
    except Exception as e:
        logger.error(f"Failed to blacklist tokens for user {user_id}: {str(e)}")
        return {'error': str(e)}