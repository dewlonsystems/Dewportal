// =============================================================================
// DEWPORTAL FRONTEND - TRANSACTIONS PAGE (MOBILE RESPONSIVE)
// =============================================================================

'use client';

import { useState, useCallback } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency, formatDate } from '@/lib/utils';
import { downloadPdf, downloadExcel } from '@/lib/utils/download';
import {
  downloadReceiptAction,
  exportTransactionsPdfAction,
  exportTransactionsExcelAction,
} from '@/server-actions/payments';
import { Transaction, TransactionStatus, PaymentMethod } from '@/types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface Filters {
  search: string;
  status: string;
  payment_method: string;
  date_from: string;
  date_to: string;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
  completed: { label: 'Completed', dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  pending:   { label: 'Pending',   dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200'   },
  failed:    { label: 'Failed',    dot: 'bg-red-400',     bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200'     },
  cancelled: { label: 'Cancelled', dot: 'bg-gray-400',    bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-200'    },
};

const METHOD_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  mpesa:    { label: 'M-Pesa',   bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  paystack: { label: 'Paystack', bg: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-200'  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function MethodBadge({ method }: { method: string }) {
  const cfg = METHOD_CONFIG[method] || METHOD_CONFIG.mpesa;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Stat Card
// -----------------------------------------------------------------------------

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="relative bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accent }} />
      <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">{label}</p>
      <p className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      {sub && <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Toast — lightweight inline feedback
// -----------------------------------------------------------------------------

function Toast({ message, type, onDismiss }: { message: string; type: 'error' | 'success'; onDismiss: () => void }) {
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold max-w-sm w-[90vw] ${
      type === 'error' ? 'bg-red-600 text-white' : 'bg-[#0f2e10] text-white'
    }`}>
      {type === 'error'
        ? <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        : <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      }
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="opacity-70 hover:opacity-100 transition-opacity ml-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Transaction Detail Modal — mobile-safe
// -----------------------------------------------------------------------------

function TransactionModal({
  tx, onClose, onDownloadReceipt, isDownloading,
}: {
  tx: Transaction;
  onClose: () => void;
  onDownloadReceipt: () => void;
  isDownloading: boolean;
}) {
  const user = tx.user_details;
  const receipt = tx.mpesa_receipt_number || tx.provider_reference || '—';

  const rows: [string, React.ReactNode][] = [
    ['Reference',      <span className="font-mono font-semibold text-[#0f2e10] text-xs sm:text-sm break-all">{tx.reference}</span>],
    ['Amount',         <span className="font-bold text-[#0f2e10] text-base">{formatCurrency(Number(tx.amount))}</span>],
    ['Status',         <StatusBadge status={tx.status} />],
    ['Method',         <MethodBadge method={tx.payment_method} />],
    ['Receipt',        <span className="font-mono text-xs text-gray-700 break-all">{receipt}</span>],
    ['Date',           <span className="text-xs sm:text-sm text-gray-700">{formatDate(tx.created_at)}</span>],
    ...(tx.callback_received_at ? [['Callback', <span className="text-xs text-gray-700">{formatDate(tx.callback_received_at)}</span>] as [string, React.ReactNode]] : []),
    ...(tx.mpesa_phone_number   ? [['Phone',    <span className="font-mono text-xs text-gray-700">{tx.mpesa_phone_number}</span>] as [string, React.ReactNode]] : []),
    ...(tx.description          ? [['Note',     <span className="text-xs text-gray-700">{tx.description}</span>] as [string, React.ReactNode]] : []),
    ...(user ? [['Account', <span className="text-xs text-gray-700 break-all">{user.first_name} {user.last_name}<br/><span className="text-gray-400">{user.email}</span></span>] as [string, React.ReactNode]] : []),
  ];

  const canDownload = tx.status !== 'pending';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">

        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="bg-[#0f2e10] px-5 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest mb-0.5">Transaction Details</p>
              <p className="text-white font-mono font-bold text-base sm:text-lg truncate max-w-[220px] sm:max-w-none">{tx.reference}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="h-[3px] bg-gradient-to-r from-[#14532d] via-[#16a34a] to-[#f97316] flex-shrink-0" />

        <div className="overflow-y-auto flex-1 px-5 py-4">
          <div className="divide-y divide-gray-50">
            {rows.map(([label, value]) => (
              <div key={label as string} className="flex items-start justify-between gap-3 py-3">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-20 sm:w-28 flex-shrink-0 pt-0.5">{label}</span>
                <div className="text-right flex-1 min-w-0">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 pb-6 pt-3 flex gap-3 border-t border-gray-50 flex-shrink-0">
          <button
            onClick={onDownloadReceipt}
            disabled={isDownloading || !canDownload}
            className="flex-1 flex items-center justify-center gap-2 bg-[#0f2e10] hover:bg-[#1a4a1a] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded-xl transition-colors"
            title={!canDownload ? 'Receipt not available for pending transactions' : undefined}
          >
            {isDownloading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            {isDownloading ? 'Downloading...' : 'Download Receipt'}
          </button>
          <button
            onClick={onClose}
            className="px-5 text-sm font-semibold text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Export Modal
// -----------------------------------------------------------------------------

function ExportModal({
  onClose, onExport, isExporting,
}: {
  onClose: () => void;
  onExport: (type: 'excel' | 'pdf') => void;
  isExporting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!isExporting ? onClose : undefined} />
      <div className="relative bg-white w-full sm:max-w-sm sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden">

        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="bg-[#0f2e10] px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest mb-0.5">Export</p>
            <p className="text-white font-bold text-lg">Choose Format</p>
          </div>
          {!isExporting && (
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="h-[3px] bg-gradient-to-r from-[#14532d] via-[#16a34a] to-[#f97316]" />

        <div className="p-5 space-y-3">
          <button
            onClick={() => onExport('excel')}
            disabled={isExporting}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50 active:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              {isExporting
                ? <span className="w-5 h-5 border-2 border-emerald-300 border-t-emerald-700 rounded-full animate-spin" />
                : <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
              }
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900 text-sm">Excel Spreadsheet</p>
              <p className="text-xs text-gray-400 mt-0.5">Download as .xlsx file</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => onExport('pdf')}
            disabled={isExporting}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-orange-100 hover:border-orange-300 hover:bg-orange-50 active:bg-orange-100 disabled:opacity-60 disabled:cursor-not-allowed transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
              {isExporting
                ? <span className="w-5 h-5 border-2 border-orange-300 border-t-orange-700 rounded-full animate-spin" />
                : <svg className="w-5 h-5 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
              }
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900 text-sm">PDF Document</p>
              <p className="text-xs text-gray-400 mt-0.5">Download as .pdf file</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-6">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="w-full text-sm font-semibold text-gray-400 hover:text-gray-600 disabled:opacity-40 py-2 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Mobile Transaction Card
// -----------------------------------------------------------------------------

function MobileTransactionCard({
  tx, onOpen, onDownloadReceipt, isDownloading,
}: {
  tx: Transaction;
  onOpen: () => void;
  onDownloadReceipt: () => void;
  isDownloading: boolean;
}) {
  return (
    <div
      onClick={onOpen}
      className="px-4 py-4 hover:bg-gray-50/60 active:bg-gray-100 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${STATUS_CONFIG[tx.status]?.bg || 'bg-gray-50'}`}>
            <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[tx.status]?.dot || 'bg-gray-400'}`} />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-gray-900 truncate">{tx.reference}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.created_at)}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <StatusBadge status={tx.status} />
              <MethodBadge method={tx.payment_method} />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <p className="text-sm font-bold text-gray-900">{formatCurrency(Number(tx.amount))}</p>
          <button
            onClick={(e) => { e.stopPropagation(); onDownloadReceipt(); }}
            disabled={isDownloading || tx.status === 'pending'}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-[#16a34a] hover:text-[#16a34a] active:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {isDownloading
              ? <span className="w-3 h-3 border border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            }
            Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Page
// -----------------------------------------------------------------------------

export default function TransactionsPage() {
  const [filters, setFilters] = useState<Filters>({
    search: '', status: '', payment_method: '', date_from: '', date_to: '',
  });
  const [selectedTx, setSelectedTx]     = useState<Transaction | null>(null);
  const [showExport, setShowExport]     = useState(false);
  const [filtersOpen, setFiltersOpen]   = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [isExporting, setIsExporting]   = useState(false);
  const [toast, setToast]               = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const { transactions, transactionSummary, isLoading, refreshTransactions, loadMore, hasNextPage } = useTransactions({
    search:         filters.search          || undefined,
    status:         (filters.status         || undefined) as TransactionStatus | undefined,
    payment_method: (filters.payment_method || undefined) as PaymentMethod    | undefined,
    date_from:      filters.date_from       || undefined,
    date_to:        filters.date_to         || undefined,
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // ── Receipt download ─────────────────────────────────────────────────────

  const handleDownloadReceipt = useCallback(async (tx: Transaction) => {
    if (tx.status === 'pending') return;

    setDownloadingId(tx.id);
    try {
      const result = await downloadReceiptAction(tx.id);
      if (result.success && result.data) {
        downloadPdf(result.data.blob, result.data.filename);
        setToast({ message: 'Receipt downloaded successfully', type: 'success' });
      } else {
        setToast({ message: result.error || 'Failed to download receipt', type: 'error' });
      }
    } catch {
      setToast({ message: 'Unexpected error downloading receipt', type: 'error' });
    } finally {
      setDownloadingId(null);
    }
  }, []);

  // ── Export ───────────────────────────────────────────────────────────────

  const handleExport = useCallback(async (type: 'excel' | 'pdf') => {
    setIsExporting(true);
    const exportFilters = {
      status:         filters.status         || undefined,
      payment_method: filters.payment_method || undefined,
      date_from:      filters.date_from      || undefined,
      date_to:        filters.date_to        || undefined,
    };

    try {
      if (type === 'excel') {
        const result = await exportTransactionsExcelAction(exportFilters);
        if (result.success && result.data) {
          downloadExcel(result.data.blob, result.data.filename);
          setToast({ message: 'Excel export downloaded', type: 'success' });
        } else {
          setToast({ message: result.error || 'Export failed', type: 'error' });
        }
      } else {
        const result = await exportTransactionsPdfAction(exportFilters);
        if (result.success && result.data) {
          downloadPdf(result.data.blob, result.data.filename);
          setToast({ message: 'PDF export downloaded', type: 'success' });
        } else {
          setToast({ message: result.error || 'Export failed', type: 'error' });
        }
      }
    } catch {
      setToast({ message: 'Unexpected error during export', type: 'error' });
    } finally {
      setIsExporting(false);
      setShowExport(false);
    }
  }, [filters]);

  const clearFilters = () => setFilters({ search: '', status: '', payment_method: '', date_from: '', date_to: '' });

  return (
    <>
      <div className="space-y-5 pb-10">

        {/* ── Page Header ─────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Transactions</h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">View, filter and export all payment transactions</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={refreshTransactions}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all"
              title="Refresh"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-semibold text-white bg-[#0f2e10] hover:bg-[#1a4a1a] rounded-xl transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* ── Stat Cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Total Revenue" value={transactionSummary ? formatCurrency(Number(transactionSummary.total_revenue)) : '—'} sub="All time" accent="#f97316" />
          <StatCard label="Total" value={transactionSummary?.total_transactions ?? '—'} sub="Transactions" accent="#0f2e10" />
          <StatCard label="Completed" value={transactionSummary?.completed_transactions ?? '—'} sub="Successful" accent="#16a34a" />
          <StatCard label="Pending" value={transactionSummary?.pending_transactions ?? '—'} sub="Awaiting" accent="#f59e0b" />
        </div>

        {/* ── Filters ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-sm font-semibold text-gray-700">Filters</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-[#f97316] rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {filtersOpen && (
            <div className="px-4 sm:px-6 pb-5 border-t border-gray-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-4">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Search</label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Reference, receipt..."
                      value={filters.search}
                      onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-colors bg-white"
                  >
                    <option value="">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Method</label>
                  <select
                    value={filters.payment_method}
                    onChange={(e) => setFilters(f => ({ ...f, payment_method: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-colors bg-white"
                  >
                    <option value="">All Methods</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="paystack">Paystack</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">From Date</label>
                  <input
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => setFilters(f => ({ ...f, date_from: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">To Date</label>
                  <input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => setFilters(f => ({ ...f, date_to: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-colors"
                  />
                </div>

                {activeFilterCount > 0 && (
                  <div className="flex items-end">
                    <button
                      onClick={clearFilters}
                      className="w-full px-4 py-2.5 text-sm font-semibold text-[#f97316] border border-orange-200 rounded-xl hover:bg-orange-50 transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Transaction List ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          <div className="px-4 sm:px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900">Transaction History</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {isLoading ? 'Loading...' : `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
            {activeFilterCount > 0 && (
              <span className="text-xs text-gray-400 hidden sm:inline">Filtered by {activeFilterCount} criteria</span>
            )}
          </div>

          {isLoading ? (
            <div className="divide-y divide-gray-50">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 sm:px-6 py-4 animate-pulse">
                  <div className="w-9 h-9 bg-gray-100 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-100 rounded w-36" />
                    <div className="h-3 bg-gray-100 rounded w-24" />
                  </div>
                  <div className="space-y-2 items-end flex flex-col">
                    <div className="h-4 bg-gray-100 rounded w-20" />
                    <div className="h-6 bg-gray-100 rounded-lg w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-500">No transactions found</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[240px]">
                {activeFilterCount > 0 ? 'Try adjusting your filters' : 'Transactions will appear here once payments are made'}
              </p>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="mt-4 text-xs font-semibold text-[#16a34a] hover:underline">
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden sm:grid grid-cols-[1fr_140px_130px_148px] px-6 py-3 bg-gray-50/70 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Reference</span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Action</span>
              </div>

              <div className="divide-y divide-gray-50">
                {transactions.map((tx) => (
                  <div key={tx.id}>
                    {/* Mobile */}
                    <div className="sm:hidden">
                      <MobileTransactionCard
                        tx={tx}
                        onOpen={() => setSelectedTx(tx)}
                        onDownloadReceipt={() => handleDownloadReceipt(tx)}
                        isDownloading={downloadingId === tx.id}
                      />
                    </div>

                    {/* Desktop */}
                    <div
                      onClick={() => setSelectedTx(tx)}
                      className="hidden sm:grid grid-cols-[1fr_140px_130px_148px] items-center px-6 py-4 hover:bg-gray-50/60 cursor-pointer transition-colors"
                    >
                      <div className="min-w-0 pr-4">
                        <p className="font-mono text-sm font-semibold text-gray-900 truncate">{tx.reference}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(Number(tx.amount))}</p>
                        <MethodBadge method={tx.payment_method} />
                      </div>
                      <div>
                        <StatusBadge status={tx.status} />
                      </div>
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDownloadReceipt(tx)}
                          disabled={downloadingId === tx.id || tx.status === 'pending'}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-[#16a34a] hover:text-[#16a34a] hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                          title={tx.status === 'pending' ? 'Not available for pending transactions' : 'Download receipt PDF'}
                        >
                          {downloadingId === tx.id
                            ? <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                            : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                          }
                          {downloadingId === tx.id ? 'Downloading...' : 'Download Receipt'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {hasNextPage && (
                <div className="px-4 sm:px-6 py-4 border-t border-gray-50 flex justify-center">
                  <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 w-full sm:w-auto justify-center"
                  >
                    {isLoading
                      ? <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                      : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    }
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────── */}
      {selectedTx && (
        <TransactionModal
          tx={selectedTx}
          onClose={() => setSelectedTx(null)}
          onDownloadReceipt={() => handleDownloadReceipt(selectedTx)}
          isDownloading={downloadingId === selectedTx.id}
        />
      )}
      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          onExport={handleExport}
          isExporting={isExporting}
        />
      )}

      {/* ── Toast ───────────────────────────────────────────── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}