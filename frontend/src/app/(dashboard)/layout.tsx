// =============================================================================
// DEWPORTAL FRONTEND - DASHBOARD LAYOUT
// =============================================================================
// Main dashboard layout with header, sidebar, and content area.
// =============================================================================

import { ReactNode } from 'react';
import { DashboardLayout } from '@/components/layout';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function DashboardRootLayout({ children }: { children: ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}