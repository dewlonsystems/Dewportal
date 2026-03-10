// =============================================================================
// DEWPORTAL FRONTEND - USER MANAGEMENT PAGE
// =============================================================================
// src/app/dashboard/users/page.tsx
// =============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Modal } from '@/components/ui';
import { UserForm } from '@/components/forms';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { DASHBOARD_ROUTES } from '@/constants/routes';
import {
  getUsersAction,
  createUserAction,
  updateUserAction,
  userActionAction,
} from '@/server-actions/users';
import { UserCreateInput, UserUpdateInput } from '@/types';
import {
  Users,
  UserPlus,
  Shield,
  ShieldOff,
  KeyRound,
  Pencil,
  Search,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Lock,
  CircleCheck,
  CircleX,
  Clock,
  AlertTriangle,
  X,
  CheckCircle2,
} from 'lucide-react';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'staff';
  is_active: boolean;
  is_locked: boolean;
  last_seen?: string | null;
  created_at: string;
}

type UserFormData =
  | { username: string; email: string; first_name: string; last_name: string; password: string; confirm_password?: string; role: 'admin' | 'staff'; is_active?: boolean; phone_number?: string | null }
  | { first_name?: string; last_name?: string; email?: string; phone_number?: string | null; role?: 'admin' | 'staff'; is_active?: boolean };

