"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { API_BASE } from '@/lib/api';

export default function AdminLoginPage() {
    const { login } = useAuth();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Please enter your email and password.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (!res.ok || !data.ok) {
                if (data.needsVerification) {
                    router.push(`/verify?email=${encodeURIComponent(data.email || email)}`);
                    return;
                }
                setError(data.error || 'Invalid credentials.');
                return;
            }

            // Verify admin role
            if (data.user?.role !== 'admin') {
                setError('Access Denied: Admin privileges required.');
                return;
            }

            login(data.token, data.user, '/admin/dashboard');
        } catch {
            setError('Network error. Backend not reachable.');
        } finally {
            setLoading(false);
        }
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
                            admin_panel_settings
                        </span>
                    </div>
                </div>

                <h1 className="auth-title">Admin Login</h1>
                <p className="auth-subtitle">Restricted access — authorised personnel only</p>

                {/* Admin badge */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginBottom: 20,
                    padding: '6px 14px',
                    borderRadius: 8,
                    background: 'rgba(43,108,238,0.1)',
                    border: '1px solid rgba(43,108,238,0.2)',
                    width: 'fit-content',
                    margin: '0 auto 20px',
                }}>
                    <span
                        className="material-symbols-outlined"
                        style={{ color: '#2b6cee', fontSize: 14 }}
                    >
                        shield
                    </span>
                    <span style={{ color: '#2b6cee', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Admin Portal
                    </span>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Admin Email</label>
                        <input
                            type="email"
                            placeholder="admin@company.com"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(''); }}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter admin password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                required
                                style={{ paddingRight: 42 }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                style={{
                                    position: 'absolute',
                                    right: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#6b7280',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: 0,
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Verifying...' : 'Access Dashboard'}
                    </button>
                </form>

                <div className="auth-footer" style={{ marginTop: 20 }}>
                    Not an admin?{' '}
                    <Link href="/login" style={{ color: '#2b6cee' }}>
                        User Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
