'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { fetchCalls, fetchWallet } from '@/lib/api';

function StatCard({ icon, label, value, change, changeType = 'neutral', accent = false, iconColor = 'text-primary' }) {
  return (
    <div className={`rounded-2xl p-5 border ${accent ? 'border-primary/30' : 'border-white/8'}`} style={accent ? {background: '#2b6cee', boxShadow: '0 4px 20px rgba(43,108,238,0.3)'} : {background: 'rgba(255,255,255,0.03)'}}>
      <div className="flex items-start justify-between mb-3">
        <div className={`size-10 rounded-xl flex items-center justify-center ${accent ? 'bg-white/20' : 'bg-white/5'}`}>
          <span className={`material-symbols-outlined text-xl ${accent ? 'text-white' : iconColor}`}>{icon}</span>
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

function SentimentIcon({ sentiment }) {
  if (!sentiment || sentiment === 'positive') return <span className="material-symbols-outlined text-emerald-400 text-base fill-1">sentiment_satisfied</span>;
  if (sentiment === 'negative') return <span className="material-symbols-outlined text-rose-400 text-base fill-1">sentiment_dissatisfied</span>;
  return <span className="material-symbols-outlined text-amber-400 text-base fill-1">sentiment_neutral</span>;
}

function StatusBadge({ status }) {
  const map = {
    completed: 'bg-emerald-500/10 text-emerald-400',
    active: 'bg-primary/10 text-primary',
    failed: 'bg-rose-500/10 text-rose-400',
    missed: 'bg-rose-500/10 text-rose-400',
    'in-progress': 'bg-primary/10 text-primary',
    queued: 'bg-amber-500/10 text-amber-400',
  };
  const cls = map[status?.toLowerCase()] || 'bg-slate-500/10 text-slate-400';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {status || 'Unknown'}
    </span>
  );
}

export default function DashboardPage() {
  const [calls, setCalls] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [callsRes, walletRes] = await Promise.all([
        fetchCalls({ limit: 10 }),
        fetchWallet().catch(() => ({ ok: false })),
      ]);
      if (callsRes?.calls) setCalls(callsRes.calls);
      if (walletRes?.ok) setBalance(walletRes.data?.currentBalance ?? null);
    } catch (err) {
      if (err.status === 401) {
        clearInterval(intervalRef.current);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, 30000);
    return () => clearInterval(intervalRef.current);
  }, [loadData]);

  const totalCalls = calls.length;
  const completedCalls = calls.filter(c => c.status?.toLowerCase() === 'completed').length;
  const avgDuration = calls.length
    ? Math.round(calls.reduce((sum, c) => sum + (c.duration || 0), 0) / calls.length)
    : 0;
  const avgDurationStr = avgDuration >= 60
    ? `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s`
    : `${avgDuration}s`;

  // Mock bar chart data
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const barHeights = [60, 40, 85, 70, 55, 30, 75];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Monitor your AI calling performance</p>
        </div>
        <Link href="/voice" className="flex items-center gap-2 px-4 py-2.5 bg-primary rounded-xl text-white text-sm font-semibold hover:bg-primary/90 transition-colors" style={{boxShadow: '0 4px 14px rgba(43,108,238,0.3)'}}>
          <span className="material-symbols-outlined text-base">add</span>
          New Agent
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon="call" label="Total Calls" value={totalCalls} change="12%" changeType="up" iconColor="text-primary" />
        <StatCard icon="check_circle" label="Completed" value={completedCalls} change="8%" changeType="up" iconColor="text-emerald-400" />
        <StatCard icon="trending_up" label="Conv. Rate" value={totalCalls ? `${Math.round((completedCalls/totalCalls)*100)}%` : '0%'} change="5%" changeType="up" iconColor="text-purple-400" />
        <StatCard icon="timer" label="Avg Duration" value={avgDurationStr} iconColor="text-amber-400" />
        <StatCard icon="account_balance_wallet" label="Balance" value={balance !== null ? `$${balance.toFixed(2)}` : '—'} accent={true} />
      </div>

      {/* Charts + Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calls bar chart */}
        <div className="lg:col-span-2 rounded-2xl border border-white/8 p-5" style={{background: 'rgba(255,255,255,0.03)'}}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Calls This Week</h3>
              <p className="text-xs text-slate-500 mt-0.5">Daily call volume</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">↑ 12% vs last week</span>
          </div>
          <div className="flex items-end gap-3 h-40">
            {days.map((day, i) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-lg bg-primary/20 hover:bg-primary/40 transition-colors relative" style={{height: `${barHeights[i]}%`}}>
                  <div className="absolute inset-x-0 top-0 h-1 rounded-t-lg bg-primary"></div>
                </div>
                <span className="text-[10px] font-bold text-slate-600 uppercase">{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick stats */}
        <div className="rounded-2xl border border-white/8 p-5 space-y-4" style={{background: 'rgba(255,255,255,0.03)'}}>
          <h3 className="text-sm font-bold text-slate-200">Agent Performance</h3>
          {[
            { name: 'Support Agent Alpha', pct: 94, color: 'bg-emerald-500' },
            { name: 'Sales Bot Pro', pct: 82, color: 'bg-primary' },
            { name: 'Lead Gen AI', pct: 67, color: 'bg-amber-500' },
            { name: 'Follow-up Agent', pct: 45, color: 'bg-slate-500' },
          ].map(agent => (
            <div key={agent.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-300 truncate">{agent.name}</span>
                <span className="text-xs font-bold text-slate-400 ml-2">{agent.pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5">
                <div className={`h-1.5 rounded-full ${agent.color} transition-all`} style={{width: `${agent.pct}%`}}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Calls Table */}
      <div className="rounded-2xl border border-white/8 overflow-hidden" style={{background: 'rgba(255,255,255,0.03)'}}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="text-sm font-bold text-slate-200">Live Activity</h3>
          <Link href="/" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <div className="inline-flex items-center gap-2 text-slate-500 text-sm">
              <span className="material-symbols-outlined animate-spin text-primary">refresh</span>
              Loading calls...
            </div>
          </div>
        ) : calls.length === 0 ? (
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
                {calls.slice(0, 8).map((call, i) => (
                  <tr key={call.call_id || i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                          {(call.lead_phone || call.phone_number || '?').charAt(0)}
                        </div>
                        <span className="text-sm text-slate-300 font-mono text-xs">{call.lead_phone || call.phone_number || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">{call.agent_name || call.assistant_name || '—'}</td>
                    <td className="px-5 py-3"><StatusBadge status={call.status} /></td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {call.duration ? `${Math.floor(call.duration/60)}:${String(call.duration%60).padStart(2,'0')}` : '—'}
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
