"""
Celery tasks for payments app.
"""

import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Transaction
from .mpesa import MpesaService

logger = logging.getLogger('payments')


@shared_task
def verify_pending_mpesa_transactions():
    """
    Verify pending Mpesa transactions that haven't received callbacks.
    Runs every 5 minutes via Celery Beat.
    """
    now = timezone.now()
    
    # Find pending Mpesa transactions older than 5 minutes
    pending_transactions = Transaction.objects.filter(
        payment_method='mpesa',
        status='pending',
        mpesa_checkout_request_id__isnull=False,
        created_at__lte=now - timedelta(minutes=5)
    )
    
    verified_count = 0
    
    for transaction in pending_transactions:
        try:
            mpesa = MpesaService()
            result = mpesa.query_stk_status(transaction.mpesa_checkout_request_id)
            
            # Process query result
            if result.get('ResultCode') == '0':
                transaction.update_status('completed', callback_payload=result)
            else:
                transaction.update_status('failed', callback_payload=result)
            
            verified_count += 1
            logger.info(f"Verified Mpesa transaction: {transaction.reference}")
            
        except Exception as e:
            logger.error(f"Failed to verify Mpesa transaction {transaction.reference}: {str(e)}")
    
    logger.info(f"Verified {verified_count} pending Mpesa transactions")
    return {'verified_count': verified_count}


@shared_task
def send_payment_confirmation_email(transaction_id):
    """
    Send payment confirmation email to user.
    """
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        
        transaction = Transaction.objects.get(pk=transaction_id)
        user = transaction.user
        
        subject = f'Payment Confirmation - {transaction.reference}'
        message = f"""
Hello {user.first_name},

Your payment has been successfully processed.

Transaction Details:
- Reference: {transaction.reference}
- Amount: KES {transaction.amount}
- Payment Method: {transaction.payment_method.title()}
- Status: {transaction.status.title()}
- Date: {transaction.created_at.strftime('%Y-%m-%d %H:%M:%S')}

Thank you for using Dewlon Portal.

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
        
        logger.info(f"Payment confirmation email sent to {user.email}")
        
    except Exception as e:
        logger.error(f"Failed to send payment confirmation email: {str(e)}")