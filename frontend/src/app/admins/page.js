'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { AUTHORIZED_ADMIN_EMAIL } from '@/lib/adminConfig';

// ─── Mock Data ────────────────────────────────────────────────────────────────
// TODO: Replace with fetch('/api/v1/admins') when backend is ready
const mockAdmins = [
  {
    id: 'adm_001',
    name: 'Admin User',
    email: 'admin@voiceai.com',
    role: 'Super Admin',
    provider: 'Email',
    status: 'active',
    lastLogin: new Date().toISOString(),
    loginCount: 142,
    createdAt: '2024-01-15T08:00:00Z',
    phone: '+1 (555) 001-0001',
  },
  {
    id: 'adm_002',
    name: 'Sarah Mitchell',
    email: 'sarah.m@voiceai.com',
    role: 'Admin',
    provider: 'Google',
    status: 'active',
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    loginCount: 87,
    createdAt: '2024-02-10T09:30:00Z',
    phone: '+1 (555) 002-0002',
  },
  {
    id: 'adm_003',
    name: 'James Kapoor',
    email: 'james.k@voiceai.com',
    role: 'Moderator',
    provider: 'Email',
    status: 'active',
    lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    loginCount: 53,
    createdAt: '2024-03-05T11:00:00Z',
    phone: '+1 (555) 003-0003',
  },
  {
    id: 'adm_004',
    name: 'Priya Sharma',
    email: 'priya.s@voiceai.com',
    role: 'Viewer',
    provider: 'Google',
    status: 'inactive',
    lastLogin: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    loginCount: 19,
    createdAt: '2024-04-20T14:00:00Z',
    phone: '+1 (555) 004-0004',
  },
  {
    id: 'adm_005',
    name: 'Tom Erikson',
    email: 'tom.e@voiceai.com',
    role: 'Admin',
    provider: 'Email',
    status: 'suspended',
    lastLogin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    loginCount: 6,
    createdAt: '2024-05-01T10:00:00Z',
    phone: '+1 (555) 005-0005',
  },
];

