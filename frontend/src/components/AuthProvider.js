"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { API_BASE } from '../lib/api';
import { isAuthorizedAdmin } from '../lib/adminConfig';

const AuthContext = createContext(null);

const PUBLIC_ROUTES = ['/login', '/signup', '/verify', '/admin/login'];
// Routes only the authorized admin email can visit
const ADMIN_ONLY_ROUTES = ['/admins'];

const normalizePath = (path = '') => {
    if (!path) return '/';
    return path.length > 1 ? path.replace(/\/+$/, '') : path;
};

export function AuthProvider({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const normalizedPath = normalizePath(pathname);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(null);

    useEffect(() => {
        console.debug('AuthProvider initializing, API_BASE =', API_BASE);
    }, []);

    useEffect(() => {
        const stored = localStorage.getItem('ea_token');
        if (stored) {
            setToken(stored);
            fetchUser(stored);
        } else {
            setLoading(false);
        }
    }, []);

    async function fetchUser(jwt) {
        try {
            const res = await fetch(`${API_BASE}/v1/auth/me`, {
                headers: { Authorization: `Bearer ${jwt}` }
            });
            if (res.ok) {
                const text = await res.text();
                try {
                    const data = JSON.parse(text);
                    if (data.ok) {
                        setUser(data.user);
                        // Keep cache in sync with fresh server data
                        localStorage.setItem('ea_user', JSON.stringify(data.user));
                        return;
                    }
                } catch { /* non-JSON */ }
            }
            // Server responded but token is invalid — clear everything
            localStorage.removeItem('ea_token');
            localStorage.removeItem('ea_user');
            setToken(null);
        } catch {
            // Backend offline — fall back to cached user so dashboard stays accessible
            const cached = localStorage.getItem('ea_user');
            if (cached) {
                try { setUser(JSON.parse(cached)); } catch { /* corrupted cache */ }
            }
        } finally {
            setLoading(false);
        }
    }

    function login(jwt, userData) {
        localStorage.setItem('ea_token', jwt);
        localStorage.setItem('ea_user', JSON.stringify(userData));
        setToken(jwt);
        setUser(userData);
        router.replace('/dashboard');
    }

    function logout() {
        localStorage.removeItem('ea_token');
        localStorage.removeItem('ea_user');
        setToken(null);
        setUser(null);
        router.replace('/login');
    }

    const isPublicRoute = PUBLIC_ROUTES.includes(normalizedPath);
    const isAdminOnlyRoute = ADMIN_ONLY_ROUTES.includes(normalizedPath);
    const isAdmin = isAuthorizedAdmin(user?.email);

    // Run redirects in an effect (never during render)
    useEffect(() => {
        if (loading) return;
        if (!user && !isPublicRoute) {
            router.replace('/login');
        } else if (user && isPublicRoute) {
            router.replace('/dashboard');
        } else if (user && isAdminOnlyRoute && !isAdmin) {
            // Non-admin tried to navigate to an admin-only route → send to dashboard
            router.replace('/dashboard');
        }
    }, [loading, user, normalizedPath]);

    // Show loading screen until auth is resolved AND any redirect has navigated away
    const isRedirecting =
        loading ||
        (!user && !isPublicRoute) ||
        (user && isPublicRoute) ||
        (user && isAdminOnlyRoute && !isAdmin);

    if (isRedirecting) {
        return (
            <AuthContext.Provider value={{ user, token, login, logout, loading, isAdmin }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#101622', color: '#9ca3af' }}>
                    Loading...
                </div>
            </AuthContext.Provider>
        );
    }

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

export default AuthProvider;
