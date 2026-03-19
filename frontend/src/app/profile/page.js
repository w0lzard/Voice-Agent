'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { updateProfile, changePassword, updateAvatar, deleteAccount } from '../../lib/api';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const fileInputRef = useRef(null);

  const activeUser = user || { name: 'Admin', email: '', provider: 'local', phone: '' };

  const [activeTab, setActiveTab] = useState('general');

  // Profile form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ text: '', type: '' });

  // Avatar state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (activeUser) {
      setName(activeUser.name || '');
      setPhone(activeUser.phone || '');
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMsg({ text: '', type: '' });
    try {
      const res = await updateProfile({ name, phone });
      if (res.ok) {
        setProfileMsg({ text: 'Profile updated successfully!', type: 'success' });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setProfileMsg({ text: res.error || 'Failed to update profile', type: 'error' });
      }
    } catch {
      setProfileMsg({ text: 'A network error occurred', type: 'error' });
    } finally {
      setIsUpdatingProfile(false);
      setTimeout(() => setProfileMsg({ text: '', type: '' }), 5000);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'New passwords do not match', type: 'error' });
      return;
    }
    setIsUpdatingPassword(true);
    setPasswordMsg({ text: '', type: '' });
    try {
      const res = await changePassword({ currentPassword, newPassword });
      if (res.ok) {
        setPasswordMsg({ text: 'Password changed! Logging out...', type: 'success' });
        setTimeout(() => logout(), 2000);
      } else {
        setPasswordMsg({ text: res.error || 'Failed to change password', type: 'error' });
      }
    } catch {
      setPasswordMsg({ text: 'A network error occurred', type: 'error' });
    } finally {
      setIsUpdatingPassword(false);
      setTimeout(() => setPasswordMsg({ text: '', type: '' }), 5000);
    }
  };

  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const res = await updateAvatar(file);
      if (res.ok) {
        window.location.reload();
      } else {
        alert(res.error || 'Failed to upload avatar');
      }
    } catch {
      alert('Error connecting to server to upload avatar.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteAccount();
      if (res.ok) {
        logout();
      } else {
        alert(res.error || 'Failed to delete account');
        setShowDeleteModal(false);
      }
    } catch {
      alert('Network error while deleting account');
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const isGoogleUser = activeUser.provider === 'google';

  const MessageToast = ({ msg }) => {
    if (!msg.text) return null;
    return (
      <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium mb-4 ${
        msg.type === 'success'
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
      }`}>
        <span className="material-symbols-outlined text-[20px]">
          {msg.type === 'success' ? 'check_circle' : 'error'}
        </span>
        {msg.text}
      </div>
    );
  };

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'security', label: 'Security' },
    { id: 'avatar', label: 'Avatar' },
    { id: 'danger', label: 'Danger Zone' },
  ];

  // Mock admin account details (replace with real data when backend is ready)
  const mockAccountDetails = {
    totalCalls: 1284,
    activeAgents: 4,
    joinedDate: activeUser.created_at ? new Date(activeUser.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'January 15, 2024',
    lastLogin: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Profile & Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account details and security credentials</p>
      </div>

      {/* Admin Profile Overview Card */}
      <div className="rounded-2xl border border-primary/20 p-6" style={{ background: 'linear-gradient(135deg, rgba(43,108,238,0.08) 0%, rgba(255,255,255,0.02) 100%)' }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="size-20 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-3xl font-black shrink-0" style={{ boxShadow: '0 0 24px rgba(43,108,238,0.35)' }}>
            {activeUser.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h2 className="text-lg font-bold text-slate-100">{activeUser.name || 'Admin User'}</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary uppercase tracking-wider">
                <span className="material-symbols-outlined text-[12px]">shield</span>
                {user?.role || 'Admin'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 uppercase tracking-wider">
                <span className="size-1.5 rounded-full bg-emerald-400 inline-block" />
                Active
              </span>
            </div>
            <p className="text-sm text-slate-400 mb-3">{activeUser.email}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {[
                { icon: 'call', label: 'Total Calls', value: mockAccountDetails.totalCalls.toLocaleString() },
                { icon: 'mic', label: 'Active Agents', value: mockAccountDetails.activeAgents },
                { icon: 'calendar_today', label: 'Member Since', value: mockAccountDetails.joinedDate },
                { icon: 'schedule', label: 'Last Login', value: mockAccountDetails.lastLogin },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-slate-500 text-[14px]">{item.icon}</span>
                  <span className="text-[11px] text-slate-500">{item.label}:</span>
                  <span className="text-[11px] font-semibold text-slate-300">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Plan badge */}
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3 text-center shrink-0">
            <span className="material-symbols-outlined text-purple-400 text-xl">workspace_premium</span>
            <p className="text-xs font-bold text-purple-300 mt-1">{user?.plan || 'Pro'}</p>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">Plan</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/8">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-white/8 p-6" style={{background: 'rgba(255,255,255,0.03)'}}>
              {/* User header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="size-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
                  {activeUser.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">{activeUser.name || 'User'}</h3>
                  <p className="text-sm text-slate-500">{activeUser.email}</p>
                  <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase tracking-wider">
                    {user?.role || 'Admin'}
                  </span>
                </div>
              </div>

              <MessageToast msg={profileMsg} />

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Full Name</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">person</span>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/8 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-primary/40 transition-colors"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Email Address</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-[18px]">mail</span>
                      <input
                        type="email"
                        value={activeUser.email}
                        disabled
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white/3 border border-white/5 text-slate-600 cursor-not-allowed"
                      />
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">lock</span>
                      Email is tied to your billing identity.
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Phone Number</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">phone</span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/8 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-primary/40 transition-colors"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {isUpdatingProfile ? (
                      <><span className="material-symbols-outlined animate-spin text-base">refresh</span> Saving...</>
                    ) : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right column: account details */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/8 p-5" style={{background: 'rgba(255,255,255,0.03)'}}>
              <h3 className="text-sm font-bold text-slate-200 mb-4">Account Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Workspace ID</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{user?.workspace_id || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Member Since</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Auth Provider</p>
                  <span className="inline-flex mt-1 items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">
                    {activeUser.provider || 'Email'}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Plan</p>
                  <span className="inline-flex mt-1 items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 uppercase">{user?.plan || user?.role || 'Free'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="max-w-lg rounded-2xl border border-white/8 p-6" style={{background: 'rgba(255,255,255,0.03)'}}>
          <h3 className="text-sm font-bold text-slate-200 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-base">shield_lock</span>
            Security & Authentication
          </h3>

          {isGoogleUser && !activeUser.password ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex gap-4">
              <div className="bg-white rounded-full size-10 flex items-center justify-center shrink-0 shadow-sm">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200 mb-1">Google Login Active</p>
                <p className="text-xs text-slate-500 leading-relaxed">You are authenticated via Google. To set a password, use the reset password flow from the login page.</p>
              </div>
            </div>
          ) : (
            <>
              <MessageToast msg={passwordMsg} />
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/8 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-primary/40 transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/8 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-primary/40 transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/8 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-primary/40 transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div className="rounded-xl bg-white/3 border border-white/5 p-3 text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-500 uppercase tracking-widest text-[10px] mb-2">Requirements</p>
                  <p className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[12px] text-emerald-500">check</span> Minimum 8 characters</p>
                  <p className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[12px]">remove</span> 1 uppercase letter</p>
                  <p className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[12px]">remove</span> 1 special character</p>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {isUpdatingPassword ? (
                      <><span className="material-symbols-outlined animate-spin text-base">refresh</span> Updating...</>
                    ) : 'Update Password'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}

      {/* Avatar Tab */}
      {activeTab === 'avatar' && (
        <div className="max-w-sm rounded-2xl border border-white/8 p-6 text-center" style={{background: 'rgba(255,255,255,0.03)'}}>
          <h3 className="text-sm font-bold text-slate-200 mb-6">Profile Picture</h3>

          <div className="relative inline-block mb-6 group">
            <div className="size-32 rounded-full border-4 border-white/10 overflow-hidden flex items-center justify-center mx-auto bg-gradient-to-br from-primary to-purple-600 relative">
              {activeUser.avatar ? (
                <img src={activeUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-black text-white">{activeUser.name?.charAt(0)?.toUpperCase() || 'U'}</span>
              )}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
              >
                <span className="material-symbols-outlined text-2xl mb-1">photo_camera</span>
                <span className="text-xs font-bold uppercase tracking-wider">Change</span>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarSelect}
              className="hidden"
              accept="image/png, image/jpeg, image/webp"
            />
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-slate-300 text-sm font-semibold hover:bg-white/10 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">{isUploadingAvatar ? 'hourglass_empty' : 'upload'}</span>
            {isUploadingAvatar ? 'Uploading...' : 'Upload New Avatar'}
          </button>
          <p className="text-[11px] text-slate-600 mt-4">JPEG, PNG or WEBP. Max 5MB.</p>
        </div>
      )}

      {/* Danger Zone Tab */}
      {activeTab === 'danger' && (
        <div className="max-w-lg rounded-2xl border border-rose-500/20 p-6 relative overflow-hidden" style={{background: 'rgba(255,255,255,0.03)'}}>
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 rounded-l-2xl"></div>
          <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-base">warning</span>
            Danger Zone
          </h3>
          <p className="text-sm text-slate-500 mb-5 leading-relaxed">
            Deleting your account is permanent. This action instantly removes all your data, call history, and active agents.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white text-sm font-semibold transition-all"
          >
            Delete Account
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl border border-white/8 max-w-md w-full p-8 shadow-2xl" style={{background: '#151c2a'}}>
            <div className="size-16 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mb-6 mx-auto">
              <span className="material-symbols-outlined text-3xl">warning</span>
            </div>
            <h3 className="text-xl font-black text-slate-100 mb-3 text-center">Delete Account?</h3>
            <p className="text-sm text-slate-500 mb-8 text-center leading-relaxed">
              This is irreversible. All data, configurations, unspent credits, and analytics will be permanently destroyed.
            </p>
            <div className="flex flex-col-reverse sm:flex-row justify-center gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/8 text-slate-300 text-sm font-semibold hover:bg-white/10 disabled:opacity-50 transition-all"
              >
                Keep my account
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              >
                {isDeleting ? (
                  <><span className="material-symbols-outlined animate-spin text-base">refresh</span> Deleting...</>
                ) : 'Yes, delete everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
