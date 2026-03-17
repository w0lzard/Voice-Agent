"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE } from '../../lib/api';

export default function SignupPage() {
    const router = useRouter();
    const [tab, setTab] = useState('email'); // 'email' | 'phone'

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const url = `${API_BASE}/v1/auth/signup`;

            const payload =
                tab === 'email'
                    ? { name, email, password }
                    : { name, phone, password };

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                setError(data.error || 'Signup failed');
                return;
            }

            if (tab === 'email') {
                const verifyUrl =
                    `/verify?email=${encodeURIComponent(email)}` +
                    (data.devOtp ? `&devOtp=${encodeURIComponent(data.devOtp)}` : '');
                router.push(verifyUrl);
            } else {
                const verifyUrl =
                    `/verify-phone?phone=${encodeURIComponent(phone)}` +
                    (data.devOtp ? `&devOtp=${encodeURIComponent(data.devOtp)}` : '');
                router.push(verifyUrl);
            }
        } catch {
            setError('Network error. Please make sure the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = () => {
        setError('Google OAuth not configured. Add GOOGLE_CLIENT_ID to .env');
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <div
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: 14,
                            background: '#2b6cee',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 20px rgba(43,108,238,0.4)'
                        }}
                    >
                        <span
                            className="material-symbols-outlined"
                            style={{ color: 'white', fontSize: 24 }}
                        >
                            graphic_eq
                        </span>
                    </div>
                </div>

                <h1 className="auth-title">Create Account</h1>
                <p className="auth-subtitle">Get started with VoiceAI Platform</p>

                <div
                    style={{
                        display: 'flex',
                        gap: 6,
                        marginBottom: 20,
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: 10,
                        padding: 4
                    }}
                >
                    <button
                        type="button"
                        onClick={() => {
                            setTab('email');
                            setError('');
                        }}
                        style={{
                            flex: 1,
                            padding: '8px 0',
                            borderRadius: 7,
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                            background: tab === 'email' ? '#2b6cee' : 'transparent',
                            color: tab === 'email' ? '#fff' : '#6b7280',
                            transition: 'all 0.15s'
                        }}
                    >
                        Email
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setTab('phone');
                            setError('');
                        }}
                        style={{
                            flex: 1,
                            padding: '8px 0',
                            borderRadius: 7,
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                            background: tab === 'phone' ? '#2b6cee' : 'transparent',
                            color: tab === 'phone' ? '#fff' : '#6b7280',
                            transition: 'all 0.15s'
                        }}
                    >
                        Phone Number
                    </button>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    {tab === 'email' ? (
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
                    ) : (
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
                    )}

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="Minimum 8 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

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
                    Already have an account? <Link href="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}