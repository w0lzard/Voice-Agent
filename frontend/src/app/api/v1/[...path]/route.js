/**
 * Catch-all proxy: /api/v1/* → Railway Gateway /api/v1/*
 *
 * Responsibilities:
 *  1. Forward requests to the backend (preserving the /v1 prefix)
 *  2. Normalize response format + call field names
 *  3. Transform auth responses (tokens.access_token → token)
 *  4. Compute dashboard stats / analytics from real call data
 *  5. Fetch real transcripts from call detail endpoint
 *  6. Return graceful stubs for endpoints not yet in the backend
 */
import { NextResponse } from 'next/server';

// Set GATEWAY_URL in Vercel env vars (server-side only — never exposed to browser)
const GATEWAY_URL = (
  process.env.GATEWAY_URL ||
  'http://localhost:8000'
).replace(/\/+$/, '');

// ─── Field normalisers ────────────────────────────────────────────────────────

function mapCallStatus(s) {
  const m = {
    initiated:  'queued',
    ringing:    'in-progress',
    answered:   'in-progress',
    completed:  'completed',
    failed:     'failed',
    no_answer:  'missed',
  };
  return m[s] || s || 'unknown';
}

function normalizeCall(c) {
  return {
    ...c,
    // duration_seconds (backend) → duration (frontend)
    duration: c.duration_seconds ?? c.duration ?? 0,
    // Map backend status enum values to frontend string values
    status: mapCallStatus(c.status),
    // Flatten agent name
    agent_name: c.assistant_name || c.agent_name ||
      (c.assistant_id ? `Agent ${c.assistant_id.slice(-6)}` : 'AI Agent'),
    // Flatten sentiment from analysis sub-object
    sentiment: c.analysis?.sentiment || c.sentiment || null,
  };
}

// ─── Stub responses for endpoints not in the backend ─────────────────────────
const EXACT_STUBS = {
  'GET /system/logs':          { ok: true, data: [] },
  'GET /uploads':              { ok: true, data: [] },
  'DELETE /auth/account':      { ok: true },
  'POST /auth/avatar':         { ok: true, data: {} },
  'POST /calls/upload-numbers':{ ok: true, data: { uploaded: 0 } },
};

