import logging
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter
from django.db.models import Sum, Count, Q

from core.permissions import IsStaffOrAdmin, IsOwnerOrAdmin, IsM2MAuthenticated
from .models import Transaction
from .serializers import (
    TransactionSerializer,
    TransactionInitiateSerializer,
    MpesaCallbackSerializer,
    PaystackWebhookSerializer
)
from .mpesa import MpesaService
from .paystack import PaystackService

logger = logging.getLogger('payments')


class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing transactions.
    
    Role-based filtering:
    - Admin: All transactions across all users
    - Staff: Only their own transactions
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
        """
        Filter transactions based on user role.
        """
        queryset = super().get_queryset()
        user = self.request.user

        if user.role == 'staff':
            queryset = queryset.filter(user=user)

        return queryset


class TransactionDetailView(generics.RetrieveAPIView):
    """
    View for viewing a single transaction detail.
    """
    queryset = Transaction.objects.filter(is_deleted=False).select_related('user')
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
    serializer_class = TransactionSerializer


class InitiatePaymentView(APIView):
    """
    View for initiating a payment transaction.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Initiate payment via Mpesa or Paystack.
        """
        serializer = TransactionInitiateSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            payment_method = serializer.validated_data['payment_method']
            amount = serializer.validated_data['amount']
            phone_number = serializer.validated_data.get('phone_number')
            description = serializer.validated_data.get('description')

            # Create transaction record
            transaction = Transaction.objects.create(
                user=user,
                amount=amount,
                payment_method=payment_method,
                status='pending',
                mpesa_phone_number=phone_number if payment_method == 'mpesa' else None,
                description=description
            )

            logger.info(f"Transaction created: {transaction.reference}")

            if payment_method == 'mpesa':
                return self._initiate_mpesa(transaction, phone_number, amount)
            elif payment_method == 'paystack':
                return self._initiate_paystack(transaction, amount)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def _initiate_mpesa(self, transaction, phone_number, amount):
        """
        Initiate Mpesa STK Push.
        """
        try:
            mpesa = MpesaService()
            result = mpesa.initiate_stk_push(
                phone_number=phone_number,
                amount=amount,
                transaction_reference=transaction.reference,
                account_reference=transaction.reference
            )

            if result.get('success'):
                transaction.mpesa_checkout_request_id = result.get('checkout_request_id')
                transaction.provider_reference = result.get('merchant_request_id')
                transaction.mpesa_response_description = result.get('response_description')
                transaction.save(update_fields=[
                    'mpesa_checkout_request_id',
                    'provider_reference',
                    'mpesa_response_description'
                ])

                logger.info(f"Mpesa STK Push initiated for {transaction.reference}")

                return Response({
                    'success': True,
                    'transaction': TransactionSerializer(transaction).data,
                    'checkout_request_id': result.get('checkout_request_id'),
                    'message': result.get('customer_message', 'STK Push sent to your phone')
                }, status=status.HTTP_200_OK)
            else:
                transaction.status = 'failed'
                transaction.mpesa_response_description = result.get('response_description', 'STK Push failed')
                transaction.save(update_fields=['status', 'mpesa_response_description'])

                logger.error(f"Mpesa STK Push failed for {transaction.reference}: {result}")

                return Response({
                    'success': False,
                    'error': result.get('response_description', 'STK Push initiation failed')
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Mpesa initiation error: {str(e)}")
            transaction.status = 'failed'
            transaction.mpesa_response_description = str(e)
            transaction.save(update_fields=['status', 'mpesa_response_description'])

            return Response({
                'success': False,
                'error': 'Payment initiation failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _initiate_paystack(self, transaction, amount):
        """
        Initiate Paystack transaction.
        """
        try:
            paystack = PaystackService()
            result = paystack.initialize_transaction(
                email=transaction.user.email,
                amount=amount,
                reference=transaction.reference,
                metadata={
                    'user_id': transaction.user.id,
                    'transaction_id': transaction.id,
                    'username': transaction.user.username
                }
            )

            if result.get('success'):
                transaction.paystack_access_code = result.get('access_code')
                transaction.paystack_authorization_url = result.get('authorization_url')
                transaction.provider_reference = result.get('reference')
                transaction.save(update_fields=[
                    'paystack_access_code',
                    'paystack_authorization_url',
                    'provider_reference'
                ])

                logger.info(f"Paystack transaction initialized for {transaction.reference}")

                return Response({
                    'success': True,
                    'transaction': TransactionSerializer(transaction).data,
                    'authorization_url': result.get('authorization_url'),
                    'access_code': result.get('access_code'),
                    'message': 'Redirect to Paystack checkout to complete payment'
                }, status=status.HTTP_200_OK)
            else:
                transaction.status = 'failed'
                transaction.save(update_fields=['status'])

                logger.error(f"Paystack initialization failed for {transaction.reference}: {result}")

                return Response({
                    'success': False,
                    'error': result.get('error', 'Payment initialization failed')
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Paystack initiation error: {str(e)}")
            transaction.status = 'failed'
            transaction.save(update_fields=['status'])

            return Response({
                'success': False,
                'error': 'Payment initiation failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class MpesaCallbackView(APIView):
    """
    Mpesa STK Push callback endpoint.
    Receives payment status from Safaricom Daraja API.
    
    This endpoint must be publicly accessible and HTTPS.
    Protected by M2M authentication middleware.
    """
    permission_classes = [AllowAny]  # M2M middleware handles auth

    def post(self, request):
        """
        Handle Mpesa callback.
        """
        serializer = MpesaCallbackSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(f"Invalid Mpesa callback payload: {request.data}")
            return Response({'status': 'rejected'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            mpesa = MpesaService()
            callback_data = mpesa.parse_callback(request.data)

            checkout_request_id = callback_data.get('checkout_request_id')
            is_success = callback_data.get('success')
            result_description = callback_data.get('result_description')
            transaction_data = callback_data.get('transaction_data', {})

            # Find transaction by checkout request ID
            try:
                transaction = Transaction.objects.get(
                    mpesa_checkout_request_id=checkout_request_id
                )
            except Transaction.DoesNotExist:
                logger.warning(f"Transaction not found for CheckoutRequestID: {checkout_request_id}")
                return Response({'status': 'accepted'})

            # Update transaction status
            if is_success:
                transaction.update_status(
                    'completed',
                    callback_payload=request.data,
                    provider_reference=transaction_data.get('receipt_number')
                )
                transaction.mpesa_receipt_number = transaction_data.get('receipt_number')
                transaction.save(update_fields=['mpesa_receipt_number'])
                logger.info(f"Mpesa payment completed: {transaction.reference}")
            else:
                transaction.update_status(
                    'failed',
                    callback_payload=request.data
                )
                transaction.mpesa_response_description = result_description
                transaction.save(update_fields=['mpesa_response_description'])
                logger.info(f"Mpesa payment failed: {transaction.reference} - {result_description}")

            return Response({'status': 'accepted'})

        except Exception as e:
            logger.error(f"Mpesa callback processing error: {str(e)}")
            return Response({'status': 'accepted'})  # Always accept to prevent retries


@method_decorator(csrf_exempt, name='dispatch')
class PaystackWebhookView(APIView):
    """
    Paystack webhook endpoint.
    Receives payment notifications from Paystack.
    
    This endpoint must be publicly accessible and HTTPS.
    Protected by signature verification.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Handle Paystack webhook.
        """
        # Verify webhook signature
        signature = request.headers.get('X-Paystack-Signature')
        paystack = PaystackService()

        if not paystack.verify_webhook_signature(request.body, signature):
            logger.warning("Invalid Paystack webhook signature")
            return Response({'status': 'rejected'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            webhook_data = paystack.parse_webhook(request.data)
            event = webhook_data.get('event')

            # Only process charge.success events
            if event != 'charge.success':
                logger.info(f"Paystack webhook event ignored: {event}")
                return Response({'status': 'accepted'})

            reference = webhook_data.get('reference')

            # Find transaction by reference
            try:
                transaction = Transaction.objects.get(reference=reference)
            except Transaction.DoesNotExist:
                logger.warning(f"Transaction not found for reference: {reference}")
                return Response({'status': 'accepted'})

            # Verify transaction amount matches
            if webhook_data.get('amount') != float(transaction.amount):
                logger.warning(f"Amount mismatch for {reference}")
                return Response({'status': 'accepted'})

            # Update transaction status
            transaction.update_status(
                'completed',
                callback_payload=request.data,
                provider_reference=reference
            )
            logger.info(f"Paystack payment completed: {transaction.reference}")

            return Response({'status': 'accepted'})

        except Exception as e:
            logger.error(f"Paystack webhook processing error: {str(e)}")
            return Response({'status': 'accepted'})


class TransactionSummaryView(APIView):
    """
    View for transaction summary statistics.
    Used for dashboard ATM-style summary cards.
    """
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    def get(self, request):
        """
        Return transaction summary.
        """
        user = request.user

        # Build filter based on role
        if user.role == 'admin':
            queryset = Transaction.objects.filter(is_deleted=False)
        else:
            queryset = Transaction.objects.filter(is_deleted=False, user=user)

        # Calculate totals
        total_revenue = queryset.filter(status='completed').aggregate(
            total=Sum('amount')
        )['total'] or 0

        completed_count = queryset.filter(status='completed').count()
        pending_count = queryset.filter(status='pending').count()
        failed_count = queryset.filter(status='failed').count()

        return Response({
            'total_revenue': str(total_revenue),
            'currency': 'KES',
            'completed_transactions': completed_count,
            'pending_transactions': pending_count,
            'failed_transactions': failed_count,
            'total_transactions': completed_count + pending_count + failed_count
        })