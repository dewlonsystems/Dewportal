// =============================================================================
// DEWPORTAL FRONTEND - TRANSACTIONS PAGE
// =============================================================================

'use client';

import { useState, useRef } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency, formatDate } from '@/lib/utils';
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
  mpesa:    { label: 'M-Pesa',    bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200'  },
  paystack: { label: 'Paystack',  bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
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
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Stat Card
// -----------------------------------------------------------------------------

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="relative bg-white rounded-2xl border border-gray-100 p-5 shadow-sm overflow-hidden group hover:shadow-md transition-shadow duration-200">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accent }} />
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.05] blur-2xl" style={{ background: accent }} />
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Transaction Detail Modal
// -----------------------------------------------------------------------------

function TransactionModal({ tx, onClose, onPrint }: { tx: Transaction; onClose: () => void; onPrint: () => void }) {
  const user = tx.user_details;
  const receipt = tx.mpesa_receipt_number || tx.provider_reference || '—';

  const rows: [string, React.ReactNode][] = [
    ['Reference',      <span className="font-mono font-semibold text-[#0f2e10]">{tx.reference}</span>],
    ['Amount',         <span className="font-bold text-[#0f2e10] text-base">{formatCurrency(Number(tx.amount))}</span>],
    ['Status',         <StatusBadge status={tx.status} />],
    ['Payment Method', <MethodBadge method={tx.payment_method} />],
    ['Receipt / Ref',  <span className="font-mono text-sm text-gray-700">{receipt}</span>],
    ['Date',           <span className="text-gray-700">{formatDate(tx.created_at)}</span>],
    ...(tx.callback_received_at ? [['Callback At', <span className="text-gray-700">{formatDate(tx.callback_received_at)}</span>] as [string, React.ReactNode]] : []),
    ...(tx.mpesa_phone_number   ? [['M-Pesa Phone', <span className="font-mono text-gray-700">{tx.mpesa_phone_number}</span>] as [string, React.ReactNode]] : []),
    ...(tx.description          ? [['Description', <span className="text-gray-700">{tx.description}</span>] as [string, React.ReactNode]] : []),
    ...(user ? [['Account', <span className="text-gray-700">{user.first_name} {user.last_name} ({user.email})</span>] as [string, React.ReactNode]] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="bg-[#0f2e10] px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-1">Transaction Details</p>
              <p className="text-white font-mono font-bold text-lg">{tx.reference}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Accent bar */}
        <div className="h-[3px] bg-gradient-to-r from-[#14532d] via-[#16a34a] to-[#f97316]" />

        {/* Body */}
        <div className="px-6 py-5">
          <div className="space-y-0 divide-y divide-gray-50">
            {rows.map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between py-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-32 flex-shrink-0">{label}</span>
                <div className="text-right flex-1">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onPrint}
            className="flex-1 flex items-center justify-center gap-2 bg-[#0f2e10] hover:bg-[#1a4a1a] text-white text-sm font-semibold py-3 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Receipt
          </button>
          <button
            onClick={onClose}
            className="px-6 text-sm font-semibold text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 rounded-xl transition-colors"
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

function ExportModal({ onClose, onExport }: { onClose: () => void; onExport: (type: 'excel' | 'pdf') => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        <div className="bg-[#0f2e10] px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-1">Export</p>
            <p className="text-white font-bold text-lg">Choose Format</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="h-[3px] bg-gradient-to-r from-[#14532d] via-[#16a34a] to-[#f97316]" />

        <div className="p-6 space-y-3">
          <button
            onClick={() => { onExport('excel'); onClose(); }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900 text-sm">Excel Spreadsheet</p>
              <p className="text-xs text-gray-400 mt-0.5">Download as .xlsx file</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 ml-auto group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => { onExport('pdf'); onClose(); }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-orange-100 hover:border-orange-300 hover:bg-orange-50 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors flex-shrink-0">
              <svg className="w-5 h-5 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900 text-sm">PDF Document</p>
              <p className="text-xs text-gray-400 mt-0.5">Download as .pdf file</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 ml-auto group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full text-sm font-semibold text-gray-400 hover:text-gray-600 py-2 transition-colors">
            Cancel
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
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { transactions, transactionSummary, isLoading, refreshTransactions, loadMore, hasNextPage } = useTransactions({
    search:         filters.search         || undefined,
    status:         (filters.status        || undefined) as TransactionStatus | undefined,
    payment_method: (filters.payment_method || undefined) as PaymentMethod | undefined,
    date_from:      filters.date_from      || undefined,
    date_to:        filters.date_to        || undefined,
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const handlePrint = () => {
    // Placeholder — integrate receipt printing later
    window.alert(`Print receipt for ${selectedTx?.reference} — backend integration pending`);
  };

  const handleExport = (type: 'excel' | 'pdf') => {
    // Placeholder — integrate export later
    window.alert(`Export as ${type.toUpperCase()} — backend integration pending`);
  };

  const clearFilters = () => {
    setFilters({ search: '', status: '', payment_method: '', date_from: '', date_to: '' });
  };

  return (
    <>
      <div className="space-y-6 pb-10">

        {/* ── Page Header ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Transactions</h1>
            <p className="text-sm text-gray-400 mt-0.5">View, filter and export all payment transactions</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshTransactions}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0f2e10] hover:bg-[#1a4a1a] rounded-xl transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
          </div>
        </div>

        {/* ── Stat Cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Revenue"
            value={transactionSummary ? formatCurrency(Number(transactionSummary.total_revenue)) : '—'}
            sub="All time"
            accent="#f97316"
          />
          <StatCard
            label="Total"
            value={transactionSummary?.total_transactions ?? '—'}
            sub="Transactions"
            accent="#0f2e10"
          />
          <StatCard
            label="Completed"
            value={transactionSummary?.completed_transactions ?? '—'}
            sub="Successful"
            accent="#16a34a"
          />
          <StatCard
            label="Pending"
            value={transactionSummary?.pending_transactions ?? '—'}
            sub="Awaiting"
            accent="#f59e0b"
          />
        </div>

        {/* ── Filters ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
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
            <div className="px-6 pb-5 border-t border-gray-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">

                {/* Search */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Search</label>
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

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
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

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Method</label>
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

                {/* Date From */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">From Date</label>
                  <input
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => setFilters(f => ({ ...f, date_from: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-colors"
                  />
                </div>

                {/* Date To */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">To Date</label>
                  <input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => setFilters(f => ({ ...f, date_to: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-colors"
                  />
                </div>

                {/* Clear */}
                <div className="flex items-end">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="w-full px-4 py-2.5 text-sm font-semibold text-[#f97316] border border-orange-200 rounded-xl hover:bg-orange-50 transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Table ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Table Header */}
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Transaction History</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {isLoading ? 'Loading...' : `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
            {activeFilterCount > 0 && (
              <span className="text-xs text-gray-400">
                Filtered by {activeFilterCount} criteria
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="divide-y divide-gray-50">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-32" />
                  <div className="flex-1 h-4 bg-gray-100 rounded w-24" />
                  <div className="h-6 bg-gray-100 rounded-full w-20" />
                  <div className="h-8 bg-gray-100 rounded-xl w-28" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-500">No transactions found</p>
              <p className="text-xs text-gray-400 mt-1">
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
              {/* Column Headers */}
              <div className="grid grid-cols-[1fr_140px_130px_140px] px-6 py-3 bg-gray-50/70 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Reference</span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Action</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-gray-50">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="grid grid-cols-[1fr_140px_130px_140px] items-center px-6 py-4 hover:bg-gray-50/60 cursor-pointer transition-colors group"
                  >
                    {/* Reference */}
                    <div className="min-w-0 pr-4">
                      <p className="font-mono text-sm font-semibold text-gray-900 truncate">{tx.reference}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.created_at)}</p>
                    </div>

                    {/* Amount */}
                    <div>
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(Number(tx.amount))}</p>
                      <MethodBadge method={tx.payment_method} />
                    </div>

                    {/* Status */}
                    <div>
                      <StatusBadge status={tx.status} />
                    </div>

                    {/* Print Receipt Button */}
                    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setSelectedTx(tx); handlePrint(); }}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-[#16a34a] hover:text-[#16a34a] hover:bg-emerald-50 transition-all shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print Receipt
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More */}
              {hasNextPage && (
                <div className="px-6 py-4 border-t border-gray-50 flex justify-center">
                  <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────── */}
      {selectedTx && (
        <TransactionModal
          tx={selectedTx}
          onClose={() => setSelectedTx(null)}
          onPrint={handlePrint}
        />
      )}

      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          onExport={handleExport}
        />
      )}
    </>
  );
}
