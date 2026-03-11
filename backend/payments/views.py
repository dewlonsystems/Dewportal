# =============================================================================
# DEWPORTAL BACKEND - PAYMENTS VIEWS
# =============================================================================
import logging
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db.models import Sum
from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter

from core.permissions import IsStaffOrAdmin, IsOwnerOrAdmin
from .models import Transaction
from .serializers import (
    TransactionSerializer,
    TransactionInitiateSerializer,
    MpesaCallbackSerializer,
    PaystackWebhookSerializer,
)
from .mpesa import MpesaService
from .paystack import PaystackService

logger = logging.getLogger('payments')


# =============================================================================
# Helpers
# =============================================================================

def _push_to_websocket(group_name: str, event_type: str, data: dict):
    """
    Push a message to a Django Channels group safely.
    Swallows errors so a Channels failure never breaks a payment callback.
    """
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            group_name,
            {'type': event_type, 'data': data},
        )
    except Exception as e:
        logger.error(f"WebSocket push failed [{group_name}]: {str(e)}")


def _notify_payment_update(transaction: Transaction, result_desc: str = None):
    """
    Push payment_status_update to the user's personal WS channel
    and a transaction_update to the admin channel.
    """
    payload = {
        'transaction_id': transaction.id,
        'reference':      transaction.reference,
        'status':         transaction.status,
        'amount':         str(transaction.amount),
        'payment_method': transaction.payment_method,
        'result_desc':    result_desc or '',
    }

    # ── User channel ──────────────────────────────────────────────────────────
    _push_to_websocket(
        f'user_{transaction.user.id}',
        'payment_status_update',   # matches frontend WebSocket listener
        payload,
    )

    # ── Admin channel ─────────────────────────────────────────────────────────
    _push_to_websocket(
        'admin_notifications',
        'transaction_update',
        {**payload, 'user_id': transaction.user.id, 'username': transaction.user.username},
    )


def _create_audit_log(user, action_type: str, description: str,
                      transaction: Transaction = None, request=None,
                      severity: str = 'info'):
    """
    Create an audit log entry, swallowing errors so audit never breaks payments.
    """
    try:
        from audit.models import AuditLog
        ip = None
        if request:
            xff = request.META.get('HTTP_X_FORWARDED_FOR')
            ip = xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')

        AuditLog.objects.create(
            user=user,
            action_type=action_type,
            severity=severity,
            category='payment',
            description=description,
            ip_address=ip,
            details={
                'transaction_id':  transaction.id        if transaction else None,
                'reference':       transaction.reference if transaction else None,
                'amount':          str(transaction.amount) if transaction else None,
                'payment_method':  transaction.payment_method if transaction else None,
            },
        )
    except Exception as e:
        logger.error(f"Audit log creation failed: {str(e)}")


# =============================================================================
# Transaction ViewSet
# =============================================================================

