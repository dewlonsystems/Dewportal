// =============================================================================
// DEWPORTAL FRONTEND - TYPE DEFINITIONS
// =============================================================================
// All TypeScript types for the application.
// These types mirror the backend Django models and API responses.
// =============================================================================

// -----------------------------------------------------------------------------
// User Types
// -----------------------------------------------------------------------------

export type UserRole = 'admin' | 'staff';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  phone_number?: string | null;
  role: UserRole;
  is_active: boolean;
  is_locked: boolean;
  must_change_password: boolean;
  last_seen?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCreateInput {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  role: UserRole;
  password?: string;
  confirm_password?: string;
}

export interface UserUpdateInput {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  email?: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  phone_number?: string | null;
  role: UserRole;
  is_active: boolean;
  is_locked: boolean;
  must_change_password: boolean;
  last_seen?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: UserResponse[];
}

export interface PasswordChangeInput {
  current_password: string;
  new_password: string;
  confirm_new_password: string;
}

export interface ForcePasswordChangeInput {
  temporary_password: string;
  new_password: string;
  confirm_new_password: string;
}

export interface PasswordResetRequestInput {
  reason?: string;
}

export interface PasswordResetRequest {
  id: number;
  user: number;
  user_details?: User;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string | null;
  admin_notes?: string | null;
  processed_by?: number | null;
  processed_by_details?: User | null;
  processed_at?: string | null;
  created_at: string;
}

export interface PasswordResetRequestResponse {
  id: number;
  user: number;
  user_details?: User;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string | null;
  admin_notes?: string | null;
  processed_by?: number | null;
  processed_by_details?: User | null;
  processed_at?: string | null;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Authentication Types
// -----------------------------------------------------------------------------

export interface LoginInput {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  must_change_password?: boolean;
  user: {
    id: number;
    username: string;
    email: string;
    role: UserRole;
  };
}

export interface TokenRefreshResponse {
  access: string;
}

export interface SessionVerifyResponse {
  user: {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    phone_number?: string | null;
    is_active?: boolean;
    is_locked?: boolean;
    last_seen?: string | null;
    role: UserRole;
    must_change_password?: boolean;
    created_at?: string; 
    updated_at?: string;
  };
  session_valid: boolean;
}

export interface AccountStatusResponse {
  exists: boolean;
  is_locked?: boolean;
  locked_until?: string | null;
  is_active?: boolean;
  must_change_password?: boolean;
}

export interface LogoutInput {
  refresh: string;
}

// -----------------------------------------------------------------------------
// Transaction & Payment Types
// -----------------------------------------------------------------------------

export type PaymentMethod = 'mpesa' | 'paystack';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface Transaction {
  id: number;
  reference: string;
  provider_reference?: string | null;
  user: number;
  user_details?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  amount: string;
  payment_method: PaymentMethod;
  status: TransactionStatus;
  description?: string | null;
  mpesa_phone_number?: string | null;
  mpesa_receipt_number?: string | null;
  paystack_authorization_url?: string | null;
  created_at: string;
  callback_received_at?: string | null;
}

export interface TransactionInitiateInput {
  payment_method: PaymentMethod;
  amount: string;
  phone_number?: string;
  description?: string;
}

export interface TransactionInitiateResponse {
  success: boolean;
  transaction?: Transaction;
  checkout_request_id?: string;
  authorization_url?: string;
  access_code?: string;
  message: string;
  error?: string;
}

export interface TransactionResponse {
  id: number;
  reference: string;
  provider_reference?: string | null;
  user: number;
  user_details?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  amount: string;
  payment_method: PaymentMethod;
  status: TransactionStatus;
  description?: string | null;
  mpesa_phone_number?: string | null;
  mpesa_receipt_number?: string | null;
  paystack_authorization_url?: string | null;
  created_at: string;
  callback_received_at?: string | null;
}

export interface TransactionListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: TransactionResponse[];
  records?: TransactionResponse[];
   next_cursor?: string | null;
   has_more?: boolean;
}

export interface TransactionSummary {
  total_revenue: string;
  currency: string;
  completed_transactions: number;
  pending_transactions: number;
  failed_transactions: number;
  total_transactions: number;
}