type SortField = 'name' | 'email' | 'role' | 'status' | 'last_seen' | 'created_at';
type SortDir   = 'asc' | 'desc';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function getAvatarColor(username: string) {
  const colors = [
    ['#1a3d2b', '#c45c1a'],
    ['#1e3a5f', '#e8923a'],
    ['#3d1a2b', '#c41a4a'],
    ['#1a2b3d', '#1ac4a0'],
    ['#2b1a3d', '#a0c41a'],
  ];
  const idx = username.charCodeAt(0) % colors.length;
  return colors[idx];
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)   return 'Just now';
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 30)  return `${days}d ago`;
  return formatDate(dateStr);
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 12,
      background: type === 'success' ? '#1a3d2b' : '#3d1a1a',
      color: '#fff', borderRadius: 14, padding: '14px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
      animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      maxWidth: 360, fontSize: 14, fontWeight: 500,
    }}>
      {type === 'success'
        ? <CheckCircle2 size={18} color="#4ade80" />
        : <AlertTriangle size={18} color="#f87171" />}
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 2 }}>
        <X size={14} />
      </button>
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '32px 28px',
        maxWidth: 380, width: '100%', margin: '0 16px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: '#fff7ed', border: '3px solid #fed7aa',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <AlertTriangle size={22} color="#c45c1a" />
        </div>
        <p style={{ textAlign: 'center', color: '#374151', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '11px 0', borderRadius: 10,
            border: '2px solid #e5e7eb', background: '#fff',
            color: '#6b7280', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '11px 0', borderRadius: 10,
            border: 'none', background: '#1a3d2b',
            color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function UsersPage() {
  const router    = useRouter();
  const { isAdmin } = useAuth();

  const [users,         setUsers]         = useState<User[]>([]);
  const [filtered,      setFiltered]      = useState<User[]>([]);
  const [isLoading,     setIsLoading]     = useState(false);
  const [isRefreshing,  setIsRefreshing]  = useState(false);
  const [isModalOpen,   setIsModalOpen]   = useState(false);
  const [editingUser,   setEditingUser]   = useState<User | null>(null);
  const [actionType,    setActionType]    = useState<'create' | 'edit'>('create');
  const [toast,         setToast]         = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirm,       setConfirm]       = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [search,        setSearch]        = useState('');
  const [roleFilter,    setRoleFilter]    = useState<'all' | 'admin' | 'staff'>('all');
  const [statusFilter,  setStatusFilter]  = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField,     setSortField]     = useState<SortField>('created_at');
  const [sortDir,       setSortDir]       = useState<SortDir>('desc');
  const [loadingUserId, setLoadingUserId] = useState<number | null>(null);

  // ── Guard ──────────────────────────────────────────────────────────────────

  if (!isAdmin()) {
    router.push(DASHBOARD_ROUTES.DASHBOARD);
    return null;
  }

  // ── Load ───────────────────────────────────────────────────────────────────

  const loadUsers = useCallback(async (silent = false) => {
    try {
      silent ? setIsRefreshing(true) : setIsLoading(true);
      const result = await getUsersAction();
      if (result.error) {
        showToast(result.error, 'error');
        return;
      }
      // Handle both paginated { results: [] } and plain array responses
      const data = (result.data as any)?.results ?? result.data ?? [];
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load users', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ── Filter + Sort ──────────────────────────────────────────────────────────

  useEffect(() => {
    let result = [...users];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        u.username.toLowerCase().includes(q)    ||
        u.email.toLowerCase().includes(q)       ||
        u.first_name.toLowerCase().includes(q)  ||
        u.last_name.toLowerCase().includes(q)
      );
    }
    if (roleFilter   !== 'all') result = result.filter(u => u.role === roleFilter);
    if (statusFilter !== 'all') result = result.filter(u =>
      statusFilter === 'active' ? u.is_active : !u.is_active
    );

    result.sort((a, b) => {
      let aVal: string, bVal: string;
      switch (sortField) {
        case 'name':       aVal = `${a.first_name} ${a.last_name}`; bVal = `${b.first_name} ${b.last_name}`; break;
        case 'email':      aVal = a.email;       bVal = b.email;       break;
        case 'role':       aVal = a.role;        bVal = b.role;        break;
        case 'status':     aVal = String(a.is_active); bVal = String(b.is_active); break;
        case 'last_seen':  aVal = a.last_seen || ''; bVal = b.last_seen || ''; break;
        default:           aVal = a.created_at; bVal = b.created_at;
      }
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    setFiltered(result);
  }, [users, search, roleFilter, statusFilter, sortField, sortDir]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={13} style={{ opacity: 0.25 }} />;
    return sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleCreate = () => { setActionType('create'); setEditingUser(null); setIsModalOpen(true); };
  const handleEdit   = (u: User) => { setActionType('edit'); setEditingUser(u); setIsModalOpen(true); };

  const prepareCreateData = (formData: UserFormData): UserCreateInput => {
    const d = formData as any;
    const { confirm_password, ...clean } = d;
    return { ...clean, phone_number: clean.phone_number ?? undefined, is_active: clean.is_active ?? true };
  };

  const prepareUpdateData = (formData: UserFormData): UserUpdateInput => {
    const d = formData as any;
    return { ...d, phone_number: d.phone_number ?? undefined };
  };

  const handleFormSubmit = async (formData: UserFormData) => {
    try {
      setIsLoading(true);
      const result = actionType === 'create'
        ? await createUserAction(prepareCreateData(formData))
        : await updateUserAction(editingUser!.id, prepareUpdateData(formData));

      if (result.error) throw new Error(result.error);

      showToast(`User ${actionType === 'create' ? 'created' : 'updated'} successfully`, 'success');
      setIsModalOpen(false);
      await loadUsers(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Operation failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = (user: User) => {
    const action = user.is_active ? 'disable' : 'enable';
    setConfirm({
      message: `${action === 'disable' ? 'Disable' : 'Enable'} account for ${user.first_name} ${user.last_name}?`,
      onConfirm: async () => {
        setConfirm(null);
        setLoadingUserId(user.id);
        try {
          const result = await userActionAction(user.id, action);
          if (result.error) throw new Error(result.error);
          showToast(`User ${action}d successfully`, 'success');
          await loadUsers(true);
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Operation failed', 'error');
        } finally {
          setLoadingUserId(null);
        }
      },
    });
  };

  const handleResetPassword = (user: User) => {
    setConfirm({
      message: `Reset password for ${user.first_name} ${user.last_name}? A temporary password will be sent to ${user.email}.`,
      onConfirm: async () => {
        setConfirm(null);
        setLoadingUserId(user.id);
        try {
          const result = await userActionAction(user.id, 'reset_password');
          if (result.error) throw new Error(result.error);
          showToast(`Password reset for ${user.username}`, 'success');
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Operation failed', 'error');
        } finally {
          setLoadingUserId(null);
        }
      },
    });
  };

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalUsers   = users.length;
  const activeUsers  = users.filter(u => u.is_active).length;
  const adminCount   = users.filter(u => u.role === 'admin').length;
  const lockedCount  = users.filter(u => u.is_locked).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .um-page * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
        .um-mono { font-family: 'DM Mono', monospace !important; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: 600px 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.85); }
        }

        .um-row {
          animation: fadeUp 0.3s ease both;
          transition: background 0.15s ease;
        }
        .um-row:hover { background: #fafaf8 !important; }

        .um-btn {
          display: inline-flex; align-items: center; gap: 6px;
          border: none; cursor: pointer; font-weight: 600;
          transition: all 0.15s ease; white-space: nowrap;
        }
        .um-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .um-btn:not(:disabled):active { transform: scale(0.97); }

        .um-filter-pill {
          border: 1.5px solid #e5e7eb; border-radius: 8px;
          padding: 6px 14px; font-size: 13px; font-weight: 500;
          cursor: pointer; background: #fff; color: #6b7280;
          transition: all 0.15s;
        }
        .um-filter-pill.active {
          background: #1a3d2b; border-color: #1a3d2b; color: #fff;
        }
        .um-filter-pill:hover:not(.active) { border-color: #1a3d2b; color: #1a3d2b; }

        .um-th {
          display: flex; align-items: center; gap: 4px;
          cursor: pointer; user-select: none;
          color: #9ca3af; font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.06em;
          transition: color 0.15s;
        }
        .um-th:hover { color: #1a3d2b; }
        .um-th.active { color: #1a3d2b; }

        .um-action-btn {
          width: 30px; height: 30px; border-radius: 8px;
          border: 1.5px solid #e5e7eb; background: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.15s; color: #6b7280;
        }
        .um-action-btn:hover:not(:disabled) { border-color: #1a3d2b; color: #1a3d2b; background: #f0f9f4; }
        .um-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .um-action-btn.danger:hover:not(:disabled) { border-color: #ef4444; color: #ef4444; background: #fef2f2; }
        .um-action-btn.warning:hover:not(:disabled) { border-color: #c45c1a; color: #c45c1a; background: #fff7ed; }

        .um-skeleton {
          background: linear-gradient(90deg, #f3f4f6 25%, #e9eaec 50%, #f3f4f6 75%);
          background-size: 600px 100%;
          animation: shimmer 1.4s infinite linear;
          border-radius: 6px;
        }

        .um-spinning { animation: spin 0.7s linear infinite; }
        .um-pulse    { animation: pulse-dot 1.8s ease-in-out infinite; }

        .um-stat-card {
          background: #fff; border: 1.5px solid #f0ede8;
          border-radius: 16px; padding: 20px 22px;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .um-stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(26,61,43,0.08); }

        .um-search-wrap {
          position: relative; flex: 1; min-width: 200px;
        }
        .um-search-input {
          width: 100%; padding: 9px 14px 9px 38px;
          border: 1.5px solid #e5e7eb; border-radius: 10px;
          font-size: 14px; color: #374151; background: #fff;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .um-search-input:focus {
          border-color: #1a3d2b;
          box-shadow: 0 0 0 3px rgba(26,61,43,0.08);
        }
        .um-search-icon {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%); color: #9ca3af; pointer-events: none;
        }
      `}</style>

      <div className="um-page" style={{ padding: '0 0 48px', minHeight: '100vh' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #1a3d2b 0%, #0f2419 100%)',
          borderRadius: 20, padding: '32px 36px', marginBottom: 28,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Dot grid pattern */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '24px 24px', pointerEvents: 'none',
          }} />
          {/* Orange glow */}
          <div style={{
            position: 'absolute', top: -40, right: -40, width: 200, height: 200,
            background: 'radial-gradient(circle, rgba(196,92,26,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'rgba(196,92,26,0.2)', border: '1.5px solid rgba(196,92,26,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Users size={18} color="#e8923a" />
                </div>
                <h1 style={{ margin: 0, color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
                  User Management
                </h1>
              </div>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
                {totalUsers} total · {activeUsers} active · {adminCount} admin{adminCount !== 1 ? 's' : ''}
                {lockedCount > 0 && ` · ${lockedCount} locked`}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="um-btn"
                onClick={() => loadUsers(true)}
                disabled={isRefreshing}
                style={{
                  padding: '10px 16px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.15)',
                  color: '#fff', fontSize: 13,
                }}
              >
                <RefreshCw size={14} className={isRefreshing ? 'um-spinning' : ''} />
                Refresh
              </button>
              <button
                className="um-btn"
                onClick={handleCreate}
                style={{
                  padding: '10px 18px', borderRadius: 10,
                  background: '#c45c1a', border: 'none',
                  color: '#fff', fontSize: 13,
                  boxShadow: '0 4px 14px rgba(196,92,26,0.4)',
                }}
              >
                <UserPlus size={14} />
                New User
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Users',    value: totalUsers,              icon: Users,       color: '#1a3d2b', bg: '#f0f9f4' },
            { label: 'Active',         value: activeUsers,             icon: CircleCheck, color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Inactive',       value: totalUsers - activeUsers, icon: CircleX,    color: '#9ca3af', bg: '#f9fafb' },
            { label: 'Admins',         value: adminCount,              icon: Shield,      color: '#c45c1a', bg: '#fff7ed' },
            { label: 'Locked',         value: lockedCount,             icon: Lock,        color: '#ef4444', bg: '#fef2f2' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="um-stat-card"
              style={{ animation: `fadeUp 0.4s ease ${i * 0.06}s both` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af' }}>
                  {stat.label}
                </span>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <stat.icon size={13} color={stat.color} />
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#111827', lineHeight: 1 }}>
                {isLoading ? <span className="um-skeleton" style={{ display: 'inline-block', width: 32, height: 26 }} /> : stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Filters ────────────────────────────────────────────────────── */}
        <div style={{
          background: '#fff', borderRadius: 14, border: '1.5px solid #f0ede8',
          padding: '16px 20px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          {/* Search */}
          <div className="um-search-wrap">
            <Search size={15} className="um-search-icon" />
            <input
              className="um-search-input"
              placeholder="Search users, emails…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Role filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'admin', 'staff'] as const).map(r => (
              <button key={r} className={`um-filter-pill ${roleFilter === r ? 'active' : ''}`}
                onClick={() => setRoleFilter(r)}>
                {r === 'all' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'active', 'inactive'] as const).map(s => (
              <button key={s} className={`um-filter-pill ${statusFilter === s ? 'active' : ''}`}
                onClick={() => setStatusFilter(s)}>
                {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Results count */}
          {(search || roleFilter !== 'all' || statusFilter !== 'all') && (
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* ── Table ──────────────────────────────────────────────────────── */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1.5px solid #f0ede8',
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(26,61,43,0.04)',
        }}>
          {/* Table head */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2.4fr 2fr 1fr 1.2fr 1.2fr 1fr 1.4fr',
            padding: '13px 20px',
            borderBottom: '1.5px solid #f3f0eb',
            background: '#fafaf8',
            gap: 8,
          }}>
            {([
              { label: 'User',       field: 'name'       as SortField },
              { label: 'Email',      field: 'email'      as SortField },
              { label: 'Role',       field: 'role'       as SortField },
              { label: 'Status',     field: 'status'     as SortField },
              { label: 'Last Seen',  field: 'last_seen'  as SortField },
              { label: 'Joined',     field: 'created_at' as SortField },
              { label: 'Actions',    field: null },
            ]).map(col => (
              <div
                key={col.label}
                className={col.field ? `um-th ${sortField === col.field ? 'active' : ''}` : 'um-th'}
                onClick={() => col.field && handleSort(col.field)}
                style={{ cursor: col.field ? 'pointer' : 'default' }}
              >
                {col.label}
                {col.field && <SortIcon field={col.field} />}
              </div>
            ))}
          </div>

          {/* Rows */}
          {isLoading && users.length === 0 ? (
            // Skeleton rows
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '2.4fr 2fr 1fr 1.2fr 1.2fr 1fr 1.4fr',
                padding: '16px 20px', gap: 8,
                borderBottom: '1px solid #f9f8f6',
                alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="um-skeleton" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="um-skeleton" style={{ height: 13, width: '70%', marginBottom: 5 }} />
                    <div className="um-skeleton" style={{ height: 11, width: '50%' }} />
                  </div>
                </div>
                {[100, 60, 80, 70, 60, 80].map((w, j) => (
                  <div key={j} className="um-skeleton" style={{ height: 13, width: `${w}%` }} />
                ))}
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div style={{
              padding: '64px 20px', textAlign: 'center',
              color: '#9ca3af',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: '#f9fafb', border: '1.5px solid #f3f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <Users size={22} color="#d1d5db" />
              </div>
              <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: '#374151' }}>
                {search || roleFilter !== 'all' || statusFilter !== 'all' ? 'No matching users' : 'No users yet'}
              </p>
              <p style={{ margin: 0, fontSize: 13 }}>
                {search || roleFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first user to get started'}
              </p>
            </div>
          ) : (
            filtered.map((user, idx) => {
              const [bgColor, dotColor] = getAvatarColor(user.username);
              const isRowLoading = loadingUserId === user.id;

              return (
                <div
                  key={user.id}
                  className="um-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2.4fr 2fr 1fr 1.2fr 1.2fr 1fr 1.4fr',
                    padding: '14px 20px', gap: 8,
                    borderBottom: idx < filtered.length - 1 ? '1px solid #f9f8f6' : 'none',
                    alignItems: 'center',
                    animationDelay: `${idx * 0.04}s`,
                    opacity: isRowLoading ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {/* User */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: `linear-gradient(135deg, ${bgColor}, ${dotColor})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: '#fff',
                      letterSpacing: '0.02em',
                    }}>
                      {getInitials(user.first_name, user.last_name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="um-mono" style={{ margin: 0, fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        @{user.username}
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  <p className="um-mono" style={{ margin: 0, fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email}
                  </p>

                  {/* Role */}
                  <div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                      ...(user.role === 'admin'
                        ? { background: '#fff7ed', color: '#c45c1a', border: '1px solid #fed7aa' }
                        : { background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }),
                    }}>
                      {user.role === 'admin' ? <Shield size={10} /> : <Users size={10} />}
                      {user.role}
                    </span>
                  </div>

                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                      ...(user.is_active
                        ? { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }
                        : { background: '#f9fafb', color: '#9ca3af', border: '1px solid #e5e7eb' }),
                    }}>
                      <span className={user.is_active ? 'um-pulse' : ''} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: user.is_active ? '#16a34a' : '#d1d5db',
                        display: 'inline-block',
                      }} />
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {user.is_locked && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '4px 8px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                        background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca',
                      }}>
                        <Lock size={9} />
                        Locked
                      </span>
                    )}
                  </div>

                  {/* Last Seen */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={11} color="#d1d5db" />
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>
                      {timeAgo(user.last_seen)}
                    </span>
                  </div>

                  {/* Joined */}
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>
                    {formatDate(user.created_at)}
                  </span>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {/* Edit */}
                    <button
                      className="um-action-btn"
                      onClick={() => handleEdit(user)}
                      disabled={isRowLoading}
                      title="Edit user"
                    >
                      <Pencil size={13} />
                    </button>

                    {/* Enable / Disable */}
                    <button
                      className={`um-action-btn ${user.is_active ? 'danger' : ''}`}
                      onClick={() => handleToggleActive(user)}
                      disabled={isRowLoading}
                      title={user.is_active ? 'Disable user' : 'Enable user'}
                    >
                      {user.is_active ? <ShieldOff size={13} /> : <Shield size={13} />}
                    </button>

                    {/* Reset Password */}
                    <button
                      className="um-action-btn warning"
                      onClick={() => handleResetPassword(user)}
                      disabled={isRowLoading}
                      title="Reset password"
                    >
                      {isRowLoading
                        ? <RefreshCw size={13} className="um-spinning" />
                        : <KeyRound size={13} />
                      }
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Footer count */}
          {!isLoading && filtered.length > 0 && (
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #f3f0eb',
              background: '#fafaf8',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>
                Showing <strong style={{ color: '#374151' }}>{filtered.length}</strong> of <strong style={{ color: '#374151' }}>{totalUsers}</strong> users
              </span>
              {(search || roleFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  onClick={() => { setSearch(''); setRoleFilter('all'); setStatusFilter('all'); }}
                  style={{
                    fontSize: 12, color: '#c45c1a', background: 'none',
                    border: 'none', cursor: 'pointer', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <X size={11} /> Clear filters
                </button>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={actionType === 'create' ? 'Create User' : 'Edit User'}
        size="lg"
      >
        <UserForm
          mode={actionType}
          initialData={editingUser || undefined}
          userId={editingUser?.id}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {/* ── Confirm Dialog ─────────────────────────────────────────────────── */}
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
