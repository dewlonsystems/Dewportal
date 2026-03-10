// =============================================================================
// DEWPORTAL FRONTEND - PAYMENTS PAGE
// =============================================================================
// src/app/dashboard/payments/page.tsx
// =============================================================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocketStore } from '@/stores/useWebSocketStore';
import { initiatePaymentAction } from '@/server-actions/payments';
import { formatCurrency } from '@/lib/utils';
import { WebSocketMessage } from '@/types';
import {
  Smartphone,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Info,
  ChevronRight,
  Wifi,
  WifiOff,
  AlertCircle,
  X,
} from 'lucide-react';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type PaymentMethod = 'mpesa' | 'paystack';
type MpesaModalState = 'waiting' | 'success' | 'failed';

interface MpesaForm {
  phone_number: string;
  amount: string;
}

interface PaystackForm {
  email: string;
  amount: string;
}

interface MpesaModalData {
  state: MpesaModalState;
  reference?: string;
  message?: string;
  amount?: string;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatKES(value: string) {
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return `KES ${num.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
}

// -----------------------------------------------------------------------------
// Method Selector Card
// -----------------------------------------------------------------------------

function MethodCard({
  method,
  selected,
  onClick,
}: {
  method: PaymentMethod;
  selected: boolean;
  onClick: () => void;
}) {
  const isMpesa = method === 'mpesa';

  return (
    <button
      onClick={onClick}
      className={`
        relative w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 group
        ${selected
          ? 'border-[#1a3d2b] bg-[#1a3d2b]/4 shadow-sm'
          : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
        }
      `}
      style={selected ? { background: 'rgba(26,61,43,0.04)' } : {}}
    >
      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#1a3d2b] flex items-center justify-center">
          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Logo area */}
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors
          ${selected ? 'bg-[#1a3d2b]' : 'bg-gray-50 group-hover:bg-gray-100'}
        `}>
          {isMpesa ? (
            <Smartphone className={`w-5 h-5 ${selected ? 'text-white' : 'text-gray-400'}`} />
          ) : (
            <CreditCard className={`w-5 h-5 ${selected ? 'text-white' : 'text-gray-400'}`} />
          )}
        </div>

        <div>
          <p className={`font-bold text-sm ${selected ? 'text-[#1a3d2b]' : 'text-gray-700'}`}>
            {isMpesa ? 'M-Pesa' : 'Paystack'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {isMpesa ? 'STK Push to your phone' : 'Card, mobile money & more'}
          </p>
        </div>
      </div>

      {/* Tags */}
      <div className="flex gap-2 mt-4">
        {isMpesa ? (
          <>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Instant</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-50 text-gray-500">Up to KES 150,000</span>
          </>
        ) : (
          <>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">Redirect</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-50 text-gray-500">Up to KES 1,000,000</span>
          </>
        )}
      </div>
    </button>
  );
}

// -----------------------------------------------------------------------------
// Input Field
// -----------------------------------------------------------------------------

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className={`text-xs font-semibold uppercase tracking-wider ${error ? 'text-red-500' : 'text-gray-400'}`}>
        {label}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-red-500">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-gray-400">{hint}</p>
      )}
    </div>
  );
}

function StyledInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  prefix,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  prefix?: string;
  error?: boolean;
}) {
  return (
    <div className={`
      relative flex items-center rounded-xl border-2 transition-all duration-200 bg-white
      ${error ? 'border-red-300' : 'border-gray-200 focus-within:border-[#1a3d2b]'}
    `}>
      {prefix && (
        <span className="pl-4 text-sm font-semibold text-gray-400 select-none">{prefix}</span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-4 text-sm font-medium text-gray-900 bg-transparent focus:outline-none placeholder:text-gray-300"
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Mpesa Waiting Modal
// -----------------------------------------------------------------------------

function MpesaModal({
  data,
  onClose,
  onRetry,
}: {
  data: MpesaModalData;
  onClose: () => void;
  onRetry?: () => void;
}) {
  const { state, reference, message, amount } = data;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Top accent */}
        <div className={`h-1.5 w-full ${
          state === 'waiting' ? 'bg-gradient-to-r from-[#1a3d2b] to-[#c45c1a]' :
          state === 'success' ? 'bg-emerald-400' :
          'bg-red-400'
        }`} />

        {/* Close button — only when done */}
        {state !== 'waiting' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="p-8 flex flex-col items-center text-center">

          {/* Icon / Loader */}
          {state === 'waiting' && (
            <div className="relative w-20 h-20 mb-6">
              {/* Outer ring */}
              <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: '2s' }} viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="none" stroke="#1a3d2b" strokeWidth="3" strokeOpacity="0.1" />
                <circle cx="40" cy="40" r="36" fill="none" stroke="#c45c1a" strokeWidth="3"
                  strokeDasharray={`${2 * Math.PI * 36 * 0.7} ${2 * Math.PI * 36 * 0.3}`}
                  strokeLinecap="round"
                  style={{ transformOrigin: 'center' }}
                />
              </svg>
              {/* Inner icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Smartphone className="w-7 h-7 text-[#1a3d2b]" />
              </div>
            </div>
          )}

          {state === 'success' && (
            <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            </div>
          )}

          {state === 'failed' && (
            <div className="w-20 h-20 rounded-full bg-red-50 border-4 border-red-100 flex items-center justify-center mb-6">
              <XCircle className="w-9 h-9 text-red-500" />
            </div>
          )}

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {state === 'waiting' ? 'Check Your Phone' :
             state === 'success' ? 'Payment Successful' :
             'Payment Failed'}
          </h3>

          {/* Subtitle */}
          <p className="text-sm text-gray-400 leading-relaxed mb-4">
            {state === 'waiting'
              ? 'An M-Pesa STK push has been sent to your phone. Enter your PIN to complete the payment.'
              : state === 'success'
              ? `Your payment of ${amount ? formatKES(amount) : ''} was completed successfully.`
              : message || 'The payment could not be completed. Please try again.'
            }
          </p>

          {/* Reference */}
          {reference && state !== 'waiting' && (
            <div className="w-full mb-5 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Reference</p>
              <p className="text-sm font-bold text-gray-700 font-mono">{reference}</p>
            </div>
          )}

          {/* Waiting state info */}
          {state === 'waiting' && (
            <div className="w-full mb-5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 text-left leading-relaxed">
                This prompt will automatically update once your payment is confirmed. Do not close this window.
              </p>
            </div>
          )}

          {/* Actions */}
          {state === 'success' && (
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#1a3d2b] text-white text-sm font-bold hover:bg-[#1a3d2b]/90 transition-colors"
            >
              Done
            </button>
          )}

          {state === 'failed' && (
            <div className="w-full flex flex-col gap-2">
              <button
                onClick={onRetry}
                className="w-full py-3 rounded-xl bg-[#1a3d2b] text-white text-sm font-bold hover:bg-[#1a3d2b]/90 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-gray-50 text-gray-600 text-sm font-semibold hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Limit Info Row
// -----------------------------------------------------------------------------

function LimitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-bold text-gray-800">{value}</span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Page
// -----------------------------------------------------------------------------

export default function PaymentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { setOnMessage } = useWebSocketStore();
  const isConnected = useWebSocketStore(s => s.isConnected);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('mpesa');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mpesa form
  const [mpesaForm, setMpesaForm] = useState<MpesaForm>({
    phone_number: user?.phone_number || '',
    amount: '',
  });
  const [mpesaErrors, setMpesaErrors] = useState<Partial<MpesaForm>>({});

  // Paystack form
  const [paystackForm, setPaystackForm] = useState<PaystackForm>({
    email: user?.email || '',
    amount: '',
  });
  const [paystackErrors, setPaystackErrors] = useState<Partial<PaystackForm>>({});

  // Mpesa modal
  const [mpesaModal, setMpesaModal] = useState<MpesaModalData | null>(null);
  const pendingReferenceRef = useRef<string | null>(null);

  // ---------------------------------------------------------------------------
  // WebSocket — listen for payment_status_update
  // ---------------------------------------------------------------------------

  useEffect(() => {
    setOnMessage((message: WebSocketMessage) => {
      if (
        message.type === 'payment_status_update' ||
        message.type === 'transaction_update'
      ) {
        const data = message.data as {
          reference?: string;
          status?: string;
          result_desc?: string;
          amount?: string;
        };

        // Only update if this is the transaction we're waiting for
        if (
          pendingReferenceRef.current &&
          data.reference === pendingReferenceRef.current
        ) {
          if (data.status === 'completed') {
            setMpesaModal({
              state: 'success',
              reference: data.reference,
              amount: data.amount,
            });
            pendingReferenceRef.current = null;
          } else if (data.status === 'failed' || data.status === 'cancelled') {
            setMpesaModal({
              state: 'failed',
              reference: data.reference,
              message: data.result_desc || 'Payment was not completed.',
            });
            pendingReferenceRef.current = null;
          }
        }
      }
    });

    return () => setOnMessage(null);
  }, [setOnMessage]);

  // ---------------------------------------------------------------------------
  // Mpesa Validation
  // ---------------------------------------------------------------------------

  const validateMpesa = () => {
    const errors: Partial<MpesaForm> = {};
    if (!mpesaForm.phone_number) {
      errors.phone_number = 'Phone number is required';
    } else if (!/^(?:254|\+254|0)?(7[0-9]{8}|1[0-1][0-9]{7})$/.test(mpesaForm.phone_number)) {
      errors.phone_number = 'Enter a valid Kenyan phone number';
    }
    if (!mpesaForm.amount) {
      errors.amount = 'Amount is required';
    } else if (parseFloat(mpesaForm.amount) < 1) {
      errors.amount = 'Minimum amount is KES 1';
    } else if (parseFloat(mpesaForm.amount) > 150000) {
      errors.amount = 'Maximum M-Pesa amount is KES 150,000';
    }
    setMpesaErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ---------------------------------------------------------------------------
  // Paystack Validation
  // ---------------------------------------------------------------------------

  const validatePaystack = () => {
    const errors: Partial<PaystackForm> = {};
    if (!paystackForm.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paystackForm.email)) {
      errors.email = 'Enter a valid email address';
    }
    if (!paystackForm.amount) {
      errors.amount = 'Amount is required';
    } else if (parseFloat(paystackForm.amount) < 1) {
      errors.amount = 'Minimum amount is KES 1';
    } else if (parseFloat(paystackForm.amount) > 1000000) {
      errors.amount = 'Maximum Paystack amount is KES 1,000,000';
    }
    setPaystackErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ---------------------------------------------------------------------------
  // Submit Mpesa
  // ---------------------------------------------------------------------------

  const handleMpesaSubmit = async () => {
    if (!validateMpesa()) return;

    try {
      setIsSubmitting(true);
      const result = await initiatePaymentAction({
        payment_method: 'mpesa',
        amount: mpesaForm.amount,
        phone_number: mpesaForm.phone_number,
      });

      if (result.error || !result.data?.success) {
        setMpesaModal({
          state: 'failed',
          message: result.error || result.data?.message || 'Failed to initiate payment',
        });
        return;
      }

      // Store reference so WebSocket can match the callback
      const reference = result.data.transaction?.reference;
      if (reference) pendingReferenceRef.current = reference;

      // Open waiting modal
      setMpesaModal({ state: 'waiting', amount: mpesaForm.amount });

    } catch (err) {
      setMpesaModal({
        state: 'failed',
        message: err instanceof Error ? err.message : 'Payment initiation failed',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Submit Paystack
  // ---------------------------------------------------------------------------

  const handlePaystackSubmit = async () => {
    if (!validatePaystack()) return;

    try {
      setIsSubmitting(true);
      const result = await initiatePaymentAction({
        payment_method: 'paystack',
        amount: paystackForm.amount,
        description: paystackForm.email,
      });

      if (result.error || !result.data?.success) {
        setPaystackErrors({
          amount: result.error || result.data?.message || 'Failed to initiate payment',
        });
        return;
      }

      // Redirect to Paystack checkout
      const authUrl = result.data.authorization_url;
      if (authUrl) {
        router.push(authUrl);
      }

    } catch (err) {
      setPaystackErrors({
        amount: err instanceof Error ? err.message : 'Payment initiation failed',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Reset modal + retry
  // ---------------------------------------------------------------------------

  const handleModalClose = () => {
    setMpesaModal(null);
    pendingReferenceRef.current = null;
    setMpesaForm({ phone_number: user?.phone_number || '', amount: '' });
  };

  const handleRetry = () => {
    setMpesaModal(null);
    pendingReferenceRef.current = null;
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-6 pb-8">

        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Payments</h1>
            <p className="text-sm text-gray-400 mt-1">Initiate a new payment via M-Pesa or Paystack</p>
          </div>

          {/* WebSocket indicator */}
          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold border ${
            isConnected
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
              : 'bg-gray-50 border-gray-100 text-gray-500'
          }`}>
            {isConnected
              ? <><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span> Live</>
              : <><WifiOff className="w-3.5 h-3.5" /> Offline</>
            }
          </div>
        </div>

        {/* ── Main Grid ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── Left: Form ── */}
          <div className="lg:col-span-3 space-y-4">

            {/* Method Selection */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
                Select Payment Method
              </p>
              <div className="grid grid-cols-2 gap-3">
                <MethodCard method="mpesa" selected={selectedMethod === 'mpesa'} onClick={() => setSelectedMethod('mpesa')} />
                <MethodCard method="paystack" selected={selectedMethod === 'paystack'} onClick={() => setSelectedMethod('paystack')} />
              </div>
            </div>

            {/* ── Mpesa Form ── */}
            {selectedMethod === 'mpesa' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
                  <div className="w-9 h-9 rounded-xl bg-[#1a3d2b] flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">M-Pesa Payment</p>
                    <p className="text-xs text-gray-400">STK push will be sent to your phone</p>
                  </div>
                </div>

                <Field label="Phone Number" hint="Format: 07XX XXX XXX or 254XXXXXXXXX" error={mpesaErrors.phone_number}>
                  <StyledInput
                    value={mpesaForm.phone_number}
                    onChange={(v) => {
                      setMpesaForm(f => ({ ...f, phone_number: v }));
                      if (mpesaErrors.phone_number) setMpesaErrors(e => ({ ...e, phone_number: undefined }));
                    }}
                    placeholder="0712 345 678"
                    type="tel"
                    error={!!mpesaErrors.phone_number}
                  />
                </Field>

                <Field label="Amount (KES)" hint="Minimum KES 1 · Maximum KES 150,000" error={mpesaErrors.amount}>
                  <StyledInput
                    value={mpesaForm.amount}
                    onChange={(v) => {
                      setMpesaForm(f => ({ ...f, amount: v }));
                      if (mpesaErrors.amount) setMpesaErrors(e => ({ ...e, amount: undefined }));
                    }}
                    placeholder="0.00"
                    type="number"
                    prefix="KES"
                    error={!!mpesaErrors.amount}
                  />
                </Field>

                {/* Amount preview */}
                {mpesaForm.amount && !isNaN(parseFloat(mpesaForm.amount)) && (
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#1a3d2b]/4 border border-[#1a3d2b]/10"
                    style={{ background: 'rgba(26,61,43,0.04)' }}>
                    <span className="text-xs font-semibold text-[#1a3d2b]/70">You are paying</span>
                    <span className="text-sm font-black text-[#1a3d2b]">{formatKES(mpesaForm.amount)}</span>
                  </div>
                )}

                <button
                  onClick={handleMpesaSubmit}
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-[#1a3d2b] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#1a3d2b]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending STK Push...
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" />
                      Send STK Push
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ── Paystack Form ── */}
            {selectedMethod === 'paystack' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
                  <div className="w-9 h-9 rounded-xl bg-[#1a3d2b] flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Paystack Payment</p>
                    <p className="text-xs text-gray-400">You'll be redirected to complete payment</p>
                  </div>
                </div>

                <Field label="Email Address" hint="Paystack will send a receipt to this email" error={paystackErrors.email}>
                  <StyledInput
                    value={paystackForm.email}
                    onChange={(v) => {
                      setPaystackForm(f => ({ ...f, email: v }));
                      if (paystackErrors.email) setPaystackErrors(e => ({ ...e, email: undefined }));
                    }}
                    placeholder="you@example.com"
                    type="email"
                    error={!!paystackErrors.email}
                  />
                </Field>

                <Field label="Amount (KES)" hint="Minimum KES 1 · Maximum KES 1,000,000" error={paystackErrors.amount}>
                  <StyledInput
                    value={paystackForm.amount}
                    onChange={(v) => {
                      setPaystackForm(f => ({ ...f, amount: v }));
                      if (paystackErrors.amount) setPaystackErrors(e => ({ ...e, amount: undefined }));
                    }}
                    placeholder="0.00"
                    type="number"
                    prefix="KES"
                    error={!!paystackErrors.amount}
                  />
                </Field>

                {/* Amount preview */}
                {paystackForm.amount && !isNaN(parseFloat(paystackForm.amount)) && (
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#1a3d2b]/10"
                    style={{ background: 'rgba(26,61,43,0.04)' }}>
                    <span className="text-xs font-semibold text-[#1a3d2b]/70">You are paying</span>
                    <span className="text-sm font-black text-[#1a3d2b]">{formatKES(paystackForm.amount)}</span>
                  </div>
                )}

                {/* Redirect notice */}
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    You will be redirected to Paystack's secure checkout. After payment, you'll be brought back to this portal automatically.
                  </p>
                </div>

                <button
                  onClick={handlePaystackSubmit}
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-[#1a3d2b] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#1a3d2b]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Continue to Paystack
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* ── Right: Info Panel ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* How it works */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(26,61,43,0.08)' }}>
                  <Info className="w-4 h-4 text-[#1a3d2b]" />
                </div>
                <p className="text-sm font-bold text-gray-900">How it works</p>
              </div>
              <div className="p-5 space-y-4">
                {(selectedMethod === 'mpesa' ? [
                    { step: '1', text: 'Enter your M-Pesa phone number and amount' },
                    { step: '2', text: 'Click Send STK Push' },
                    { step: '3', text: 'A prompt appears on your phone' },
                    { step: '4', text: 'Enter your M-Pesa PIN to confirm' },
                    { step: '5', text: 'Payment status updates instantly' },
                  ] : [
                    { step: '1', text: 'Enter your email and amount' },
                    { step: '2', text: 'Click Continue to Paystack' },
                    { step: '3', text: 'Complete payment on Paystack\'s secure page' },
                    { step: '4', text: 'You\'ll be redirected back automatically' },
                    { step: '5', text: 'Payment status is confirmed instantly' },
                  ]
                ).map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#1a3d2b] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] font-black text-white">{step}</span>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Limits */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(26,61,43,0.08)' }}>
                  <AlertCircle className="w-4 h-4 text-[#1a3d2b]" />
                </div>
                <p className="text-sm font-bold text-gray-900">Payment Limits</p>
              </div>
              <div className="px-5 py-2">
                <LimitRow label="Minimum (all methods)" value="KES 1" />
                <LimitRow label="Maximum · M-Pesa" value="KES 150,000" />
                <LimitRow label="Maximum · Paystack" value="KES 1,000,000" />
              </div>
            </div>

            {/* Connection status warning */}
            {!isConnected && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                <WifiOff className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Real-time updates offline</p>
                  <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
                    WebSocket is not connected. M-Pesa payment status may not update automatically.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mpesa Modal ─────────────────────────────────────────── */}
      {mpesaModal && (
        <MpesaModal
          data={mpesaModal}
          onClose={handleModalClose}
          onRetry={handleRetry}
        />
      )}
    </>
  );
}