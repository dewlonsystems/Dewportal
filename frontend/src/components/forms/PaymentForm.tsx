// =============================================================================
// DEWPORTAL FRONTEND - PAYMENT FORM
// =============================================================================
// Payment initiation form for Mpesa and Paystack.
// =============================================================================

'use client';

import { useState } from 'react';
import { useForm, FormProvider, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from './FormField';
import { Button, Alert, Spinner, Card, Badge } from '@/components/ui';
import { transactionInitiateSchema, TransactionInitiateInput } from '@/lib/validations';
import { PaymentMethod } from '@/types';
import { cn } from '@/lib/utils';
import { PAYMENT_CONFIG } from '@/constants/config';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface PaymentFormProps {
  onSubmit?: (data: TransactionInitiateInput) => Promise<void>;
  onSuccess?: (response: unknown) => void;
  onError?: (error: string) => void;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function PaymentForm({
  onSubmit,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const methods = useForm<TransactionInitiateInput>({
    resolver: zodResolver(transactionInitiateSchema) as Resolver<TransactionInitiateInput>,
    defaultValues: {
      payment_method: 'mpesa' as const,
      amount: 0,
      phone_number: '',
      description: '',
    },
  });

  const { handleSubmit, watch, setValue } = methods;
  const paymentMethod = watch('payment_method');
  const amount = watch('amount');

  // ---------------------------------------------------------------------------
  // Handle Submit
  // ---------------------------------------------------------------------------

  const handleFormSubmit = async (data: TransactionInitiateInput): Promise<void> => {
    try {
      setIsSubmitting(true);
      setError(null);

      await onSubmit?.(data);
      onSuccess?.(data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(
          handleFormSubmit as Parameters<typeof handleSubmit>[0]
        )}
        className="space-y-6"
      >
        {/* Error Alert */}
        {error && (
          <Alert variant="error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Payment Method Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-text">
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-4">
            {/* Mpesa */}
            {PAYMENT_CONFIG.MPESA.ENABLED && (
              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('mpesa');
                  setValue('payment_method', 'mpesa');
                }}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all',
                  paymentMethod === 'mpesa'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                  <span className="font-medium">Mpesa</span>
                </div>
              </button>
            )}

            {/* Paystack */}
            {PAYMENT_CONFIG.PAYSTACK.ENABLED && (
              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('paystack');
                  setValue('payment_method', 'paystack');
                }}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all',
                  paymentMethod === 'paystack'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                  <span className="font-medium">Paystack</span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Amount */}
        <FormField<TransactionInitiateInput>
          name="amount"
          label="Amount (KES)"
          type="number"
          placeholder="Enter amount"
          min={1}
          max={PAYMENT_CONFIG.MPESA.MAX_AMOUNT}
          fullWidth
        />

        {/* Phone Number (Mpesa Only) */}
        {paymentMethod === 'mpesa' && (
          <FormField<TransactionInitiateInput>
            name="phone_number"
            label="Mpesa Phone Number"
            type="tel"
            placeholder="e.g., 0712345678"
            hint="Format: 07XXXXXXXX or 2547XXXXXXXX"
            fullWidth
          />
        )}

        {/* Description */}
        <FormField<TransactionInitiateInput>
          name="description"
          label="Description (Optional)"
          type="text"
          placeholder="What is this payment for?"
          fullWidth
        />

        {/* Payment Info */}
        <div className="p-4 bg-background rounded-lg border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-muted">Payment Method:</span>
            <Badge variant="info">
              {paymentMethod === 'mpesa' ? 'Mpesa' : 'Paystack'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">Amount:</span>
            <span className="font-semibold text-text">
              KES {amount ? Number(amount).toLocaleString() : '0.00'}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          disabled={!selectedMethod}
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" color="white" />
              <span className="ml-2">Processing...</span>
            </>
          ) : (
            `Pay KES ${amount ? Number(amount).toLocaleString() : '0.00'}`
          )}
        </Button>
      </form>
    </FormProvider>
  );
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default PaymentForm;