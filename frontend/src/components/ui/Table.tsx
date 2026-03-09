// =============================================================================
// DEWPORTAL FRONTEND - TABLE COMPONENT
// =============================================================================
// Reusable table component for data display.
// =============================================================================

'use client';

import {
  TableHTMLAttributes,
  forwardRef,
  ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export const Table = forwardRef<HTMLTableElement, TableProps>(
  (
    { className, striped = false, hoverable = true, compact = false, children, ...props },
    ref
  ) => {
    const baseStyles = cn(
      'w-full text-sm text-left',
      {
        'divide-y divide-border': true,
        'striped': striped,
      },
      className
    );

    return (
      <div className="table-container overflow-x-auto rounded-lg border border-border">
        <table ref={ref} className={baseStyles} {...props}>
          {children}
        </table>
      </div>
    );
  }
);

Table.displayName = 'Table';

// -----------------------------------------------------------------------------
// Table Header
// -----------------------------------------------------------------------------

export interface TableHeaderProps extends TableHTMLAttributes<HTMLTableSectionElement> {}

export const TableHeader = forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <thead
        ref={ref}
        className={cn('bg-background/50', className)}
        {...props}
      />
    );
  }
);

TableHeader.displayName = 'TableHeader';

// -----------------------------------------------------------------------------
// Table Body
// -----------------------------------------------------------------------------

export interface TableBodyProps extends TableHTMLAttributes<HTMLTableSectionElement> {}

export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, ...props }, ref) => {
    return <tbody ref={ref} className={cn('divide-y divide-border', className)} {...props} />;
  }
);

TableBody.displayName = 'TableBody';

// -----------------------------------------------------------------------------
// Table Row
// -----------------------------------------------------------------------------

export interface TableRowProps extends TableHTMLAttributes<HTMLTableRowElement> {}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={cn(
          'transition-colors hover:bg-background/50',
          className
        )}
        {...props}
      />
    );
  }
);

TableRow.displayName = 'TableRow';

// -----------------------------------------------------------------------------
// Table Head
// -----------------------------------------------------------------------------

export interface TableHeadProps extends TableHTMLAttributes<HTMLTableCellElement> {}

export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={cn(
          'px-4 py-3 font-medium text-text-muted border-b border-border',
          className
        )}
        {...props}
      />
    );
  }
);

TableHead.displayName = 'TableHead';

// -----------------------------------------------------------------------------
// Table Cell
// -----------------------------------------------------------------------------

export interface TableCellProps extends TableHTMLAttributes<HTMLTableCellElement> {}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={cn(
          'px-4 py-3 text-text border-b border-border last:border-b-0',
          className
        )}
        {...props}
      />
    );
  }
);

TableCell.displayName = 'TableCell';

// -----------------------------------------------------------------------------
// Table Caption
// -----------------------------------------------------------------------------

export interface TableCaptionProps extends TableHTMLAttributes<HTMLTableCaptionElement> {}

export const TableCaption = forwardRef<HTMLTableCaptionElement, TableCaptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <caption
        ref={ref}
        className={cn('mt-4 text-sm text-text-muted', className)}
        {...props}
      />
    );
  }
);

TableCaption.displayName = 'TableCaption';

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default Table;