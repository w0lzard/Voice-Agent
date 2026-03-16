'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { fetchWallet } from '../lib/api';

const pageTitles = {
  '/dashboard': 'Dashboard Overview',
  '/calls': 'Call History',
  '/voice': 'Voice Agents',
  '/clients': 'Campaign Management',
  '/wallet': 'Wallet & Billing',
  '/knowledge-bases': 'Knowledge Base',
  '/csv': 'Call Analytics',
  '/profile': 'Profile & Settings',
  '/support': 'Help & Support',
};

export default function TopBar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [balance, setBalance] = useState(null);
  const [isBalanceAnimating, setIsBalanceAnimating] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const pageTitle = pageTitles[pathname] || 'VoiceAI Platform';

  useEffect(() => {
    let isMounted = true;
    async function loadBalance() {
      try {
        const res = await fetchWallet();
        if (res.ok && isMounted) {
          const newBalance = res.data?.currentBalance ?? 0;
          setBalance(current => {
            if (current !== null && current !== newBalance) {
              setIsBalanceAnimating(true);
              setTimeout(() => setIsBalanceAnimating(false), 2000);
            }
            return newBalance;
          });
        }
      } catch {}
    }
    if (user) {
      loadBalance();
      const id = setInterval(loadBalance, 30000);
      return () => { isMounted = false; clearInterval(id); };
    }
  }, [user]);

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setIsDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'A';

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b border-white/5" style={{background: 'rgba(10,14,23,0.8)', backdropFilter: 'blur(12px)'}}>
      {/* Page title */}
      <div>
        <h2 className="text-slate-100 font-semibold text-base">{pageTitle}</h2>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Balance */}
        {balance !== null && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 bg-white/3">
            <span className="material-symbols-outlined text-primary text-base">account_balance_wallet</span>
            <span className={`text-sm font-bold ${isBalanceAnimating ? 'text-green-400' : 'text-slate-200'} transition-colors duration-500`}>
              ${balance.toFixed(2)}
            </span>
          </div>
        )}

        {/* Notification bell */}
        <button className="relative size-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">
          <span className="material-symbols-outlined text-xl">notifications</span>
          <span className="absolute top-1.5 right-1.5 size-2 bg-primary rounded-full"></span>
        </button>

        {/* Settings */}
        <button className="size-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">
          <span className="material-symbols-outlined text-xl">settings</span>
        </button>

        {/* User avatar + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-white/5 transition-all"
          >
            <div className="size-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xs font-bold">
              {userInitial}
            </div>
            <span className={`material-symbols-outlined text-slate-500 text-base transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/8 shadow-xl overflow-hidden py-1 z-50" style={{background: '#151c2a'}}>
              <div className="px-4 py-3 border-b border-white/5 mb-1">
                <p className="text-sm font-semibold text-slate-100">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { setIsDropdownOpen(false); router.push('/profile'); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-slate-100 hover:bg-white/5 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">person</span>
                Profile Settings
              </button>
              <button
                onClick={() => { setIsDropdownOpen(false); logout(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
