import { NextResponse } from 'next/server';
import { otpStore } from '@/lib/phone-otp-store';

export async function POST(request) {
    let phone, name;
    try {
        ({ phone, name } = await request.json());
    } catch {
        return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
    }

    if (!phone || !name) {
        return NextResponse.json({ ok: false, error: 'phone and name are required' }, { status: 400 });
    }

    // Lazily prune expired entries
    const now = Date.now();
    for (const [key, val] of otpStore.entries()) {
        if (val.expiresAt < now) otpStore.delete(key);
    }

    try {
        const url = `https://vbspuresult.org.in/Account/SendOtp?mobile=${encodeURIComponent(phone)}&Name=${encodeURIComponent(name)}`;
        const res = await fetch(url);
        if (!res.ok) {
            return NextResponse.json({ ok: false, error: 'Failed to send OTP' }, { status: 502 });
        }
        const otpRaw = await res.text();
        // Response is a JSON string like "353653" — strip surrounding quotes
        const otp = otpRaw.replace(/^"|"$/g, '').trim();
        if (!/^\d{6}$/.test(otp)) {
            return NextResponse.json({ ok: false, error: 'Unexpected OTP format from SMS provider' }, { status: 502 });
        }

        otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false, error: 'SMS service unreachable' }, { status: 502 });
    }
}
