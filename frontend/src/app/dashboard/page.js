'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { getDashboardStats, getCallAnalytics } from '@/lib/api/dashboard';
import { fetchCalls, fetchWallet } from '@/lib/api';

// ─── Skeleton ────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 border border-white/8 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="size-10 rounded-xl bg-white/5" />
        <div className="h-5 w-14 rounded-full bg-white/5" />
      </div>
      <div className="h-2 w-20 rounded bg-white/5 mb-2" />
      <div className="h-7 w-24 rounded bg-white/5" />
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, change, changeType = 'neutral', accent = false, iconColor = 'text-primary', dot }) {
  return (
    <div
      className={`rounded-2xl p-5 border ${accent ? 'border-primary/30' : 'border-white/8'}`}
      style={accent
        ? { background: '#2b6cee', boxShadow: '0 4px 20px rgba(43,108,238,0.3)' }
        : { background: 'rgba(255,255,255,0.03)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`size-10 rounded-xl flex items-center justify-center relative ${accent ? 'bg-white/20' : 'bg-white/5'}`}>
          <span className={`material-symbols-outlined text-xl ${accent ? 'text-white' : iconColor}`}>{icon}</span>
          {dot && (
            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-background-dark" />
          )}
        </div>
        {change !== undefined && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            changeType === 'up' ? 'bg-emerald-500/15 text-emerald-400' :
            changeType === 'down' ? 'bg-rose-500/15 text-rose-400' :
            'bg-slate-500/15 text-slate-400'
          }`}>
            {changeType === 'up' ? '↑' : changeType === 'down' ? '↓' : ''} {change}
          </span>
        )}
      </div>
      <p className={`text-[11px] font-bold uppercase tracking-widest mb-1 ${accent ? 'text-white/70' : 'text-slate-500'}`}>{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-white' : 'text-slate-100'}`}>{value}</p>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    completed: 'bg-emerald-500/10 text-emerald-400',
    active: 'bg-primary/10 text-primary',
    failed: 'bg-rose-500/10 text-rose-400',
    missed: 'bg-rose-500/10 text-rose-400',
    'in-progress': 'bg-primary/10 text-primary',
    queued: 'bg-amber-500/10 text-amber-400',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${map[status?.toLowerCase()] || 'bg-slate-500/10 text-slate-400'}`}>
      {status || 'Unknown'}
    </span>
  );
}

// ─── Sentiment Icon ───────────────────────────────────────────────────────────
function SentimentIcon({ sentiment }) {
  if (!sentiment || sentiment === 'positive') return <span className="material-symbols-outlined text-emerald-400 text-base fill-1">sentiment_satisfied</span>;
  if (sentiment === 'negative') return <span className="material-symbols-outlined text-rose-400 text-base fill-1">sentiment_dissatisfied</span>;
  return <span className="material-symbols-outlined text-amber-400 text-base fill-1">sentiment_neutral</span>;
}

// ─── Duration Distribution Bar ───────────────────────────────────────────────
function DurationBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-bold text-slate-300">{count.toLocaleString()} <span className="text-slate-600 font-normal">({pct}%)</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5">
        <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recentCalls, setRecentCalls] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, analyticsRes, callsRes, walletRes] = await Promise.all([
        getDashboardStats(),
        getCallAnalytics(),
        fetchCalls({ limit: 8 }),
        fetchWallet().catch(() => ({ ok: false })),
      ]);

      if (statsRes?.ok) setStats(statsRes.data);
      if (analyticsRes?.ok) setAnalytics(analyticsRes.data);
      if (callsRes?.data) setRecentCalls(callsRes.data);
      if (walletRes?.ok) setBalance(walletRes.data?.currentBalance ?? null);
      setError('');
    } catch (err) {
      if (err?.status === 401) {
        clearInterval(intervalRef.current);
        return;
      }
      setError('Failed to load dashboard data. Retrying...');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, 30000);
    return () => clearInterval(intervalRef.current);
  }, [loadData]);

  const s = stats;
  const a = analytics;
  const durationTotal = s ? Object.values(s.callDurationStats).reduce((x, v) => x + v, 0) : 0;
  const maxDayCount = a ? Math.max(...a.dailyVolume.map(d => d.calls), 1) : 1;

  const changeLabel = (n) => n !== undefined ? `${Math.abs(n)}%` : undefined;
  const changeType = (n) => n === undefined ? 'neutral' : n >= 0 ? 'up' : 'down';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Monitor your AI calling performance in real time</p>
        </div>
        <Link
          href="/voice"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary rounded-xl text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
          style={{ boxShadow: '0 4px 14px rgba(43,108,238,0.3)' }}
        >
          <span className="material-symbols-outlined text-base">add</span>
          New Agent
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          <span className="material-symbols-outlined text-base">error</span>
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard icon="call" label="Total Calls" value={s?.totalCalls?.toLocaleString() ?? '—'}
              change={changeLabel(s?.weeklyChange?.totalCalls)} changeType={changeType(s?.weeklyChange?.totalCalls)} iconColor="text-primary" />
            <StatCard icon="wifi_calling" label="Active Calls" value={s?.activeCalls ?? '—'} iconColor="text-emerald-400" dot={s?.activeCalls > 0} />
            <StatCard icon="check_circle" label="Completed" value={s?.completedCalls?.toLocaleString() ?? '—'}
              change={changeLabel(s?.weeklyChange?.completedCalls)} changeType={changeType(s?.weeklyChange?.completedCalls)} iconColor="text-emerald-400" />
            <StatCard icon="cancel" label="Failed" value={s?.failedCalls?.toLocaleString() ?? '—'}
              change={changeLabel(s?.weeklyChange?.failedCalls)} changeType={changeType(-(s?.weeklyChange?.failedCalls ?? 0))} iconColor="text-rose-400" />
            <StatCard icon="timer" label="Avg Duration"
              value={s ? (s.avgDurationSeconds >= 60 ? `${Math.floor(s.avgDurationSeconds / 60)}m ${s.avgDurationSeconds % 60}s` : `${s.avgDurationSeconds}s`) : '—'}
              iconColor="text-amber-400" />
            <StatCard icon="account_balance_wallet" label="Balance"
              value={balance !== null ? `$${balance.toFixed(2)}` : '—'} accent />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Volume Bar Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-white/8 p-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Calls This Week</h3>
              <p className="text-xs text-slate-500 mt-0.5">Daily call volume</p>
            </div>
            {a && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {a.dailyVolume.reduce((x, d) => x + d.calls, 0).toLocaleString()} total
              </span>
            )}
          </div>
          {loading ? (
            <div className="h-40 animate-pulse rounded-xl bg-white/3" />
          ) : (
            <div className="flex items-end gap-3 h-40">
              {a?.dailyVolume.map((day, i) => {
                const heightPct = Math.max((day.calls / maxDayCount) * 100, day.calls > 0 ? 8 : 3);
                const isToday = i === a.dailyVolume.length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t-lg transition-colors relative ${isToday ? 'bg-primary' : 'bg-primary/20 hover:bg-primary/40'}`}
                      style={{ height: `${heightPct}%` }}
                      title={`${day.calls} calls`}
                    >
                      {!isToday && <div className="absolute inset-x-0 top-0 h-1 rounded-t-lg bg-primary/60" />}
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase">{day.day}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Agent Performance */}
        <div className="rounded-2xl border border-white/8 p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <h3 className="text-sm font-bold text-slate-200">Agent Performance</h3>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-1.5">
                  <div className="flex justify-between">
                    <div className="h-3 w-28 rounded bg-white/5" />
                    <div className="h-3 w-8 rounded bg-white/5" />
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5" />
                </div>
              ))}
            </div>
          ) : (
            ['bg-emerald-500', 'bg-primary', 'bg-amber-500', 'bg-slate-500'].map((color, idx) => {
              const agent = a?.agentPerformance[idx];
              if (!agent) return null;
              return (
                <div key={agent.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-300 truncate">{agent.name}</span>
                    <span className="text-xs font-bold text-slate-400 ml-2">{agent.completionRate}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5">
                    <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${agent.completionRate}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Duration Stats + Sentiment Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Duration Distribution */}
        <div className="rounded-2xl border border-white/8 p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div>
            <h3 className="text-sm font-bold text-slate-200">Call Duration Stats</h3>
            <p className="text-xs text-slate-500 mt-0.5">Distribution by call length</p>
          </div>
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <div className="h-3 w-24 rounded bg-white/5" />
                    <div className="h-3 w-16 rounded bg-white/5" />
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5" />
                </div>
              ))}
            </div>
          ) : s ? (
            <div className="space-y-4">
              <DurationBar label="Under 1 min" count={s.callDurationStats.under1Min} total={durationTotal} color="bg-slate-500" />
              <DurationBar label="1 – 3 mins" count={s.callDurationStats.oneToThreeMins} total={durationTotal} color="bg-amber-500" />
              <DurationBar label="3 – 5 mins" count={s.callDurationStats.threeToFiveMins} total={durationTotal} color="bg-primary" />
              <DurationBar label="Over 5 mins" count={s.callDurationStats.over5Mins} total={durationTotal} color="bg-emerald-500" />
            </div>
          ) : null}
        </div>

        {/* Sentiment Breakdown */}
        <div className="rounded-2xl border border-white/8 p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div>
            <h3 className="text-sm font-bold text-slate-200">Sentiment Breakdown</h3>
            <p className="text-xs text-slate-500 mt-0.5">Overall caller sentiment</p>
          </div>
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <div className="h-3 w-20 rounded bg-white/5" />
                    <div className="h-3 w-12 rounded bg-white/5" />
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5" />
                </div>
              ))}
            </div>
          ) : a ? (() => {
            const total = a.sentimentBreakdown.positive + a.sentimentBreakdown.neutral + a.sentimentBreakdown.negative;
            return (
              <div className="space-y-4">
                <DurationBar label="Positive" count={a.sentimentBreakdown.positive} total={total} color="bg-emerald-500" />
                <DurationBar label="Neutral" count={a.sentimentBreakdown.neutral} total={total} color="bg-amber-500" />
                <DurationBar label="Negative" count={a.sentimentBreakdown.negative} total={total} color="bg-rose-500" />
                <div className="grid grid-cols-3 gap-3 pt-1">
                  {[
                    { label: 'Positive', icon: 'sentiment_satisfied', color: 'text-emerald-400', count: a.sentimentBreakdown.positive },
                    { label: 'Neutral', icon: 'sentiment_neutral', color: 'text-amber-400', count: a.sentimentBreakdown.neutral },
                    { label: 'Negative', icon: 'sentiment_dissatisfied', color: 'text-rose-400', count: a.sentimentBreakdown.negative },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl bg-white/3 border border-white/5 p-3 text-center">
                      <span className={`material-symbols-outlined fill-1 text-xl ${item.color}`}>{item.icon}</span>
                      <p className="text-sm font-bold text-slate-200 mt-1">{item.count.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-600 uppercase tracking-wider">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })() : null}
        </div>
      </div>

      {/* Recent Calls Table */}
      <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="text-sm font-bold text-slate-200">Live Activity</h3>
          <Link href="/calls" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="divide-y divide-white/5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3 animate-pulse">
                <div className="size-7 rounded-full bg-white/5" />
                <div className="h-3 w-28 rounded bg-white/5" />
                <div className="h-3 w-20 rounded bg-white/5 ml-auto" />
                <div className="h-5 w-16 rounded-full bg-white/5" />
              </div>
            ))}
          </div>
        ) : recentCalls.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">No calls yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Contact', 'Agent', 'Status', 'Duration', 'Sentiment'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentCalls.slice(0, 8).map((call, i) => (
                  <tr key={call.call_id || i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                          {(call.lead_phone || call.phone_number || '?').charAt(0)}
                        </div>
                        <span className="text-xs text-slate-300 font-mono">{call.lead_phone || call.phone_number || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">{call.agent_name || call.assistant_name || '—'}</td>
                    <td className="px-5 py-3"><StatusBadge status={call.status} /></td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {call.duration ? `${Math.floor(call.duration / 60)}:${String(call.duration % 60).padStart(2, '0')}` : '—'}
                    </td>
                    <td className="px-5 py-3"><SentimentIcon sentiment={call.sentiment} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
