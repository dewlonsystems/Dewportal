from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TransactionViewSet,
    TransactionDetailView,
    InitiatePaymentView,
    MpesaCallbackView,
    PaystackWebhookView,
    PaystackVerifyView,
    TransactionSummaryView,
    TransactionReceiptView,
    TransactionExportView,
)

app_name = 'payments'

router = DefaultRouter()
router.register(r'transactions', TransactionViewSet, basename='transaction')

urlpatterns = [
    # Transaction management
    path('', include(router.urls)),
    path('transactions/<int:pk>/', TransactionDetailView.as_view(), name='transaction-detail'),

    # Receipt PDF
    path('transactions/<int:pk>/receipt/', TransactionReceiptView.as_view(), name='transaction-receipt'),

    # Export (PDF or Excel)
    path('export/', TransactionExportView.as_view(), name='transaction-export'),

    # Payment initiation
    path('initiate/', InitiatePaymentView.as_view(), name='initiate-payment'),

    # Paystack verify (called from frontend after redirect back)
    path('paystack/verify/', PaystackVerifyView.as_view(), name='paystack-verify'),

    # Payment callbacks/webhooks (public endpoints)
    path('callbacks/mpesa/', MpesaCallbackView.as_view(), name='mpesa-callback'),
    path('webhooks/paystack/', PaystackWebhookView.as_view(), name='paystack-webhook'),

    # Transaction summary
    path('summary/', TransactionSummaryView.as_view(), name='transaction-summary'),
]