// =============================================================================
// DEWPORTAL FRONTEND - USER PROFILE PAGE
// =============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button, Alert, Spinner } from '@/components/ui';
import { PasswordChangeForm } from '@/components/forms';
import { FormField } from '@/components/forms/FormField';
import { useForm, FormProvider } from 'react-hook-form';
import { formatDate } from '@/lib/utils';
import { updateProfileAction } from '@/server-actions/users';
import {
  User,
  FileText,
  Lock,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Info,
  ShieldCheck,
  Eye,
  Shield,
  Pencil,
  X,
  Mail,
  Phone,
  AtSign,
} from 'lucide-react';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ProfileFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
}

// -----------------------------------------------------------------------------
// Skeleton
// -----------------------------------------------------------------------------

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 ${className}`}
      style={{ animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%' }}
    />
  );
}

// -----------------------------------------------------------------------------
// Section Card
// -----------------------------------------------------------------------------

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Section Header
// -----------------------------------------------------------------------------

function SectionHeader({ title, subtitle, icon, action }: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(26,61,43,0.08)' }}
        >
          <span className="text-[#1a3d2b]">{icon}</span>
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Info Row
// -----------------------------------------------------------------------------

function InfoRow({ label, value, icon, isLast = false }: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-4 ${!isLast ? 'border-b border-gray-50' : ''}`}>
      <div className="flex items-center gap-2.5">
        {icon && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300"
            style={{ background: 'rgba(0,0,0,0.03)' }}>
            {icon}
          </div>
        )}
        <span className="text-sm text-gray-400 font-medium">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Modal
// -----------------------------------------------------------------------------

