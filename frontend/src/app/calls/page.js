'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchCalls } from '@/lib/api';
import { MOCK_CALLS } from '@/lib/mockCalls';
import TranscriptModal from '@/components/TranscriptModal';

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    completed:     'bg-emerald-500/10 text-emerald-400',
    active:        'bg-primary/10 text-primary',
    failed:        'bg-rose-500/10 text-rose-400',
    missed:        'bg-rose-500/10 text-rose-400',
    'in-progress': 'bg-primary/10 text-primary',
    queued:        'bg-amber-500/10 text-amber-400',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${map[status?.toLowerCase()] || 'bg-slate-700/50 text-slate-400'}`}>
      {status || 'Unknown'}
    </span>
  );
}

// ─── Sentiment Badge ──────────────────────────────────────────────────────────
function SentimentBadge({ sentiment }) {
  if (!sentiment) return <span className="text-slate-600 text-xs">—</span>;
  const map = {
    positive: { icon: 'sentiment_satisfied',    cls: 'text-emerald-400' },
    negative: { icon: 'sentiment_dissatisfied', cls: 'text-rose-400' },
    neutral:  { icon: 'sentiment_neutral',      cls: 'text-amber-400' },
  };
  const s = map[sentiment.toLowerCase()] || { icon: 'sentiment_neutral', cls: 'text-slate-400' };
  return <span className={`material-symbols-outlined fill-1 text-base ${s.cls}`}>{s.icon}</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CallHistoryPage() {
  const [calls, setCalls]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [isMockMode, setIsMockMode] = useState(false);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCall, setSelectedCall] = useState(null);
  const intervalRef = useRef(null);

  const loadCalls = useCallback(async () => {
    try {
      const res = await fetchCalls({ limit: 100 });
      if (res?.data && res.data.length > 0) {
        setCalls(res.data);
        setIsMockMode(false);
        setError('');
      } else {
        // Backend reachable but returned no data — show mock
        setCalls(MOCK_CALLS);
        setIsMockMode(true);
      }
    } catch (err) {
      if (err?.status === 401) {
        clearInterval(intervalRef.current);
        return;
      }
      // Backend offline — fall back to mock data silently
      setCalls(MOCK_CALLS);
      setIsMockMode(true);
      setError('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalls();
    intervalRef.current = setInterval(loadCalls, 30000);
    return () => clearInterval(intervalRef.current);
  }, [loadCalls]);

  const filtered = calls.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (c.lead_phone || c.phone_number || '').toLowerCase().includes(q) ||
      (c.agent_name || c.assistant_name || '').toLowerCase().includes(q);
    const matchStatus = !statusFilter || c.status?.toLowerCase() === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <>
      <div className="p-6 space-y-6">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Call History</h1>
            <p className="text-sm text-slate-500 mt-0.5">Full log of all AI-powered calls</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/8 text-slate-300 text-sm font-medium hover:bg-white/5 transition-all">
            <span className="material-symbols-outlined text-base">download</span>
            Export CSV
          </button>
        </div>

        {/* ── Filter bar ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/8 p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="relative flex-1 min-w-48">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-base">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by number or agent..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-white/5 border border-white/8 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/8 text-slate-300 focus:outline-none focus:border-primary/40 transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="missed">Missed</option>
            <option value="active">Active</option>
            <option value="in-progress">In Progress</option>
            <option value="queued">Queued</option>
          </select>

          {/* Demo mode pill */}
          {isMockMode && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              <span className="size-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
              Demo data
            </span>
          )}

          <span className="text-xs text-slate-600 font-medium ml-auto">{filtered.length} records</span>
        </div>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            <span className="material-symbols-outlined text-base">error</span>{error}
          </div>
        )}

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
          {loading ? (
            <div className="p-10 text-center">
              <div className="inline-flex items-center gap-2 text-slate-500 text-sm">
                <span className="material-symbols-outlined animate-spin text-primary">refresh</span>
                Loading calls…
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <span className="material-symbols-outlined text-4xl text-slate-700">call_end</span>
              <p className="text-slate-500 text-sm">No calls found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Date/Time', 'Contact', 'AI Agent', 'Duration', 'Sentiment', 'Status', 'Transcript'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((call, i) => {
                    const phone    = call.lead_phone || call.phone_number || '—';
                    const initials = phone.replace(/\D/g, '').slice(-2) || '??';
                    const agent    = call.agent_name || call.assistant_name || '—';
                    const dur      = call.duration;
                    const durStr   = dur ? `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}` : '—';
                    const createdAt = call.created_at
                      ? new Date(call.created_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : '—';

                    // Transcript button is only shown for completed calls;
                    // failed/missed show a dimmed "—" placeholder.
                    const hasTranscript = ['completed', 'active', 'in-progress'].includes(
                      call.status?.toLowerCase()
                    );

                    return (
                      <tr
                        key={call.call_id || i}
                        className="border-b border-white/5 hover:bg-white/2 transition-colors"
                      >
                        <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">{createdAt}</td>

                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="size-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                              {initials}
                            </div>
                            <span className="text-xs text-slate-300 font-mono">{phone}</span>
                          </div>
                        </td>

                        <td className="px-5 py-3 text-xs text-slate-400">{agent}</td>
                        <td className="px-5 py-3 text-xs text-slate-400">{durStr}</td>
                        <td className="px-5 py-3"><SentimentBadge sentiment={call.sentiment} /></td>
                        <td className="px-5 py-3"><StatusBadge status={call.status} /></td>

                        {/* Transcript column */}
                        <td className="px-5 py-3">
                          {hasTranscript ? (
                            <button
                              onClick={() => setSelectedCall(call)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-xs font-medium text-slate-300 hover:bg-primary/10 hover:border-primary/20 hover:text-primary transition-all"
                            >
                              <span className="material-symbols-outlined text-[13px]">chat_bubble_outline</span>
                              View
                            </button>
                          ) : (
                            <span className="text-slate-700 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Transcript Modal ─────────────────────────────────────────────── */}
      {selectedCall && (
        <TranscriptModal
          call={selectedCall}
          onClose={() => setSelectedCall(null)}
        />
      )}
    </>
  );
}
