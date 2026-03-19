"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { AUTHORIZED_ADMIN_EMAIL, ADMIN_PASSWORD, isAuthorizedAdmin } from '@/lib/adminConfig';

export default function AdminLoginPage() {
    const { login } = useAuth();

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
        await new Promise(r => setTimeout(r, 600)); // simulate auth delay

        // Step 1 — Check if this email is the authorised admin at all
        if (!isAuthorizedAdmin(email)) {
            setError('You are not authorized to access the admin panel.');
            setLoading(false);
            return;
        }

        // Step 2 — Check password
        if (password !== ADMIN_PASSWORD) {
            setError('Incorrect password. Please try again.');
            setLoading(false);
            return;
        }

        // Authorised — create admin session
        const adminUser = {
            name: 'Admin User',
            email: AUTHORIZED_ADMIN_EMAIL,
            role: 'Super Admin',
            provider: 'local',
            plan: 'Enterprise',
            workspace_id: 'ws_admin_001',
            created_at: '2024-01-15T00:00:00Z',
        };

        login('admin_token_' + Date.now(), adminUser);
        setLoading(false);

        /* --- BACKEND CALL (re-enable when ready) ---
        try {
            const res = await fetch(`${API_BASE}/v1/admin/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                setError(data.error || 'Invalid admin credentials.');
                return;
            }
            login(data.token, data.user);
        } catch {
            setError('Network error. Backend not reachable.');
        } finally {
            setLoading(false);
        }
        ------------------------------------------ */
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                {/* Logo */}
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
                            placeholder="admin@voiceai.com"
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

                {/* Demo hint — shows the single authorised admin credential */}
                <div style={{
                    marginTop: 16,
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                }}>
                    <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>
                        <span style={{ color: '#2b6cee', fontWeight: 700 }}>Demo: </span>
                        <span
                            style={{ cursor: 'pointer', textDecoration: 'underline', color: '#4b7cf3' }}
                            onClick={() => { setEmail(AUTHORIZED_ADMIN_EMAIL); setPassword(ADMIN_PASSWORD); setError(''); }}
                        >
                            {AUTHORIZED_ADMIN_EMAIL}
                        </span>
                        {' '}/ <span style={{ fontFamily: 'monospace', color: '#9ca3af' }}>{ADMIN_PASSWORD}</span>
                    </p>
                </div>

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
