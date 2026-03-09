// =============================================================================
// DEWPORTAL FRONTEND - PAYMENTS PAGE
// =============================================================================
// Payment initiation page with Mpesa and Paystack options.
// =============================================================================

'use client';

import { useState } from 'react';
import { PaymentForm } from '@/components/forms';
import { Card, CardContent, Alert, Spinner } from '@/components/ui';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency } from '@/lib/utils';
import { TransactionInitiateInput } from '@/lib/validations';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function PaymentsPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{ success: boolean; message: string } | null>(null);

  const { refreshTransactions } = useTransactions();

  // ---------------------------------------------------------------------------
  // Handle Payment Submit
  // ---------------------------------------------------------------------------

  const handlePaymentSubmit = async (data: TransactionInitiateInput) => {
    try {
      setIsProcessing(true);
      setPaymentResult(null);

      // TODO: Call server action to initiate payment
      // const result = await initiatePaymentAction(data);

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setPaymentResult({
        success: true,
        message: 'Payment initiated successfully. Check your phone to complete the transaction.',
      });

      // Refresh transactions list
      refreshTransactions();

    } catch (error) {
      setPaymentResult({
        success: false,
        message: error instanceof Error ? error.message : 'Payment failed',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Payments</h1>
        <p className="text-text-muted">Initiate new payments via Mpesa or Paystack</p>
      </div>

      {/* Payment Result Alert */}
      {paymentResult && (
        <Alert
          variant={paymentResult.success ? 'success' : 'error'}
          dismissible
          onDismiss={() => setPaymentResult(null)}
        >
          {paymentResult.message}
        </Alert>
      )}

      {/* Payment Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Form */}
        <div className="lg:col-span-2">
          <Card>
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-text">New Payment</h3>
              <p className="text-sm text-text-muted">Fill in the payment details</p>
            </div>
            <CardContent className="p-6">
              {isProcessing ? (
                <div className="flex items-center justify-center h-64">
                  <Spinner size="lg" />
                </div>
              ) : (
                <PaymentForm onSubmit={handlePaymentSubmit} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment Info */}
        <div className="space-y-6">
          <Card>
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-text">Payment Methods</h3>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-success" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-text">Mpesa</p>
                  <p className="text-sm text-text-muted">STK Push to phone</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-text">Paystack</p>
                  <p className="text-sm text-text-muted">Card & mobile money</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-text">Payment Limits</h3>
            </div>
            <CardContent className="p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Minimum</span>
                <span className="font-medium text-text">KES 1</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Maximum (Mpesa)</span>
                <span className="font-medium text-text">KES 150,000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Maximum (Paystack)</span>
                <span className="font-medium text-text">KES 1,000,000</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}