function Modal({ isOpen, onClose, title, subtitle, icon, children }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(26,61,43,0.08)' }}
            >
              <span className="text-[#1a3d2b]">{icon}</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">{title}</h3>
              <p className="text-xs text-gray-400">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'security'>('info');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const methods = useForm<ProfileFormData>({
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone_number: user?.phone_number || '',
    },
  });

  const { handleSubmit, reset } = methods;

  useEffect(() => {
    if (user) {
      reset({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
      });
    }
  }, [user, reset]);

  const handleProfileUpdate = async (data: ProfileFormData) => {
    try {
      setIsSaving(true);
      setError(null);
      const result = await updateProfileAction(data);
      if (result?.success === true) {
        setSuccessMessage('Profile updated successfully');
        setIsEditModalOpen(false);
      } else if (result?.error) {
        setError(result.error);
      } else {
        setError('Update failed: Unexpected response from server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    // Reset form back to current user values on cancel
    if (user) {
      reset({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
      });
    }
  }, [user, reset]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const initials = user?.first_name && user?.last_name
    ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
    : user?.username?.charAt(0)?.toUpperCase() || 'U';

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user?.username;

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in-95 { from { transform: scale(0.95); } to { transform: scale(1); } }
        .animate-in { animation: fade-in 0.15s ease, zoom-in-95 0.15s ease; }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-6 pb-8">

        {/* ── Hero Card ───────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-[#1a3d2b] shadow-xl">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, #c45c1a 0%, transparent 50%),
                              radial-gradient(circle at 80% 20%, #c45c1a 0%, transparent 40%)`,
          }} />
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />

          <div className="relative px-6 py-8 sm:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-[#c45c1a]/20 border-2 border-[#c45c1a]/40 flex items-center justify-center shadow-xl">
                  <span className="text-2xl font-black text-[#c45c1a]">{initials}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-[#1a3d2b] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-white tracking-tight">{displayName}</h1>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#c45c1a]/20 text-[#c45c1a] border border-[#c45c1a]/30">
                    {user?.role}
                  </span>
                </div>
                <p className="text-white/50 text-sm">{user?.email}</p>
                <p className="text-white/30 text-xs mt-1">@{user?.username}</p>
              </div>

              {/* Stats */}
              <div className="flex gap-6 sm:gap-8">
                <div className="text-center">
                  {user?.is_active
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                    : <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                  }
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">
                    {user?.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-white capitalize">{user?.role}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Role</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-white">
                    {user?.created_at ? new Date(user.created_at).getFullYear() : '—'}
                  </p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Since</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Alerts ──────────────────────────────────────────────── */}
        {error && (
          <Alert variant="error" dismissible onDismiss={() => setError(null)}>{error}</Alert>
        )}
        {successMessage && (
          <Alert variant="success" dismissible onDismiss={() => setSuccessMessage(null)}>{successMessage}</Alert>
        )}

        {/* ── Tabs ────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-gray-100/80 rounded-xl p-1 w-fit">
          {(['info', 'security'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              {tab === 'info' ? <User className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {tab === 'info' ? 'Profile Info' : 'Security'}
            </button>
          ))}
        </div>

        {/* ── Tab: Profile Info ────────────────────────────────────── */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* ── Personal Info — read only ── */}
            <SectionCard className="lg:col-span-3">
              <SectionHeader
                title="Personal Information"
                subtitle="Your contact and identity details"
                icon={<User className="w-4 h-4" />}
                action={
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#1a3d2b] border border-[#1a3d2b]/20 hover:bg-[#1a3d2b]/6 transition-colors"
                    style={{ background: 'rgba(26,61,43,0.04)' }}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                }
              />
              <div className="px-6 py-2">
                <InfoRow
                  icon={<User className="w-3.5 h-3.5" />}
                  label="First Name"
                  value={user?.first_name || '—'}
                />
                <InfoRow
                  icon={<User className="w-3.5 h-3.5" />}
                  label="Last Name"
                  value={user?.last_name || '—'}
                />
                <InfoRow
                  icon={<Mail className="w-3.5 h-3.5" />}
                  label="Email Address"
                  value={user?.email || '—'}
                />
                <InfoRow
                  icon={<Phone className="w-3.5 h-3.5" />}
                  label="Phone Number"
                  value={user?.phone_number || '—'}
                  isLast
                />
              </div>
            </SectionCard>

            {/* ── Account Details ── */}
            <SectionCard className="lg:col-span-2">
              <SectionHeader
                title="Account Details"
                subtitle="Your account metadata"
                icon={<FileText className="w-4 h-4" />}
              />
              <div className="px-6 py-2">
                <InfoRow
                  icon={<AtSign className="w-3.5 h-3.5" />}
                  label="Username"
                  value={`@${user?.username}`}
                />
                <InfoRow
                  icon={<Shield className="w-3.5 h-3.5" />}
                  label="Role"
                  value={
                    <span
                      className="capitalize px-2.5 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: 'rgba(26,61,43,0.08)', color: '#1a3d2b' }}
                    >
                      {user?.role}
                    </span>
                  }
                />
                <InfoRow
                  label="Member Since"
                  value={user?.created_at ? formatDate(user.created_at) : '—'}
                />
                <InfoRow
                  label="Last Login"
                  value={user?.last_seen ? formatDate(user.last_seen) : '—'}
                />
                <InfoRow
                  label="Status"
                  isLast
                  value={
                    <span className={`flex items-center gap-1.5 text-xs font-bold ${user?.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
                      {user?.is_active
                        ? <CheckCircle2 className="w-3.5 h-3.5" />
                        : <XCircle className="w-3.5 h-3.5" />
                      }
                      {user?.is_active ? 'Active' : 'Inactive'}
                    </span>
                  }
                />
              </div>

              <div className="mx-6 mb-6 p-4 rounded-xl bg-amber-50 border border-amber-100">
                <div className="flex items-start gap-3">
                  <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Contact your administrator to update your username or role.
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── Tab: Security ────────────────────────────────────────── */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* ── Password — read only prompt ── */}
            <SectionCard className="lg:col-span-3">
              <SectionHeader
                title="Password"
                subtitle="Manage your account password"
                icon={<KeyRound className="w-4 h-4" />}
              />
              <div className="p-6">
                {/* Password display row */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(26,61,43,0.08)' }}
                    >
                      <Lock className="w-4 h-4 text-[#1a3d2b]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Current Password</p>
                      <p className="text-xs text-gray-400 mt-0.5 tracking-widest">••••••••••••</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#1a3d2b] border border-[#1a3d2b]/20 hover:bg-[#1a3d2b]/6 transition-colors"
                    style={{ background: 'rgba(26,61,43,0.04)' }}
                  >
                    <Pencil className="w-3 h-3" />
                    Change
                  </button>
                </div>

                {/* Last changed hint */}
                <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  Choose a strong password and never reuse it across accounts.
                </p>
              </div>
            </SectionCard>

            {/* ── Security Tips ── */}
            <SectionCard className="lg:col-span-2">
              <SectionHeader
                title="Security Tips"
                subtitle="Best practices for your account"
                icon={<ShieldCheck className="w-4 h-4" />}
              />
              <div className="p-6 space-y-3">
                {[
                  { icon: <KeyRound className="w-4 h-4 text-[#1a3d2b]" />, title: 'Use a strong password', desc: 'At least 12 characters with numbers and symbols.' },
                  { icon: <RefreshCw className="w-4 h-4 text-[#1a3d2b]" />, title: 'Change regularly', desc: 'Update your password every 90 days.' },
                  { icon: <Shield className="w-4 h-4 text-[#1a3d2b]" />, title: "Don't reuse passwords", desc: 'Use a unique password for this account.' },
                  { icon: <Eye className="w-4 h-4 text-[#1a3d2b]" />, title: 'Watch for suspicious activity', desc: 'Report unusual logins to your admin.' },
                ].map((tip) => (
                  <div key={tip.title} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100/80 transition-colors">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(26,61,43,0.08)' }}>
                      {tip.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{tip.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{tip.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}
      </div>

      {/* ── Edit Profile Modal ───────────────────────────────────── */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title="Edit Profile"
        subtitle="Update your personal information"
        icon={<Pencil className="w-4 h-4" />}
      >
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(handleProfileUpdate)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField<ProfileFormData>
                name="first_name"
                label="First Name"
                type="text"
                fullWidth
              />
              <FormField<ProfileFormData>
                name="last_name"
                label="Last Name"
                type="text"
                fullWidth
              />
            </div>
            <FormField<ProfileFormData>
              name="email"
              label="Email Address"
              type="email"
              fullWidth
            />
            <FormField<ProfileFormData>
              name="phone_number"
              label="Phone Number"
              type="tel"
              fullWidth
            />
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-50">
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <Button type="submit" variant="primary" isLoading={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </FormProvider>
      </Modal>

      {/* ── Change Password Modal ────────────────────────────────── */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Change Password"
        subtitle="Choose a strong, unique password"
        icon={<KeyRound className="w-4 h-4" />}
      >
        <PasswordChangeForm
          isForceChange={false}
          onSuccess={() => setIsPasswordModalOpen(false)}
        />
      </Modal>
    </>
  );
}