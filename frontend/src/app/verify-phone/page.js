"use client";

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

function VerifyPhoneForm() {
    const searchParams = useSearchParams();
    const { login } = useAuth();
    const phone = searchParams.get('phone') || '';
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRefs = useRef([]);

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    const handleChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newCode = [...code];
        newCode[index] = value.slice(-1);
        setCode(newCode);
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
        if (newCode.every(d => d !== '') && index === 5) {
            handleVerify(newCode.join(''));
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            const newCode = pasted.split('');
            setCode(newCode);
            inputRefs.current[5]?.focus();
            handleVerify(pasted);
            e.preventDefault();
        }
    };

    const handleVerify = async (codeStr) => {
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/phone-otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, otp: codeStr || code.join('') }),
            });
            const data = await res.json();
            if (!data.ok) {
                setError(data.error || 'Verification failed');
                setCode(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
                return;
            }
            login(data.token, data.user);
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24, color: 'white' }}>
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.41 2 2 0 0 1 3.07 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
                    </svg>
                </div>

                <h1 className="auth-title">Verify Phone</h1>
                <p className="auth-subtitle">
                    We sent a 6-digit code to<br />
                    <strong style={{ color: 'var(--text-primary)' }}>{phone}</strong>
                </p>

                {error && <div className="auth-error">{error}</div>}

                <div style={{ marginTop: 20, marginBottom: 20 }}>
                    <div className="verify-inputs" onPaste={handlePaste}>
                        {code.map((digit, i) => (
                            <input
                                key={i}
                                ref={el => inputRefs.current[i] = el}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(i, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(i, e)}
                                disabled={loading}
                            />
                        ))}
                    </div>
                </div>

                <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '10px 16px', fontSize: 14, justifyContent: 'center' }}
                    onClick={() => handleVerify()}
                    disabled={loading || code.some(d => d === '')}
                >
                    {loading ? 'Verifying...' : 'Verify Phone'}
                </button>
            </div>
        </div>
    );
}

export default function VerifyPhonePage() {
    return (
        <Suspense fallback={
            <div className="auth-page">
                <div className="auth-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
            </div>
        }>
            <VerifyPhoneForm />
        </Suspense>
    );
}