const PATTERN_STUBS = [
  { method: 'GET',    pattern: /^\/clients/,           response: { ok: true, data: [], total: 0 } },
  { method: 'GET',    pattern: /^\/documents/,         response: { ok: true, data: [] } },
  { method: 'POST',   pattern: /^\/documents/,         response: { ok: true, data: {} } },
  { method: 'DELETE', pattern: /^\/documents\//,       response: { ok: true } },
  { method: 'GET',    pattern: /^\/knowledge-bases/,   response: { ok: true, data: [] } },
  { method: 'POST',   pattern: /^\/knowledge-bases/,   response: { ok: true, data: {} } },
  { method: 'PUT',    pattern: /^\/knowledge-bases\//,  response: { ok: true, data: {} } },
  { method: 'DELETE', pattern: /^\/knowledge-bases\//,  response: { ok: true } },
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
    return {
      ok: true,
      data: data.calls.map(normalizeCall),
      total: data.count ?? data.calls.length,
    };
  }
  if (data && Array.isArray(data.items)) {
    return { ok: true, data: data.items, total: data.total ?? data.items.length };
  }
  if (data && data.ok !== undefined) return data;
  return { ok: true, data };
}

// ─── Fetch all calls for stats computation ────────────────────────────────────
async function fetchAllCalls(authHeader, limit = 200) {
  if (!authHeader) return [];
  try {
    const res = await fetch(`${GATEWAY_URL}/api/v1/calls?limit=${limit}`, {
      headers: { Authorization: authHeader },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const raw = Array.isArray(json.calls) ? json.calls : [];
    return raw.map(normalizeCall);
  } catch {
    return [];
  }
}

// ─── Compute dashboard stats from call array ──────────────────────────────────
function computeStats(calls) {
  const now = Date.now();
  const oneWeekAgo = now - 7 * 86400000;
  const twoWeeksAgo = now - 14 * 86400000;

  const thisWeek = calls.filter(c => c.created_at && new Date(c.created_at).getTime() >= oneWeekAgo);
  const lastWeek = calls.filter(c => {
    const t = c.created_at ? new Date(c.created_at).getTime() : 0;
    return t >= twoWeeksAgo && t < oneWeekAgo;
  });

  const countBy = (arr, pred) => arr.filter(pred).length;

  const isActive    = c => ['in-progress', 'queued'].includes(c.status);
  const isCompleted = c => c.status === 'completed';
  const isFailed    = c => ['failed', 'missed'].includes(c.status);

  const durations = calls.map(c => c.duration || 0).filter(d => d > 0);
  const avgDuration = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  const pctChange = (cur, prev) =>
    prev > 0 ? Math.round(((cur - prev) / prev) * 100) : (cur > 0 ? 100 : 0);

  return {
    totalCalls:       calls.length,
    activeCalls:      countBy(calls, isActive),
    completedCalls:   countBy(calls, isCompleted),
    failedCalls:      countBy(calls, isFailed),
    avgDurationSeconds: avgDuration,
    callDurationStats: {
      under1Min:       durations.filter(d => d < 60).length,
      oneToThreeMins:  durations.filter(d => d >= 60  && d < 180).length,
      threeToFiveMins: durations.filter(d => d >= 180 && d < 300).length,
      over5Mins:       durations.filter(d => d >= 300).length,
    },
    weeklyChange: {
      totalCalls:     pctChange(thisWeek.length, lastWeek.length),
      completedCalls: pctChange(countBy(thisWeek, isCompleted), countBy(lastWeek, isCompleted)),
      failedCalls:    pctChange(countBy(thisWeek, isFailed),    countBy(lastWeek, isFailed)),
    },
  };
}

// ─── Compute call analytics from call array ───────────────────────────────────
function computeAnalytics(calls) {
  // Daily volume — last 7 calendar days
  const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dailyMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().split('T')[0];
    dailyMap[key] = { day: DAY_LABELS[d.getDay()], calls: 0 };
  }
  calls.forEach(c => {
    if (!c.created_at) return;
    const key = new Date(c.created_at).toISOString().split('T')[0];
    if (dailyMap[key]) dailyMap[key].calls++;
  });
  const dailyVolume = Object.values(dailyMap);

  // Agent performance
  const agentMap = {};
  calls.forEach(c => {
    const name = c.agent_name || 'AI Agent';
    if (!agentMap[name]) agentMap[name] = { name, total: 0, completed: 0 };
    agentMap[name].total++;
    if (c.status === 'completed') agentMap[name].completed++;
  });
  const agentPerformance = Object.values(agentMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 4)
    .map(a => ({
      name: a.name,
      completionRate: a.total > 0 ? Math.round((a.completed / a.total) * 100) : 0,
      totalCalls: a.total,
    }));

  // Sentiment breakdown
  const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0 };
  calls.forEach(c => {
    const s = (c.sentiment || 'neutral').toLowerCase();
    if (s in sentimentBreakdown) sentimentBreakdown[s]++;
    else sentimentBreakdown.neutral++;
  });

  return { dailyVolume, agentPerformance, sentimentBreakdown };
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
  const exactKey = `${method} ${path}`;
  const auth = request.headers.get('authorization');

  // ── 1. Computed: wallet ────────────────────────────────────────────────────
  if (exactKey === 'GET /wallet') {
    const emptyWallet = {
      ok: true,
      data: { currentBalance: 0, totalSpend: 0, spendChange: 0, totalCalls: 0, dailyBreakdown: [], transactions: [] },
    };
    if (!auth) return NextResponse.json(emptyWallet);
    try {
      const calls = await fetchAllCalls(auth, 100);
      const dailyMap = {};
      calls.forEach(c => {
        if (!c.created_at) return;
        const key = c.created_at.split('T')[0];
        if (!dailyMap[key]) dailyMap[key] = { date: key, calls: 0, spend: 0 };
        dailyMap[key].calls++;
      });
      const dailyBreakdown = Object.values(dailyMap)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7);
      const today     = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const todayCalls     = dailyMap[today]?.calls ?? 0;
      const yesterdayCalls = dailyMap[yesterday]?.calls ?? 0;
      const spendChange = yesterdayCalls > 0
        ? Math.round(((todayCalls - yesterdayCalls) / yesterdayCalls) * 100)
        : 0;
      const transactions = calls.slice(0, 20).map(c => ({
        id: c.call_id,
        type: 'call',
        description: `Call to ${c.lead_phone || c.phone_number || 'Unknown'}`,
        time: c.created_at,
        duration: c.duration
          ? `${Math.floor(c.duration / 60)}:${String(c.duration % 60).padStart(2, '0')}`
          : null,
        amount: 0,
        status: c.status || 'completed',
      }));
      return NextResponse.json({
        ok: true,
        data: { currentBalance: 0, totalSpend: 0, spendChange, totalCalls: calls.length, dailyBreakdown, transactions },
      });
    } catch {
      return NextResponse.json(emptyWallet);
    }
  }

  // ── 2. Computed: dashboard stats ───────────────────────────────────────────
  if (exactKey === 'GET /stats' || exactKey === 'GET /dashboard/stats') {
    if (!auth) return NextResponse.json({ ok: true, data: computeStats([]) });
    const calls = await fetchAllCalls(auth);
    return NextResponse.json({ ok: true, data: computeStats(calls) });
  }

  // ── 3. Computed: dashboard analytics (metrics) ─────────────────────────────
  if (exactKey === 'GET /metrics' || exactKey === 'GET /dashboard/analytics') {
    if (!auth) return NextResponse.json({ ok: true, data: computeAnalytics([]) });
    const calls = await fetchAllCalls(auth);
    return NextResponse.json({ ok: true, data: computeAnalytics(calls) });
  }

  // ── 4. Transcript: fetch from call detail and extract ──────────────────────
  const transcriptMatch = path.match(/^\/calls\/([^/]+)\/transcript$/);
  if (transcriptMatch && method === 'GET') {
    const callId = transcriptMatch[1];
    if (!auth) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    try {
      const callRes = await fetch(`${GATEWAY_URL}/api/v1/calls/${callId}`, {
        headers: { Authorization: auth },
      });
      if (!callRes.ok) {
        if (callRes.status === 404) return NextResponse.json({ ok: true, data: null });
        return NextResponse.json({ ok: false, error: 'Call not found' }, { status: callRes.status });
      }
      const callData = await callRes.json();
      // Backend stores transcript as List[Dict] on the call record
      const transcript = Array.isArray(callData.transcript) ? callData.transcript : [];
      return NextResponse.json({ ok: true, data: { callId, transcript } });
    } catch {
      return NextResponse.json({ ok: true, data: null });
    }
  }

  // ── 5. Exact stubs ─────────────────────────────────────────────────────────
  if (EXACT_STUBS[exactKey]) return NextResponse.json(EXACT_STUBS[exactKey]);

  // ── 6. Pattern stubs ───────────────────────────────────────────────────────
  for (const s of PATTERN_STUBS) {
    if (s.method === method && s.pattern.test(path)) {
      return NextResponse.json(s.response);
    }
  }

  // ── 7. Forward to backend gateway ─────────────────────────────────────────
  const { backendPath, transformBody, skipApiPrefix } = mapRequest(path, method);
  const searchParams = new URL(request.url).searchParams.toString();
  const backendUrl = `${GATEWAY_URL}${skipApiPrefix ? '' : '/api/v1'}${backendPath}${searchParams ? '?' + searchParams : ''}`;

  // Short-circuit authenticated-only list endpoints when there is no token
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
      { ok: false, error: 'Gateway unreachable. Check backend deployment.' },
      { status: 502 }
    );
  }
}

export const GET    = (req, ctx) => handleRequest(req, ctx, 'GET');
export const POST   = (req, ctx) => handleRequest(req, ctx, 'POST');
export const PUT    = (req, ctx) => handleRequest(req, ctx, 'PUT');
export const DELETE = (req, ctx) => handleRequest(req, ctx, 'DELETE');
export const PATCH  = (req, ctx) => handleRequest(req, ctx, 'PATCH');
