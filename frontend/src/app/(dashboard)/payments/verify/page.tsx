// =============================================================================
// DEWPORTAL FRONTEND - PAYSTACK VERIFY PAGE
// =============================================================================
// src/app/dashboard/payments/verify/page.tsx
// =============================================================================

'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { verifyPaystackPaymentAction } from '@/server-actions/payments';
import { CheckCircle2, XCircle, Clock, ArrowLeft, RefreshCw } from 'lucide-react';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type VerifyState = 'verifying' | 'success' | 'failed' | 'pending';

// -----------------------------------------------------------------------------
// Inner Component
// -----------------------------------------------------------------------------

function VerifyContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  // Paystack sends either ?reference= or ?trxref= on redirect back
  const reference = searchParams.get('reference') || searchParams.get('trxref');

  const [state, setState]               = useState<VerifyState>('verifying');
  const [txReference, setTxReference]   = useState<string | null>(null);
  const [txAmount, setTxAmount]         = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasVerified                     = useRef(false);

  useEffect(() => {
    if (!reference || hasVerified.current) return;
    hasVerified.current = true;

    const verify = async () => {
      try {
        // Give the Paystack webhook a head start to hit Django first
        await new Promise(r => setTimeout(r, 1500));

        const result = await verifyPaystackPaymentAction(reference);

        // Server action itself failed (network, auth, etc.)
        if (!result.success || !result.data) {
          setState('failed');
          setErrorMessage(result.error || 'Verification request failed. Please contact support.');
          return;
        }

        const { status: txStatus, message, transaction: tx } = result.data;

        // Store reference + amount for display
        setTxReference(tx?.reference || reference);
        setTxAmount(
          tx?.amount
            ? `KES ${Number(tx.amount).toLocaleString('en-KE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            : null
        );

        if (txStatus === 'completed') {
          setState('success');
        } else if (txStatus === 'failed') {
          setState('failed');
          setErrorMessage(message || 'Payment was not completed on Paystack.');
        } else {
          // pending — webhook may still be processing
          setState('pending');
        }

      } catch (err) {
        setState('failed');
        setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    };

    verify();
  }, [reference]);

  // ── No reference in URL ──────────────────────────────────────────────────────

  if (!reference) {
    return (
      <div className="min-h-screen bg-[#f7f4ef] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 border-4 border-red-100 flex items-center justify-center mx-auto mb-5">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Invalid Link</h2>
          <p className="text-sm text-gray-400 mb-6">
            No payment reference found in this URL.
          </p>
          <button
            onClick={() => router.replace('/dashboard/payments')}
            className="w-full py-3 rounded-xl bg-[#1a3d2b] text-white text-sm font-bold hover:bg-[#1a3d2b]/90 transition-colors"
          >
            Back to Payments
          </button>
        </div>
      </div>
    );
  }

  // ── Main card ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f7f4ef] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden max-w-sm w-full">

        {/* Top accent bar */}
        <div className={`h-1.5 w-full transition-colors duration-500 ${
          state === 'verifying' ? 'bg-gradient-to-r from-[#1a3d2b] to-[#c45c1a]' :
          state === 'success'   ? 'bg-emerald-400' :
          state === 'pending'   ? 'bg-amber-400'   :
          'bg-red-400'
        }`} />

        <div className="p-8 flex flex-col items-center text-center">

          {/* ── Icon ── */}

          {state === 'verifying' && (
            <div className="relative w-20 h-20 mb-6">
              <svg
                className="absolute inset-0 w-full h-full animate-spin"
                style={{ animationDuration: '2s' }}
                viewBox="0 0 80 80"
              >
                <circle
                  cx="40" cy="40" r="36"
                  fill="none" stroke="#1a3d2b" strokeWidth="3" strokeOpacity="0.1"
                />
                <circle
                  cx="40" cy="40" r="36"
                  fill="none" stroke="#c45c1a" strokeWidth="3"
                  strokeDasharray={`${2 * Math.PI * 36 * 0.7} ${2 * Math.PI * 36 * 0.3}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="w-7 h-7 text-[#1a3d2b]" />
              </div>
            </div>
          )}

          {state === 'success' && (
            <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            </div>
          )}

          {state === 'pending' && (
            <div className="w-20 h-20 rounded-full bg-amber-50 border-4 border-amber-100 flex items-center justify-center mb-6">
              <Clock className="w-9 h-9 text-amber-500" />
            </div>
          )}

          {state === 'failed' && (
            <div className="w-20 h-20 rounded-full bg-red-50 border-4 border-red-100 flex items-center justify-center mb-6">
              <XCircle className="w-9 h-9 text-red-500" />
            </div>
          )}

          {/* ── Title ── */}
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            {state === 'verifying' ? 'Verifying Payment...'   :
             state === 'success'   ? 'Payment Successful'     :
             state === 'pending'   ? 'Payment Pending'        :
             'Payment Failed'}
          </h2>

          {/* ── Subtitle ── */}
          <p className="text-sm text-gray-400 leading-relaxed mb-5">
            {state === 'verifying'
              ? 'Please wait while we confirm your payment with Paystack.'
              : state === 'success'
              ? 'Your payment has been confirmed and recorded successfully.'
              : state === 'pending'
              ? 'Your payment is still being processed. Check your transactions shortly.'
              : errorMessage || 'We could not verify this payment. Please contact support.'}
          </p>

          {/* ── Amount (success only) ── */}
          {state === 'success' && txAmount && (
            <div className="w-full mb-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1">
                Amount Paid
              </p>
              <p className="text-base font-bold text-emerald-700">{txAmount}</p>
            </div>
          )}

          {/* ── Reference ── */}
          {state !== 'verifying' && (
            <div className="w-full mb-5 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Payment Reference
              </p>
              <p className="text-sm font-bold text-gray-700 font-mono break-all">
                {txReference || reference}
              </p>
            </div>
          )}

          {/* ── Pending notice ── */}
          {state === 'pending' && (
            <div className="w-full mb-5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-left">
              <p className="text-xs text-amber-700 leading-relaxed">
                Your payment is being confirmed. You'll receive an update shortly.
                If this takes more than a few minutes, contact support with your reference.
              </p>
            </div>
          )}

          {/* ── Actions ── */}
          {state === 'verifying' ? (
            <p className="text-xs text-gray-300 mt-2">This usually takes a few seconds...</p>
          ) : (
            <div className="w-full space-y-2">
              <button
                onClick={() => router.replace('/dashboard/payments')}
                className="w-full py-3 rounded-xl bg-[#1a3d2b] text-white text-sm font-bold hover:bg-[#1a3d2b]/90 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Payments
              </button>
              <button
                onClick={() => router.replace('/dashboard/transactions')}
                className="w-full py-3 rounded-xl bg-gray-50 text-gray-600 text-sm font-semibold hover:bg-gray-100 transition-colors"
              >
                View Transactions
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Page Export
// -----------------------------------------------------------------------------

export default function PaystackVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f7f4ef] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1a3d2b] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}