export interface TransactionFilterInput {
  status?: TransactionStatus;
  payment_method?: PaymentMethod;
  user?: number;
  search?: string;
  date_from?: string;
  date_to?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
  cursor?: string | null;
  limit?: number;
}

export interface MpesaCallbackInput {
  Body: {
    stkCallback: {
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: string | number;
        }>;
      };
    };
  };
}

export interface PaystackWebhookInput {
  event: string;
  data: {
    transaction: {
      reference: string;
      status: string;
      amount: number;
      currency: string;
      paid_at?: string;
      channel?: string;
    };
    customer?: {
      email: string;
      customer_code?: string;
    };
  };
}

// -----------------------------------------------------------------------------
// Ledger Types
// -----------------------------------------------------------------------------

export type LedgerEntryType = 'credit' | 'debit';

export type LedgerSource = 'mpesa' | 'paystack' | 'manual' | 'refund' | 'system';

export interface LedgerEntry {
  id: number;
  reference: string;
  transaction?: number | null;
  transaction_details?: {
    id: number;
    reference: string;
    payment_method: PaymentMethod;
    status: TransactionStatus;
  } | null;
  user: number;
  user_details?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  amount: string;
  entry_type: LedgerEntryType;
  balance_after: string;
  description: string;
  source: LedgerSource;
  is_finalized: boolean;
  created_by?: number | null;
  created_by_details?: {
    id: number;
    username: string;
  } | null;
  ip_address?: string | null;
  created_at: string;
}

export interface LedgerBalance {
  balance: string;
  total_credits: string;
  total_debits: string;
  entry_count: number;
  currency: string;
  as_of: string;
}