class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset.
    Admin → all transactions.
    Staff → own transactions only.
    """
    queryset = Transaction.objects.filter(is_deleted=False).select_related('user')
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]
    serializer_class = TransactionSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_fields = ['status', 'payment_method', 'user']
    search_fields = ['reference', 'provider_reference', 'user__username', 'user__email']
    ordering_fields = ['created_at', 'amount', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'staff':
            qs = qs.filter(user=self.request.user)
        return qs


# =============================================================================
# Transaction Detail
# =============================================================================

class TransactionDetailView(generics.RetrieveAPIView):
    queryset = Transaction.objects.filter(is_deleted=False).select_related('user')
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
    serializer_class = TransactionSerializer


# =============================================================================
# Initiate Payment
# =============================================================================

class InitiatePaymentView(APIView):
    """
    POST /api/payments/initiate/
    Initiate an Mpesa STK Push or a Paystack checkout.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TransactionInitiateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user           = request.user
        payment_method = serializer.validated_data['payment_method']
        amount         = serializer.validated_data['amount']
        phone_number   = serializer.validated_data.get('phone_number')
        description    = serializer.validated_data.get('description', '')

        # ── Create pending transaction ─────────────────────────────────────────
        transaction = Transaction.objects.create(
            user=user,
            amount=amount,
            payment_method=payment_method,
            status='pending',
            mpesa_phone_number=phone_number if payment_method == 'mpesa' else None,
            description=description,
        )
        logger.info(f"Transaction created: {transaction.reference} | {user.username} | {amount} KES")

        _create_audit_log(
            user=user,
            action_type='transaction_initiated',
            description=f"{payment_method.title()} payment initiated: {transaction.reference}",
            transaction=transaction,
            request=request,
        )

        if payment_method == 'mpesa':
            return self._initiate_mpesa(transaction, phone_number, amount, request)
        return self._initiate_paystack(transaction, user.email, amount, request)

    # ── Mpesa ──────────────────────────────────────────────────────────────────

    def _initiate_mpesa(self, transaction, phone_number, amount, request):
        try:
            result = MpesaService().initiate_stk_push(
                phone_number=phone_number,
                amount=amount,
                transaction_reference=transaction.reference,
                account_reference=transaction.reference,
            )

            if result.get('success'):
                transaction.mpesa_checkout_request_id   = result.get('checkout_request_id')
                transaction.provider_reference          = result.get('merchant_request_id')
                transaction.mpesa_response_description  = result.get('response_description')
                transaction.save(update_fields=[
                    'mpesa_checkout_request_id',
                    'provider_reference',
                    'mpesa_response_description',
                ])
                logger.info(f"STK Push sent: {transaction.reference}")

                return Response({
                    'success': True,
                    'transaction': TransactionSerializer(transaction).data,
                    'checkout_request_id': result.get('checkout_request_id'),
                    'message': result.get('customer_message', 'STK Push sent to your phone'),
                }, status=status.HTTP_200_OK)

            # STK Push failed immediately
            transaction.status = 'failed'
            transaction.mpesa_response_description = result.get('response_description', 'STK Push failed')
            transaction.save(update_fields=['status', 'mpesa_response_description'])

            _create_audit_log(
                user=transaction.user,
                action_type='transaction_failed',
                description=f"STK Push failed: {transaction.reference}",
                transaction=transaction,
                request=request,
                severity='error',
            )

            return Response({
                'success': False,
                'error': result.get('response_description', 'STK Push initiation failed'),
            }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Mpesa initiation error [{transaction.reference}]: {str(e)}")
            transaction.status = 'failed'
            transaction.mpesa_response_description = str(e)
            transaction.save(update_fields=['status', 'mpesa_response_description'])
            return Response({'success': False, 'error': 'Payment initiation failed'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ── Paystack ───────────────────────────────────────────────────────────────

    def _initiate_paystack(self, transaction, email, amount, request):
        try:
            result = PaystackService().initialize_transaction(
                email=email,
                amount=amount,
                reference=transaction.reference,
                metadata={
                    'user_id':        transaction.user.id,
                    'transaction_id': transaction.id,
                    'username':       transaction.user.username,
                },
            )

            if result.get('success'):
                transaction.paystack_access_code       = result.get('access_code')
                transaction.paystack_authorization_url = result.get('authorization_url')
                transaction.provider_reference         = result.get('reference')
                transaction.save(update_fields=[
                    'paystack_access_code',
                    'paystack_authorization_url',
                    'provider_reference',
                ])
                logger.info(f"Paystack initialized: {transaction.reference}")

                return Response({
                    'success': True,
                    'transaction':      TransactionSerializer(transaction).data,
                    'authorization_url': result.get('authorization_url'),
                    'access_code':      result.get('access_code'),
                    'message':          'Redirect to Paystack checkout to complete payment',
                }, status=status.HTTP_200_OK)

            transaction.status = 'failed'
            transaction.save(update_fields=['status'])

            _create_audit_log(
                user=transaction.user,
                action_type='transaction_failed',
                description=f"Paystack init failed: {transaction.reference}",
                transaction=transaction,
                request=request,
                severity='error',
            )

            return Response({
                'success': False,
                'error': result.get('error', 'Payment initialization failed'),
            }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Paystack initiation error [{transaction.reference}]: {str(e)}")
            transaction.status = 'failed'
            transaction.save(update_fields=['status'])
            return Response({'success': False, 'error': 'Payment initiation failed'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# Paystack Verify  (called from frontend /payments/verify?reference=xxx)
# =============================================================================

class PaystackVerifyView(APIView):
    """
    GET /api/v1/payments/paystack/verify/?reference=DP...
    Called by the frontend verify page after Paystack redirects the user back.
    
    🔐 SECURITY: 
    - Allows unauthenticated access (user may not be logged in after Paystack redirect)
    - Validates ownership ONLY if user is authenticated
    - Returns minimal data for unauthenticated requests
    """
    permission_classes = [AllowAny]  # ✅ Changed from IsAuthenticated

    def get(self, request):
        reference = request.query_params.get('reference')
        if not reference:
            return Response({'error': 'Reference is required'},
                            status=status.HTTP_400_BAD_REQUEST)

        # ── Find the transaction ───────────────────────────────────────────────
        try:
            transaction = Transaction.objects.get(reference=reference)
        except Transaction.DoesNotExist:
            return Response({'error': 'Transaction not found'},
                            status=status.HTTP_404_NOT_FOUND)

        # ── Ownership check (ONLY if user is authenticated) ────────────────────
        if request.user.is_authenticated:
            if request.user.role != 'admin' and transaction.user != request.user:
                logger.warning(
                    f"Unauthorized access attempt to transaction {reference} | "
                    f"User: {request.user.username} | IP: {request.META.get('REMOTE_ADDR')}"
                )
                return Response({'error': 'Permission denied'},
                                status=status.HTTP_403_FORBIDDEN)

        # ── Already resolved — return immediately ─────────────────────────────
        if transaction.status in ('completed', 'failed', 'cancelled'):
            # Return full data if authenticated, minimal if not
            if request.user.is_authenticated:
                transaction_data = TransactionSerializer(transaction).data
            else:
                # 🔒 Minimal data for unauthenticated requests (security)
                transaction_data = {
                    'reference': transaction.reference,
                    'status': transaction.status,
                    'amount': str(transaction.amount),
                    'payment_method': transaction.payment_method,
                    'created_at': transaction.created_at.isoformat(),
                }
            
            return Response({
                'success': transaction.status == 'completed',
                'status':  transaction.status,
                'transaction': transaction_data,
            })

        # ── Ask Paystack ───────────────────────────────────────────────────────
        try:
            result = PaystackService().verify_transaction(reference)
        except Exception as e:
            logger.error(f"Paystack verify API error [{reference}]: {str(e)}")
            return Response({'error': 'Verification service unavailable'},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if not result.get('success'):
            return Response({
                'success': False,
                'status': 'pending',
                'message': result.get('error', 'Verification failed — transaction may still be processing'),
                'transaction': {
                    'reference': transaction.reference,
                    'status': transaction.status,
                } if not request.user.is_authenticated else TransactionSerializer(transaction).data,
            })

        paystack_status = result.get('status')   # 'success', 'failed', 'abandoned'

        # ── Map Paystack status → our status ──────────────────────────────────
        if paystack_status == 'success':
            if transaction.can_transition_to('completed'):
                try:
                    transaction.update_status(
                        'completed',
                        callback_payload=result,
                        provider_reference=reference,
                    )
                    _notify_payment_update(transaction)
                    
                    # Only log audit if user is authenticated
                    if request.user.is_authenticated:
                        _create_audit_log(
                            user=request.user,
                            action_type='transaction_completed',
                            description=f"Paystack payment verified & completed: {reference}",
                            transaction=transaction,
                            request=request,
                        )
                except ValueError as e:
                    logger.warning(f"Status transition error [{reference}]: {str(e)}")

            return Response({
                'success': True,
                'status': 'completed',
                'transaction': TransactionSerializer(transaction).data if request.user.is_authenticated else {
                    'reference': transaction.reference,
                    'status': 'completed',
                    'amount': str(transaction.amount),
                },
            })

        elif paystack_status in ('failed', 'abandoned'):
            if transaction.can_transition_to('failed'):
                try:
                    transaction.update_status('failed', callback_payload=result)
                    _notify_payment_update(transaction, result_desc=f"Paystack: {paystack_status}")
                except ValueError:
                    pass

            return Response({
                'success': False,
                'status': 'failed',
                'message': f'Payment {paystack_status} on Paystack',
                'transaction': TransactionSerializer(transaction).data if request.user.is_authenticated else {
                    'reference': transaction.reference,
                    'status': 'failed',
                },
            })

        # pending / processing
        return Response({
            'success': False,
            'status': 'pending',
            'message': 'Payment is still being processed',
            'transaction': {
                'reference': transaction.reference,
                'status': 'pending',
            } if not request.user.is_authenticated else TransactionSerializer(transaction).data,
        })


# =============================================================================
# Mpesa Callback  (called by Safaricom Daraja — public endpoint)
# =============================================================================

@method_decorator(csrf_exempt, name='dispatch')
class MpesaCallbackView(APIView):
    """
    POST /api/payments/mpesa/callback/
    Receives STK Push result from Safaricom. Always returns 200 to prevent retries.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = MpesaCallbackSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(f"Invalid Mpesa callback: {request.data}")
            return Response({'status': 'rejected'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            callback   = MpesaService().parse_callback(request.data)
            checkout_id = callback.get('checkout_request_id')
            is_success  = callback.get('success')
            result_desc = callback.get('result_description', '')
            tx_data     = callback.get('transaction_data', {})

            try:
                transaction = Transaction.objects.select_related('user').get(
                    mpesa_checkout_request_id=checkout_id
                )
            except Transaction.DoesNotExist:
                logger.warning(f"No transaction for CheckoutRequestID: {checkout_id}")
                return Response({'status': 'accepted'})   # still 200

            new_status = 'completed' if is_success else 'failed'

            if not transaction.can_transition_to(new_status):
                logger.info(f"Skipping duplicate callback for {transaction.reference} "
                            f"(already {transaction.status})")
                return Response({'status': 'accepted'})

            # ── Update transaction ────────────────────────────────────────────
            transaction.update_status(
                new_status,
                callback_payload=request.data,
                provider_reference=tx_data.get('receipt_number') if is_success else None,
            )

            if is_success:
                transaction.mpesa_receipt_number = tx_data.get('receipt_number')
                transaction.save(update_fields=['mpesa_receipt_number'])
            else:
                transaction.mpesa_response_description = result_desc
                transaction.save(update_fields=['mpesa_response_description'])

            # ── Push to frontend via WebSocket ────────────────────────────────
            _notify_payment_update(
                transaction,
                result_desc=result_desc if not is_success else None,
            )

            # ── Audit ─────────────────────────────────────────────────────────
            _create_audit_log(
                user=transaction.user,
                action_type='transaction_completed' if is_success else 'transaction_failed',
                description=(
                    f"Mpesa callback received: {transaction.reference} → {new_status}"
                    + (f" | {result_desc}" if result_desc else '')
                ),
                transaction=transaction,
                severity='info' if is_success else 'warning',
            )

            logger.info(
                f"Mpesa callback processed: {transaction.reference} → {new_status}"
                + (f" ({result_desc})" if not is_success else '')
            )

        except Exception as e:
            logger.error(f"Mpesa callback error: {str(e)}", exc_info=True)
            # Always return 200 — never let Safaricom retry due to our error

        return Response({'status': 'accepted'})


# =============================================================================
# Paystack Webhook  (called by Paystack — public endpoint)
# =============================================================================

@method_decorator(csrf_exempt, name='dispatch')
class PaystackWebhookView(APIView):
    """
    POST /api/payments/paystack/webhook/
    Receives charge.success events from Paystack.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # ── Signature verification ─────────────────────────────────────────────
        signature = request.headers.get('X-Paystack-Signature')
        if not PaystackService().verify_webhook_signature(request.body, signature):
            logger.warning("Invalid Paystack webhook signature — rejected")
            return Response({'status': 'rejected'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            data      = PaystackService().parse_webhook(request.data)
            event     = data.get('event')
            reference = data.get('reference')

            if event != 'charge.success':
                logger.info(f"Paystack webhook ignored: {event}")
                return Response({'status': 'accepted'})

            try:
                transaction = Transaction.objects.select_related('user').get(
                    reference=reference
                )
            except Transaction.DoesNotExist:
                logger.warning(f"No transaction for Paystack reference: {reference}")
                return Response({'status': 'accepted'})

            # ── Amount guard ──────────────────────────────────────────────────
            webhook_amount = data.get('amount', 0)
            if abs(float(webhook_amount) - float(transaction.amount)) > 0.01:
                logger.warning(
                    f"Amount mismatch for {reference}: "
                    f"expected {transaction.amount}, got {webhook_amount}"
                )
                return Response({'status': 'accepted'})

            if not transaction.can_transition_to('completed'):
                logger.info(f"Skipping duplicate Paystack webhook for {reference} "
                            f"(already {transaction.status})")
                return Response({'status': 'accepted'})

            # ── Update transaction ────────────────────────────────────────────
            transaction.update_status(
                'completed',
                callback_payload=request.data,
                provider_reference=reference,
            )

            # ── Push to frontend via WebSocket ────────────────────────────────
            _notify_payment_update(transaction)

            # ── Audit ─────────────────────────────────────────────────────────
            _create_audit_log(
                user=transaction.user,
                action_type='transaction_completed',
                description=f"Paystack webhook confirmed: {reference}",
                transaction=transaction,
                severity='info',
            )

            logger.info(f"Paystack webhook processed: {reference} → completed")

        except Exception as e:
            logger.error(f"Paystack webhook error: {str(e)}", exc_info=True)

        return Response({'status': 'accepted'})


# =============================================================================
# Transaction Summary
# =============================================================================

class TransactionSummaryView(APIView):
    """
    GET /api/payments/summary/
    Dashboard summary cards.
    """
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    def get(self, request):
        user = request.user
        qs = Transaction.objects.filter(is_deleted=False)
        if user.role != 'admin':
            qs = qs.filter(user=user)

        total_revenue = qs.filter(status='completed').aggregate(
            total=Sum('amount')
        )['total'] or 0

        return Response({
            'total_revenue':          str(total_revenue),
            'currency':               'KES',
            'completed_transactions': qs.filter(status='completed').count(),
            'pending_transactions':   qs.filter(status='pending').count(),
            'failed_transactions':    qs.filter(status='failed').count(),
            'total_transactions':     qs.exclude(status='cancelled').count(),
        })