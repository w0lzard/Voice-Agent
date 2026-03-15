'use client';
import { useState } from 'react';
import { API_BASE, getAuthHeaders } from '../../lib/api';

const tests = [
  {
    id: 'proxy',
    label: 'Next.js Proxy',
    description: 'GET /api/v1/health → Vercel proxy',
    run: async () => {
      const res = await fetch(`${API_BASE}/v1/health`, { headers: getAuthHeaders() });
      const data = await res.json();
      return { status: res.status, data };
    },
  },
  {
    id: 'gateway',
    label: 'Railway Gateway',
    description: 'GET /api/v1/health → thorough-vibrancy.railway.app/health',
    run: async () => {
      const res = await fetch(`${API_BASE}/v1/health`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data?.status === 'healthy') return { status: res.status, data };
      throw new Error(JSON.stringify(data));
    },
  },
  {
    id: 'auth',
    label: 'Auth Token',
    description: 'Checks if JWT token exists in localStorage',
    run: async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('ea_token') : null;
      if (!token) throw new Error('No token in localStorage (ea_token). Not logged in.');
      return { status: 200, data: { token_exists: true, token_prefix: token.substring(0, 20) + '...' } };
    },
  },
  {
    id: 'auth_me',
    label: 'Authenticated Request',
    description: 'GET /api/v1/auth/me → Gateway /api/auth/me',
    run: async () => {
      const res = await fetch(`${API_BASE}/v1/auth/me`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(data)}`);
      return { status: res.status, data };
    },
  },
  {
    id: 'calls_list',
    label: 'Calls List',
    description: 'GET /api/v1/calls → Gateway /api/calls',
    run: async () => {
      const res = await fetch(`${API_BASE}/v1/calls`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(data)}`);
      return { status: res.status, data };
    },
  },
  {
    id: 'api_base',
    label: 'API_BASE Value',
    description: 'Shows what URL the frontend is using for API calls',
    run: async () => {
      return { status: 200, data: { API_BASE, note: 'Should be /api in production' } };
    },
  },
];

export default function ConnectTestPage() {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);

  const runAll = async () => {
    setRunning(true);
    setResults({});
    for (const test of tests) {
      setResults(prev => ({ ...prev, [test.id]: { status: 'running' } }));
      try {
        const result = await test.run();
        setResults(prev => ({ ...prev, [test.id]: { status: 'pass', ...result } }));
      } catch (err) {
        setResults(prev => ({ ...prev, [test.id]: { status: 'fail', error: err.message } }));
      }
    }
    setRunning(false);
  };

  const getColor = (status) => {
    if (status === 'pass') return '#22c55e';
    if (status === 'fail') return '#ef4444';
    if (status === 'running') return '#f59e0b';
    return '#6b7280';
  };

  const getIcon = (status) => {
    if (status === 'pass') return '✅';
    if (status === 'fail') return '❌';
    if (status === 'running') return '⏳';
    return '⚪';
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', background: '#0f172a', minHeight: '100vh', color: '#e2e8f0' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔌 Connection Diagnostics</h1>
      <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
        Tests connectivity: Browser → Vercel Proxy → Railway Gateway
      </p>

      <button
        onClick={runAll}
        disabled={running}
        style={{
          background: running ? '#374151' : '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          cursor: running ? 'not-allowed' : 'pointer',
          fontSize: '1rem',
          marginBottom: '2rem',
        }}
      >
        {running ? '⏳ Running tests...' : '▶ Run All Tests'}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {tests.map(test => {
          const result = results[test.id];
          return (
            <div key={test.id} style={{
              background: '#1e293b',
              border: `1px solid ${result ? getColor(result.status) : '#334155'}`,
              borderRadius: '0.5rem',
              padding: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '1.25rem' }}>{result ? getIcon(result.status) : '⚪'}</span>
                <strong style={{ fontSize: '1rem', color: result ? getColor(result.status) : '#e2e8f0' }}>
                  {test.label}
                </strong>
                {result?.status === 'pass' && (
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>HTTP {result.status}</span>
                )}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginLeft: '2rem' }}>{test.description}</div>
              {result?.error && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  background: '#450a0a',
                  borderRadius: '0.25rem',
                  color: '#fca5a5',
                  fontSize: '0.8rem',
                  marginLeft: '2rem',
                }}>
                  {result.error}
                </div>
              )}
              {result?.data && result.status === 'pass' && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  background: '#052e16',
                  borderRadius: '0.25rem',
                  color: '#86efac',
                  fontSize: '0.8rem',
                  marginLeft: '2rem',
                }}>
                  {JSON.stringify(result.data, null, 2)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ marginTop: '2rem', color: '#475569', fontSize: '0.8rem' }}>
        Visit: <strong>/connect-test</strong> on your Vercel deployment
      </p>
    </div>
  );
}
