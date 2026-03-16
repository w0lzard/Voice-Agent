"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { API_BASE } from '../../lib/api';

export default function LoginPage() {
    const { login } = useAuth();
    const [tab, setTab] = useState('email'); // 'email' | 'phone'

    // Email tab state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Phone tab state
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const url = `${API_BASE}/v1/auth/login`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.needsVerification) {
                    window.location.href = `/verify?email=${encodeURIComponent(data.email)}`;
                    return;
                }
                setError(data.error || 'Login failed');
                return;
            }

            if (data.ok) {
                login(data.token, data.user);
            }
        } catch {
            setError('Network error. Please make sure the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/v1/auth/phone-otp/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, name })
            });
            const data = await res.json();
            if (!data.ok) {
                setError(data.error || 'Failed to send OTP');
                return;
            }
            window.location.href = `/verify-phone?phone=${encodeURIComponent(phone)}`;
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = () => {
        const clientId = 'GOOGLE_CLIENT_ID';
        if (!clientId || clientId === 'GOOGLE_CLIENT_ID') {
            setError('Google OAuth not configured. Add GOOGLE_CLIENT_ID to .env');
            return;
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24, color: 'white' }}>
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                </div>

                <h1 className="auth-title">Welcome Back</h1>
                <p className="auth-subtitle">Sign in to your Estate Agent dashboard</p>

                <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--bg-secondary, #1a1a2e)', borderRadius: 8, padding: 4 }}>
                    <button
                        type="button"
                        onClick={() => { setTab('email'); setError(''); }}
                        style={{
                            flex: 1, padding: '7px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                            background: tab === 'email' ? 'var(--accent, #6366f1)' : 'transparent',
                            color: tab === 'email' ? '#fff' : 'var(--text-muted, #888)',
                            transition: 'all 0.15s',
                        }}
                    >
                        Email
                    </button>
                    <button
                        type="button"
                        onClick={() => { setTab('phone'); setError(''); }}
                        style={{
                            flex: 1, padding: '7px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                            background: tab === 'phone' ? 'var(--accent, #6366f1)' : 'transparent',
                            color: tab === 'phone' ? '#fff' : 'var(--text-muted, #888)',
                            transition: 'all 0.15s',
                        }}
                    >
                        Phone
                    </button>
                </div>

                {error && <div className="auth-error">{error}</div>}

                {tab === 'email' ? (
                    <form className="auth-form" onSubmit={handleEmailSubmit}>
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                ) : (
                    <form className="auth-form" onSubmit={handlePhoneSubmit}>
                        <div className="form-group">
                            <label>Phone Number</label>
                            <input
                                type="tel"
                                placeholder="+91 98765 43210"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Your Name</label>
                            <input
                                type="text"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                minLength={2}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Sending OTP...' : 'Send OTP'}
                        </button>
                    </form>
                )}

                <div className="auth-divider">or</div>

                <button className="btn btn-google" onClick={handleGoogle} disabled={loading}>
                    <svg width="18" height="18" viewBox="0 0 48 48">
                        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                        <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                    </svg>
                    Continue with Google
                </button>

                <div className="auth-footer">
                    Don't have an account? <Link href="/signup">Sign up</Link>
                </div>
            </div>
        </div>
    );
}
