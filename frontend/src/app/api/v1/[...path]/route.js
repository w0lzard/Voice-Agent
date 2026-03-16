/**
 * Catch-all proxy: /api/v1/* → Railway Gateway /api/*
 *
 * Responsibilities:
 *  1. Strip the /v1 prefix before forwarding to the backend
 *  2. Normalize response format to { ok, data, ... } that the frontend expects
 *  3. Transform auth responses (tokens.access_token → token)
 *  4. Transform /calls/start body shape
 *  5. Return graceful stubs for endpoints not yet in the backend
 */
import { NextResponse } from 'next/server';

// Set GATEWAY_URL on Vercel (server-side only — never exposed to browser)
const GATEWAY_URL = (
  process.env.GATEWAY_URL ||
  'http://localhost:8000'
).replace(/\/+$/, '');

// ─── Stub responses for unimplemented backend endpoints ──────────────────────
const EXACT_STUBS = {
  'GET /wallet': {
    ok: true,
    data: { balance: 0, currency: 'USD', transactions: [], daily_spend: [] },
  },
  'GET /metrics': {
    ok: true,
    data: { total_calls: 0, active_calls: 0, success_rate: 0, total_minutes: 0, lead_conversion: 0 },
  },
  'GET /stats': { ok: true, data: {} },
  'GET /system/logs': { ok: true, data: [] },
  'GET /uploads': { ok: true, data: [] },
  'DELETE /auth/account': { ok: true },
  'POST /auth/avatar': { ok: true, data: {} },
  'POST /calls/upload-numbers': { ok: true, data: { uploaded: 0 } },
};

// ─── Pattern stubs (checked when no exact stub matches) ──────────────────────
const PATTERN_STUBS = [
  { method: 'GET',    pattern: /^\/clients/,                  response: { ok: true, data: [], total: 0 } },
  { method: 'GET',    pattern: /^\/documents/,                response: { ok: true, data: [] } },
  { method: 'POST',   pattern: /^\/documents/,                response: { ok: true, data: {} } },
  { method: 'DELETE', pattern: /^\/documents\//,              response: { ok: true } },
  { method: 'GET',    pattern: /^\/knowledge-bases/,          response: { ok: true, data: [] } },
  { method: 'POST',   pattern: /^\/knowledge-bases/,          response: { ok: true, data: {} } },
  { method: 'PUT',    pattern: /^\/knowledge-bases\//,        response: { ok: true, data: {} } },
  { method: 'DELETE', pattern: /^\/knowledge-bases\//,        response: { ok: true } },
  { method: 'GET',    pattern: /^\/calls\/[^/]+\/transcript$/, response: { ok: true, data: null } },
  { method: 'GET',    pattern: /^\/calls\/[^/]+\/recordings$/, response: { ok: true, data: [] } },
  { method: 'PUT',    pattern: /^\/auth\/(profile|password)$/, response: { ok: true } },
  // NOTE: /auth/resend-code is NOT stubbed — it must reach the backend to send the OTP
];

// ─── Response normalisation ───────────────────────────────────────────────────
function normalise(path, data) {
  if ((path === '/auth/login' || path === '/auth/signup' || path === '/auth/verify') && data?.tokens) {
    return { ok: true, token: data.tokens.access_token, user: data.user };
  }
  if (path === '/auth/me' && data?.user_id) {
    return { ok: true, user: data };
  }
  // Backend returns { calls: [...], count: N }
  if (data && Array.isArray(data.calls)) {
    return { ok: true, data: data.calls, total: data.count ?? data.calls.length };
  }
  if (data && Array.isArray(data.items)) {
    return { ok: true, data: data.items, total: data.total ?? data.items.length };
  }
  if (data && data.ok !== undefined) return data;
  return { ok: true, data };
}

// ─── Path & body mapping ──────────────────────────────────────────────────────
function mapRequest(path, method) {
  if (path === '/health' || path === '/ready') {
    return { backendPath: path, transformBody: false, skipApiPrefix: true };
  }
  if (path === '/calls/start' && method === 'POST') {
    return { backendPath: '/calls', transformBody: true };
  }
  return { backendPath: path, transformBody: false };
}

// ─── Main handler ─────────────────────────────────────────────────────────────
async function handleRequest(request, { params }, method) {
  const pathParts = (await params).path ?? [];
  const path = '/' + pathParts.join('/');

  // 1. Exact stub
  const exactKey = `${method} ${path}`;
  if (EXACT_STUBS[exactKey]) return NextResponse.json(EXACT_STUBS[exactKey]);

  // 2. Pattern stub
  for (const s of PATTERN_STUBS) {
    if (s.method === method && s.pattern.test(path)) {
      return NextResponse.json(s.response);
    }
  }

  // 3. Forward to Railway Gateway
  const { backendPath, transformBody, skipApiPrefix } = mapRequest(path, method);
  const searchParams = new URL(request.url).searchParams.toString();
  const backendUrl = `${GATEWAY_URL}${skipApiPrefix ? '' : '/api'}${backendPath}${searchParams ? '?' + searchParams : ''}`;

  const auth = request.headers.get('authorization');

  // Short-circuit authenticated-only list endpoints when there is no token —
  // avoids flooding the backend with 401s from unauthenticated pollers.
  if (!auth && /^\/(calls|assistants|campaigns)(\/|$)/.test(path) && method === 'GET') {
    return NextResponse.json({ ok: true, data: [], total: 0, count: 0 });
  }

  const headers = {};
  if (auth) headers['Authorization'] = auth;

  const fetchOptions = { method, headers };

  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('multipart/form-data')) {
      fetchOptions.body = await request.formData();
    } else if (ct.includes('text/csv')) {
      headers['Content-Type'] = 'text/csv';
      fetchOptions.body = await request.text();
    } else {
      headers['Content-Type'] = 'application/json';
      let body = {};
      try { body = await request.json(); } catch { /* empty body */ }
      if (transformBody) {
        body = {
          phone_number: body.phoneNumber ?? body.phone_number,
          language: body.language,
          campaign_id: body.campaignId ?? body.campaign_id,
        };
      }
      fetchOptions.body = JSON.stringify(body);
    }
  }

  try {
    const res = await fetch(backendUrl, fetchOptions);
    let data = {};
    try { data = await res.json(); } catch { /* non-JSON body */ }

    if (!res.ok) {
      // Pass needsVerification through (e.g. unverified email on login)
      const detail = data.detail ?? data.error ?? 'Request failed';
      if (detail && typeof detail === 'object' && detail.needsVerification) {
        return NextResponse.json(
          { ok: false, needsVerification: true, email: detail.email },
          { status: res.status }
        );
      }
      return NextResponse.json(
        { ok: false, error: typeof detail === 'string' ? detail : 'Request failed' },
        { status: res.status }
      );
    }

    return NextResponse.json(normalise(path, data));
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Gateway unreachable. Check Railway deployment.' },
      { status: 502 }
    );
  }
}

export const GET    = (req, ctx) => handleRequest(req, ctx, 'GET');
export const POST   = (req, ctx) => handleRequest(req, ctx, 'POST');
export const PUT    = (req, ctx) => handleRequest(req, ctx, 'PUT');
export const DELETE = (req, ctx) => handleRequest(req, ctx, 'DELETE');
export const PATCH  = (req, ctx) => handleRequest(req, ctx, 'PATCH');
