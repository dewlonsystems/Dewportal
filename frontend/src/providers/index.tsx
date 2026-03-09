// =============================================================================
// DEWPORTAL FRONTEND - COMBINED PROVIDERS
// =============================================================================
// Wraps the entire application with all necessary providers.
// Import this in the root layout to provide context to all components.
// =============================================================================

'use client';

import { type ReactNode, type ReactElement } from 'react';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from './AuthProvider';
import { WebSocketProvider } from './WebSocketProvider';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ProvidersProps {
  children: ReactNode;
}

// -----------------------------------------------------------------------------
// Combined Providers Component
// -----------------------------------------------------------------------------

export function Providers({ children }: ProvidersProps): ReactElement {
  return (
    <QueryProvider>
      <AuthProvider>
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default Providers;