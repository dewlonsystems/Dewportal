"""
Celery tasks for core app.
"""

import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model

logger = logging.getLogger('core')
User = get_user_model()


@shared_task
def send_daily_admin_summary():
    """
    Send daily summary email to admin users.
    Runs daily at 8 AM via Celery Beat.
    """
    try:
        admin_users = User.objects.filter(role='admin', is_active=True)
        
        if not admin_users:
            return {'sent_count': 0}
        
        # Gather statistics
        from payments.models import Transaction
        from audit.models import AuditLog
        from users.models import CustomUser
        
        yesterday = timezone.now() - timedelta(days=1)
        
        total_revenue = Transaction.objects.filter(
            status='completed',
            created_at__gte=yesterday
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        transaction_count = Transaction.objects.filter(
            created_at__gte=yesterday
        ).count()
        
        audit_count = AuditLog.objects.filter(
            created_at__gte=yesterday
        ).count()
        
        user_count = CustomUser.objects.filter(
            is_deleted=False
        ).count()
        
        subject = f'Daily Admin Summary - {yesterday.strftime("%Y-%m-%d")}'
        message = f"""
Hello Administrator,

Here is your daily summary for {yesterday.strftime("%Y-%m-%d")}:

TRANSACTIONS:
- Total Revenue: KES {total_revenue}
- Transaction Count: {transaction_count}

SYSTEM ACTIVITY:
- Audit Events: {audit_count}
- Total Users: {user_count}

Log in to view detailed reports: https://portal.dewlon.com/admin/

Best regards,
Dewlon Portal System
        """
        
        sent_count = 0
        for admin in admin_users:
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[admin.email],
                    fail_silently=False,
                )
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send summary to {admin.email}: {str(e)}")
        
        logger.info(f"Daily admin summary sent to {sent_count} admins")
        return {'sent_count': sent_count}
        
    except Exception as e:
        logger.error(f"Failed to send daily admin summary: {str(e)}")
        return {'error': str(e)}


@shared_task
def send_welcome_email(user_id, temporary_password):
    """
    Send welcome email to new users.
    """
    try:
        user = User.objects.get(pk=user_id)
        
        subject = 'Welcome to Dewlon Portal - Temporary Password'
        
        # Render email template
        from django.template.loader import render_to_string
        html_message = render_to_string('emails/welcome.html', {
            'first_name': user.first_name,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'temporary_password': temporary_password,
            'login_url': 'https://portal.dewlon.com/login'
        })
        
        send_mail(
            subject=subject,
            message='',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        logger.info(f"Welcome email sent to {user.email}")
        
    except Exception as e:
        logger.error(f"Failed to send welcome email to user {user_id}: {str(e)}")