export interface LedgerIntegrityCheck {
  status: 'passed' | 'issues_found';
  issues: Array<{
    type: string;
    count: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  checked_at: string;
}

// -----------------------------------------------------------------------------
// Audit Log Types
// -----------------------------------------------------------------------------

export type AuditActionType =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'account_locked'
  | 'password_changed'
  | 'password_reset_requested'
  | 'password_reset_approved'
  | 'password_reset_rejected'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'user_disabled'
  | 'user_enabled'
  | 'transaction_initiated'
  | 'transaction_completed'
  | 'transaction_failed'
  | 'payment_initiated'
  | 'payment_callback'
  | 'payment_webhook'
  | 'ledger_entry_created'
  | 'profile_updated'
  | 'token_blacklisted'
  | 'token_refreshed'
  | 'session_expired'
  | 'permission_denied'
  | 'api_request'
  | 'websocket_connected'
  | 'websocket_disconnected'
  | 'system_event'
  | 'config_changed'
  | 'export_data'
  | 'integrity_check'
  | 'other';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditLog {
  id: number;
  user?: number | null;
  user_details?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: UserRole;
  } | null;
  action_type: AuditActionType;
  severity: AuditSeverity;
  category: string;
  description: string;
  details: Record<string, unknown>;
  related_object_type?: string | null;
  related_object_id?: number | null;
  related_object_reference?: string | null;
  related_object_details?: {
    type: string;
    id: number;
    reference: string;
  } | null;
  ip_address?: string | null;
  user_agent?: string | null;
  request_method?: string | null;
  request_path?: string | null;
  session_id?: string | null;
  server_hostname?: string | null;
  is_finalized: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLogCursorResponse {
  records: AuditLog[];
  next_cursor: string | null;
  previous_cursor: string | null;
  has_more: boolean;
  limit: number;
  total_returned: number;
  filters_applied: Record<string, unknown>;
}

export interface AuditLogFilters {
  user_id?: number;
  action_type?: AuditActionType;
  category?: string;
  severity?: AuditSeverity;
  date_from?: string;
  date_to?: string;
  search?: string;
  cursor?: string | null;
  limit?: number;
}

export interface AuditSummary {
  period_counts: {
    last_24h: number;
    last_7d: number;
    last_30d: number;
    total: number;
  };
  severity_breakdown: Record<string, number>;
  top_action_types: Array<{
    action_type: AuditActionType;
    count: number;
  }>;
  category_breakdown: Record<string, number>;
  unique_users?: number | null;
  generated_at: string;
}

export interface UserLastSeen {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  last_seen?: string | null;
  is_active: boolean;
  is_locked: boolean;
  is_online: boolean;
}

export interface UserLastSeenResponse {
  users: UserLastSeen[];
  count: number;
}

export interface UserSession {
  id: number;
  session_key: string;
  ip_address?: string | null;
  user_agent?: string | null;
  is_active: boolean;
  last_activity: string;
  expires_at?: string | null;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Notification Types
// -----------------------------------------------------------------------------

export type NotificationType =
  | 'payment'
  | 'transaction'
  | 'user_management'
  | 'password_reset'
  | 'system'
  | 'audit'
  | 'alert';

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';

export interface Notification {
  id: number;
  notification_type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  related_object_type?: string | null;
  related_object_id?: number | null;
  related_object_reference?: string | null;
  related_object_details?: {
    type: string;
    id: number;
    reference: string;
  } | null;
  is_read: boolean;
  read_at?: string | null;
  is_dismissed: boolean;
  dismissed_at?: string | null;
  delivered_via_websocket: boolean;
  websocket_delivered_at?: string | null;
  data: Record<string, unknown>;
  action_url?: string | null;
  created_at: string;
}

export interface NotificationSummary {
  unread_count: number;
  unread_by_severity: Record<string, number>;
  recent_count: number;
  last_checked: string;
}

// -----------------------------------------------------------------------------
// Dashboard Types
// -----------------------------------------------------------------------------

export interface DashboardDailyRevenue {
  date: string;
  revenue: number;
}

export interface DashboardTransactionStatus {
  status: TransactionStatus;
  count: number;
  total: number;
}

export interface DashboardRecentActivity {
  id: number;
  action: string;
  user: string;
  timestamp: string;
  details?: string;
}

export interface DashboardUserStats {
  total_users: number;
  active_users: number;
  admin_count: number;
  staff_count: number;
}

export interface DashboardResponse {
  summary: {
    total_revenue: number;
    total_transactions: number;
    currency: string;
  };
  daily_revenue: DashboardDailyRevenue[];
  transaction_status: DashboardTransactionStatus[];
  recent_activity: DashboardRecentActivity[];
  user_stats?: DashboardUserStats | null;
  generated_at: string;
  user_role: UserRole;
}

// -----------------------------------------------------------------------------
// API Response Types
// -----------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  data?: T;
  success: boolean;
  error?: string;
  message?: string;
  details?: Record<string, unknown>;
  status?: number;
  redirect?: string;
  status_code?: number;
}

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
  status_code?: number;
  message?: string;
  status?: number;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface CursorPaginatedResponse<T> {
  records: T[];
  next_cursor: string | null;
  previous_cursor: string | null;
  has_more: boolean;
  limit: number;
  total_returned: number;
}

// -----------------------------------------------------------------------------
// WebSocket Types
// -----------------------------------------------------------------------------

export type WebSocketEventType =
  | 'connected'
  | 'notification'
  | 'transaction_update'
  | 'audit_log_entry'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'password_reset_request'
  | 'password_reset_processed'
  | 'payment_status_update'
  | 'dashboard_update'
  | 'user_logout'
  | 'error'
  | 'ping'
  | 'pong';

export interface WebSocketMessage<T = unknown> {
  type: WebSocketEventType;
  data?: T;
  message?: string;
  timestamp?: string;
}

export interface WebSocketConnection {
  id: number;
  user: number;
  user_details?: {
    id: number;
    username: string;
    email: string;
    role: UserRole;
  };
  channel_name: string;
  ip_address?: string | null;
  user_agent?: string | null;
  is_active: boolean;
  last_heartbeat: string;
  disconnected_at?: string | null;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Common Types
// -----------------------------------------------------------------------------

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface TableSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface TablePagination {
  page: number;
  pageSize: number;
  total: number;
  cursor?: string | null;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface StateWithLoading<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// -----------------------------------------------------------------------------
// Environment Types
// -----------------------------------------------------------------------------

export interface EnvConfig {
  api_url: string;
  ws_url: string;
  app_name: string;
  app_url: string;
  enable_mpesa: boolean;
  enable_paystack: boolean;
  enable_debug: boolean;
  ws_heartbeat_interval: number;
  ws_reconnect_interval: number;
  session_timeout: number;
}