// Mock login activity log
const mockLoginActivity = [
  { id: 1, name: 'Admin User', email: 'admin@voiceai.com', action: 'Login', ip: '192.168.1.10', device: 'Chrome / Windows', time: new Date().toISOString() },
  { id: 2, name: 'Sarah Mitchell', email: 'sarah.m@voiceai.com', action: 'Login', ip: '10.0.0.45', device: 'Safari / macOS', time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: 3, name: 'Admin User', email: 'admin@voiceai.com', action: 'Password Changed', ip: '192.168.1.10', device: 'Chrome / Windows', time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
  { id: 4, name: 'James Kapoor', email: 'james.k@voiceai.com', action: 'Login', ip: '172.16.0.8', device: 'Firefox / Linux', time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 5, name: 'Sarah Mitchell', email: 'sarah.m@voiceai.com', action: 'Logout', ip: '10.0.0.45', device: 'Safari / macOS', time: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString() },
  { id: 6, name: 'Tom Erikson', email: 'tom.e@voiceai.com', action: 'Failed Login', ip: '203.0.113.77', device: 'Chrome / Android', time: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const map = {
    'Super Admin': 'bg-primary/15 text-primary border-primary/20',
    'Admin': 'bg-purple-500/15 text-purple-300 border-purple-500/20',
    'Moderator': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    'Viewer': 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${map[role] || 'bg-slate-500/10 text-slate-400 border-white/5'}`}>
      {role}
    </span>
  );
}

function StatusDot({ status }) {
  const map = {
    active: 'bg-emerald-400',
    inactive: 'bg-slate-500',
    suspended: 'bg-rose-500',
  };
  const label = { active: 'Active', inactive: 'Inactive', suspended: 'Suspended' };
  const textMap = { active: 'text-emerald-400', inactive: 'text-slate-400', suspended: 'text-rose-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${textMap[status] || 'text-slate-400'}`}>
      <span className={`size-1.5 rounded-full ${map[status] || 'bg-slate-500'}`} />
      {label[status] || status}
    </span>
  );
}

function ActionBadge({ action }) {
  const map = {
    'Login': 'bg-emerald-500/10 text-emerald-400',
    'Logout': 'bg-slate-500/10 text-slate-400',
    'Password Changed': 'bg-amber-500/10 text-amber-400',
    'Failed Login': 'bg-rose-500/10 text-rose-400',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${map[action] || 'bg-slate-500/10 text-slate-400'}`}>
      {action}
    </span>
  );
}

function ProviderIcon({ provider }) {
  if (provider === 'Google') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <svg width="12" height="12" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
          <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
          <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
          <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
        </svg>
        Google
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
      <span className="material-symbols-outlined text-[12px]">mail</span>
      Email
    </span>
  );
}

// ─── Admin Detail Modal ───────────────────────────────────────────────────────
function AdminDetailModal({ admin, isCurrentUser, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden" style={{ background: '#131a27' }}>
        {/* Banner */}
        <div className="h-20 relative" style={{ background: 'linear-gradient(135deg, #1a2d6b 0%, #2b6cee 100%)' }}>
          {isCurrentUser && (
            <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wider">
              You
            </span>
          )}
        </div>

        {/* Avatar overlapping banner */}
        <div className="px-6 -mt-10 pb-6">
          <div className="flex items-end justify-between mb-4">
            <div className="size-20 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-2xl font-black border-4 border-[#131a27]">
              {admin.name.charAt(0).toUpperCase()}
            </div>
            <StatusDot status={admin.status} />
          </div>

          <h3 className="text-lg font-bold text-slate-100">{admin.name}</h3>
          <p className="text-sm text-slate-500 mb-3">{admin.email}</p>
          <RoleBadge role={admin.role} />

          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              { icon: 'phone', label: 'Phone', value: admin.phone },
              { icon: 'login', label: 'Provider', value: admin.provider },
              { icon: 'calendar_today', label: 'Joined', value: new Date(admin.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
              { icon: 'schedule', label: 'Last Login', value: timeAgo(admin.lastLogin) },
              { icon: 'history', label: 'Login Count', value: admin.loginCount },
              { icon: 'badge', label: 'ID', value: admin.id },
            ].map(item => (
              <div key={item.label} className="rounded-xl bg-white/3 border border-white/5 px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="material-symbols-outlined text-slate-500 text-[13px]">{item.icon}</span>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">{item.label}</p>
                </div>
                <p className="text-xs font-medium text-slate-300 truncate">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/8 text-slate-300 text-sm font-medium hover:bg-white/10 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('admins');

  // Belt-and-suspenders guard — AuthProvider already redirects non-admins,
  // but this blocks any edge case where the component renders before the redirect fires.
  if (user?.email !== AUTHORIZED_ADMIN_EMAIL) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
        <div className="size-14 rounded-2xl bg-rose-500/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-rose-400 text-3xl">gpp_bad</span>
        </div>
        <h2 className="text-lg font-bold text-slate-100">Access Denied</h2>
        <p className="text-sm text-slate-400 max-w-sm">
          You are not authorized to access the admin panel.
        </p>
      </div>
    );
  }
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [search, setSearch] = useState('');

  // Merge real logged-in user as first entry if not already present
  const admins = mockAdmins.map(a =>
    a.email === user?.email
      ? { ...a, name: user.name || a.name, email: user.email, lastLogin: new Date().toISOString() }
      : a
  );

  const filteredAdmins = admins.filter(a => {
    const q = search.toLowerCase();
    return !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.role.toLowerCase().includes(q);
  });

  const stats = {
    total: admins.length,
    active: admins.filter(a => a.status === 'active').length,
    inactive: admins.filter(a => a.status === 'inactive').length,
    suspended: admins.filter(a => a.status === 'suspended').length,
  };

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Admins</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage admin accounts and view login activity</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary rounded-xl text-white text-sm font-semibold hover:bg-primary/90 transition-colors" style={{ boxShadow: '0 4px 14px rgba(43,108,238,0.3)' }}>
            <span className="material-symbols-outlined text-base">person_add</span>
            Invite Admin
          </button>
        </div>

        {/* Currently Logged In Card */}
        <div className="rounded-2xl border border-primary/20 p-5" style={{ background: 'linear-gradient(135deg, rgba(43,108,238,0.08) 0%, rgba(255,255,255,0.02) 100%)' }}>
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xl font-black shrink-0" style={{ boxShadow: '0 0 20px rgba(43,108,238,0.35)' }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-100">{user?.name || 'Admin'}</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 uppercase tracking-wider">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  Currently Active
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">{user?.email || '—'}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">shield</span>
                  Role: <span className="text-slate-300 font-semibold ml-1">{user?.role || 'Admin'}</span>
                </span>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">schedule</span>
                  Session started: <span className="text-slate-300 font-semibold ml-1">{timeAgo(new Date().toISOString())}</span>
                </span>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">workspace_premium</span>
                  Plan: <span className="text-slate-300 font-semibold ml-1">{user?.plan || 'Pro'}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Admins', value: stats.total, icon: 'group', color: 'text-primary' },
            { label: 'Active', value: stats.active, icon: 'check_circle', color: 'text-emerald-400' },
            { label: 'Inactive', value: stats.inactive, icon: 'pause_circle', color: 'text-slate-400' },
            { label: 'Suspended', value: stats.suspended, icon: 'block', color: 'text-rose-400' },
          ].map(item => (
            <div key={item.label} className="rounded-2xl border border-white/8 p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-xl ${item.color}`}>{item.icon}</span>
                <div>
                  <p className="text-2xl font-bold text-slate-100">{item.value}</p>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">{item.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/8">
          {[
            { id: 'admins', label: 'All Admins', icon: 'group' },
            { id: 'activity', label: 'Login Activity', icon: 'history' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* All Admins Tab */}
        {activeTab === 'admins' && (
          <>
            {/* Search */}
            <div className="relative max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-base">search</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email or role..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-white/5 border border-white/8 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-primary/40 transition-colors"
              />
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Admin', 'Role', 'Status', 'Provider', 'Last Login', 'Logins', ''].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAdmins.map(admin => {
                      const isCurrentUser = admin.email === user?.email;
                      return (
                        <tr
                          key={admin.id}
                          className={`border-b border-white/5 transition-colors hover:bg-white/2 ${isCurrentUser ? 'bg-primary/3' : ''}`}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {admin.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-200 truncate">{admin.name}</p>
                                  {isCurrentUser && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary uppercase tracking-wider shrink-0">You</span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 truncate">{admin.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3"><RoleBadge role={admin.role} /></td>
                          <td className="px-5 py-3"><StatusDot status={admin.status} /></td>
                          <td className="px-5 py-3"><ProviderIcon provider={admin.provider} /></td>
                          <td className="px-5 py-3">
                            <div>
                              <p className="text-xs text-slate-300">{timeAgo(admin.lastLogin)}</p>
                              <p className="text-[10px] text-slate-600">{formatDate(admin.lastLogin)}</p>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-400">{admin.loginCount}</td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => setSelectedAdmin(admin)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-xs font-medium text-slate-300 hover:bg-primary/10 hover:border-primary/20 hover:text-primary transition-all"
                            >
                              <span className="material-symbols-outlined text-[13px]">info</span>
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Login Activity Tab */}
        {activeTab === 'activity' && (
          <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Admin', 'Action', 'IP Address', 'Device', 'Time'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mockLoginActivity.map(log => {
                    const isCurrentUser = log.email === user?.email;
                    return (
                      <tr key={log.id} className={`border-b border-white/5 hover:bg-white/2 transition-colors ${isCurrentUser ? 'bg-primary/3' : ''}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="size-7 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                              {log.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-200">
                                {log.name}
                                {isCurrentUser && <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary uppercase">You</span>}
                              </p>
                              <p className="text-[10px] text-slate-600">{log.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3"><ActionBadge action={log.action} /></td>
                        <td className="px-5 py-3 text-xs text-slate-400 font-mono">{log.ip}</td>
                        <td className="px-5 py-3 text-xs text-slate-400">{log.device}</td>
                        <td className="px-5 py-3">
                          <p className="text-xs text-slate-300">{timeAgo(log.time)}</p>
                          <p className="text-[10px] text-slate-600">{formatDate(log.time)}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Admin Detail Modal */}
      {selectedAdmin && (
        <AdminDetailModal
          admin={selectedAdmin}
          isCurrentUser={selectedAdmin.email === user?.email}
          onClose={() => setSelectedAdmin(null)}
        />
      )}
    </>
  );
}
