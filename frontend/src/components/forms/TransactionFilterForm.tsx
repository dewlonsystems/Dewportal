// =============================================================================
// DEWPORTAL FRONTEND - TRANSACTION FILTER FORM
// =============================================================================
// Filter form for transaction listing page.
// =============================================================================

'use client';

import { useForm, FormProvider } from 'react-hook-form';
import { FormField } from './FormField';
import { Button } from '@/components/ui';
import { TransactionStatus, PaymentMethod } from '@/types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface TransactionFilterFormProps {
  onFilterChange?: (filters: TransactionFilters) => void;
  onReset?: () => void;
}

export interface TransactionFilters {
  status?: TransactionStatus;
  payment_method?: PaymentMethod;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function TransactionFilterForm({
  onFilterChange,
  onReset,
}: TransactionFilterFormProps) {
  const methods = useForm<TransactionFilters>({
    defaultValues: {
      status: undefined,
      payment_method: undefined,
      date_from: '',
      date_to: '',
      search: '',
    },
  });

  const { handleSubmit, reset } = methods;

  // ---------------------------------------------------------------------------
  // Handle Submit
  // ---------------------------------------------------------------------------

  const handleFormSubmit = (data: TransactionFilters) => {
    onFilterChange?.(data);
  };

  // ---------------------------------------------------------------------------
  // Handle Reset
  // ---------------------------------------------------------------------------

  const handleReset = () => {
    reset();
    onReset?.();
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <FormField<TransactionFilters>
            name="search"
            type="text"
            placeholder="Search reference..."
          />

          {/* Status */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text">
              Status
            </label>
            <select
              {...methods.register('status')}
              className="input"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Payment Method */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text">
              Payment Method
            </label>
            <select
              {...methods.register('payment_method')}
              className="input"
            >
              <option value="">All Methods</option>
              <option value="mpesa">Mpesa</option>
              <option value="paystack">Paystack</option>
            </select>
          </div>

          {/* Date From */}
          <FormField<TransactionFilters>
            name="date_from"
            type="date"
            label="From"
          />

          {/* Date To */}
          <FormField<TransactionFilters>
            name="date_to"
            type="date"
            label="To"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
          >
            Reset Filters
          </Button>
          <Button type="submit" variant="primary">
            Apply Filters
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default TransactionFilterForm;