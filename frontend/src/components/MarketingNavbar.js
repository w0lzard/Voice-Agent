'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from './AuthProvider';

export default function MarketingNavbar() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: '/features', label: 'Features' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/use-cases', label: 'Use Cases' },
    { href: '/about', label: 'About' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5" style={{background: 'rgba(10,14,23,0.9)', backdropFilter: 'blur(12px)'}}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="size-9 bg-primary rounded-xl flex items-center justify-center" style={{boxShadow: '0 0 16px rgba(43,108,238,0.4)'}}>
            <span className="material-symbols-outlined text-white text-[18px]">graphic_eq</span>
          </div>
          <span className="text-slate-100 font-bold text-base">VoiceAI</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Link href="/dashboard" className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors" style={{boxShadow: '0 4px 14px rgba(43,108,238,0.3)'}}>
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors">
                Log in
              </Link>
              <Link href="/signup" className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors" style={{boxShadow: '0 4px 14px rgba(43,108,238,0.3)'}}>
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden size-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white/5 transition-all">
          <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 px-6 py-4 space-y-3" style={{background: 'rgba(10,14,23,0.98)'}}>
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors py-1">
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
            <Link href="/login" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-slate-400 text-center py-2">Log in</Link>
            <Link href="/signup" onClick={() => setMobileOpen(false)} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold text-center">Get Started</Link>
          </div>
        </div>
      )}
    </header>
  );
}
