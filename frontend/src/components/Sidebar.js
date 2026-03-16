'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

const navItems = [
  { href: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { href: '/voice', icon: 'mic', label: 'Voice Agents' },
  { href: '/clients', icon: 'campaign', label: 'Campaigns' },
  { href: '/wallet', icon: 'account_balance_wallet', label: 'Wallet' },
  { href: '/knowledge-bases', icon: 'database', label: 'Knowledge Base' },
  { href: '/calls', icon: 'history', label: 'Call History' },
  { href: '/csv', icon: 'analytics', label: 'Analytics' },
];

const bottomNavItems = [
  { href: '/profile', icon: 'person', label: 'Profile' },
  { href: '/support', icon: 'help', label: 'Help & Support' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const isActive = (href) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/calls') return pathname === '/calls';
    return pathname?.startsWith(href);
  };

  const navLinkClass = (href) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium ${
      isActive(href)
        ? 'bg-primary/10 text-primary border border-primary/20'
        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
    }`;

  return (
    <aside className="w-64 flex flex-col shrink-0 border-r border-white/5" style={{background: '#0a0e17'}}>
      {/* Logo */}
      <div className="p-5 flex items-center gap-3 border-b border-white/5">
        <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg" style={{boxShadow: '0 0 20px rgba(43,108,238,0.4)'}}>
          <span className="material-symbols-outlined text-white text-xl">graphic_eq</span>
        </div>
        <div>
          <h1 className="text-slate-100 font-bold text-base leading-tight">VoiceAI</h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
            <span className={`material-symbols-outlined text-[20px] ${isActive(item.href) ? 'fill-1' : ''}`}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-white/5 space-y-1">
        {bottomNavItems.map((item) => (
          <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        {/* User info + logout */}
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <div className="size-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
