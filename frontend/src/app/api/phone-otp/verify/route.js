import { NextResponse } from 'next/server';
import { otpStore } from '@/lib/phone-otp-store';

const GATEWAY_URL = (
    process.env.GATEWAY_URL || 'http://localhost:8000'
).replace(/\/+$/, '');

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || '';

export async function POST(request) {
    let phone, otp;
    try {
        ({ phone, otp } = await request.json());
    } catch {
        return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
    }

    if (!phone || !otp) {
        return NextResponse.json({ ok: false, error: 'phone and otp are required' }, { status: 400 });
    }

    const entry = otpStore.get(phone);
    if (!entry) {
        return NextResponse.json({ ok: false, error: 'No OTP found for this number. Please request a new code.' }, { status: 400 });
    }

    if (Date.now() > entry.expiresAt) {
        otpStore.delete(phone);
        return NextResponse.json({ ok: false, error: 'OTP has expired. Please request a new code.' }, { status: 400 });
    }

    if (entry.otp !== otp) {
        return NextResponse.json({ ok: false, error: 'Invalid OTP.' }, { status: 400 });
    }

    // OTP matched — consume it
    otpStore.delete(phone);

    // Call backend to issue tokens
    try {
        const res = await fetch(`${GATEWAY_URL}/api/auth/phone-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Secret': INTERNAL_API_SECRET,
            },
            body: JSON.stringify({ phone }),
        });
        const data = await res.json();
        if (!res.ok) {
            return NextResponse.json({ ok: false, error: data.detail || 'Authentication failed' }, { status: res.status });
        }
        // Backend returns { user, tokens } — normalise to { ok, token, user }
        return NextResponse.json({
            ok: true,
            token: data.tokens?.access_token ?? data.token,
            user: data.user,
        });
    } catch {
        return NextResponse.json({ ok: false, error: 'Backend unreachable' }, { status: 502 });
    }
}
