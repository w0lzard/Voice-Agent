'use client';

import { useState, useEffect } from 'react';
import { fetchWallet } from '../../lib/api';

export default function WalletPage() {
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadWallet() {
      try {
        const res = await fetchWallet();
        if (isMounted && res.ok) {
          setWalletData(res.data);
        }
      } catch (err) {
        console.error('Failed to load wallet data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadWallet();
    return () => { isMounted = false; };
  }, []);

  const currentBalance = walletData?.currentBalance ?? 0;
  const totalSpend = walletData?.totalSpend ?? 0;
  const spendChange = walletData?.spendChange ?? 0;
  const avgCost = walletData?.totalCalls > 0
    ? (totalSpend / walletData.totalCalls).toFixed(2)
    : '0.00';

  const dailyBreakdown = walletData?.dailyBreakdown || [];
  const chartData = [...dailyBreakdown].slice(-7);
  while (chartData.length < 7) {
    chartData.unshift({ date: '', spend: 0, calls: 0 });
  }
  const maxSpend = Math.max(...chartData.map(d => d.spend), 1);

  const transactions = walletData?.transactions || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Wallet & Billing</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your credits and usage</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/8 text-slate-300 text-sm font-medium hover:bg-white/5 transition-all">
          <span className="material-symbols-outlined text-base">download</span>
          Export Statement
        </button>
      </div>

      {/* Top grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Balance card - spans 2 cols */}
        <div className="lg:col-span-2 rounded-2xl p-6 relative overflow-hidden" style={{background: 'linear-gradient(135deg, #1a2a6c 0%, #2b6cee 50%, #1a5dd9 100%)'}}>
          <div className="absolute top-0 right-0 size-32 rounded-full bg-white/5 -translate-y-8 translate-x-8"></div>
          <div className="absolute bottom-0 left-0 size-24 rounded-full bg-white/5 translate-y-8 -translate-x-8"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Available Balance</p>
                <p className="text-4xl font-black text-white mt-1">
                  {loading ? '—' : `$${currentBalance.toFixed(2)}`}
                </p>
              </div>
              <div className="size-12 rounded-2xl bg-white/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-2xl">account_balance_wallet</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 rounded-xl bg-white text-primary text-sm font-bold hover:bg-white/90 transition-colors">
                Add Credits
              </button>
              <button className="px-4 py-2 rounded-xl bg-white/15 text-white text-sm font-semibold hover:bg-white/25 transition-colors border border-white/20">
                Auto-Reload: ON
              </button>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 rounded-2xl border border-white/8 p-5" style={{background: 'rgba(255,255,255,0.03)'}}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1">Total Spent Today</p>
            <p className="text-2xl font-bold text-slate-100">{loading ? '—' : `$${totalSpend.toFixed(2)}`}</p>
            {!loading && (
              <p className={`text-xs font-medium flex items-center gap-1 mt-1 ${spendChange > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                <span className="material-symbols-outlined text-[14px]">{spendChange > 0 ? 'trending_up' : 'trending_down'}</span>
                {Math.abs(spendChange)}% {spendChange > 0 ? 'more' : 'less'} than yesterday
              </p>
            )}
          </div>
          <div className="flex-1 rounded-2xl border border-white/8 p-5" style={{background: 'rgba(255,255,255,0.03)'}}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1">Avg Cost / Call</p>
            <p className="text-2xl font-bold text-slate-100">{loading ? '—' : `$${avgCost}`}</p>
            <p className="text-xs text-slate-600 mt-1">Based on {walletData?.totalCalls || 0} calls</p>
          </div>
        </div>
      </div>

      {/* Spend Chart */}
      <div className="rounded-2xl border border-white/8 p-5" style={{background: 'rgba(255,255,255,0.03)'}}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Daily Spend History</h3>
            <p className="text-xs text-slate-500 mt-0.5">Last 7 days</p>
          </div>
          <select className="px-3 py-1.5 rounded-xl text-xs bg-white/5 border border-white/8 text-slate-400 focus:outline-none">
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
          </select>
        </div>
        <div className="flex items-end gap-3 h-40">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">Loading history...</div>
          ) : chartData.map((day, i) => {
            const heightPct = Math.max((day.spend / maxSpend) * 100, 5);
            const dateObj = new Date(day.date);
            const dayLabel = day.date
              ? ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][dateObj.getDay()]
              : '—';
            const isToday = i === chartData.length - 1;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-lg transition-colors ${isToday ? 'bg-primary' : 'bg-primary/20 hover:bg-primary/40'}`}
                  style={{height: `${heightPct}%`}}
                  title={`$${day.spend.toFixed(2)} (${day.calls} calls)`}
                ></div>
                <span className="text-[10px] font-bold text-slate-600 uppercase">{dayLabel}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transactions */}
      <div className="rounded-2xl border border-white/8 overflow-hidden" style={{background: 'rgba(255,255,255,0.03)'}}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="text-sm font-bold text-slate-200">Transaction History</h3>
          <button className="text-primary text-xs font-semibold flex items-center gap-1 hover:text-primary/80 transition-colors">
            Export CSV <span className="material-symbols-outlined text-base">download</span>
          </button>
        </div>
        {loading ? (
          <div className="p-10 text-center text-slate-500 text-sm">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <span className="material-symbols-outlined text-4xl text-slate-700">receipt_long</span>
            <p className="text-slate-500 text-sm">No transactions yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Description', 'Date & Time', 'Duration', 'Cost', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr key={tx.id || i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`size-8 rounded-lg ${tx.type === 'call' ? 'bg-primary/10' : 'bg-slate-500/10'} flex items-center justify-center`}>
                          <span className={`material-symbols-outlined text-[18px] ${tx.type === 'call' ? 'text-primary' : 'text-slate-400'}`}>
                            {tx.type === 'call' ? 'support_agent' : 'payments'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{tx.description || tx.type || '—'}</p>
                          {tx.id && <p className="text-[10px] text-slate-600 font-mono">#{tx.id.slice(-6).toUpperCase()}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {tx.time ? new Date(tx.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">{tx.duration || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-sm font-bold ${tx.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount || 0).toFixed(4)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        tx.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-slate-500/10 text-slate-400'
                      }`}>
                        {tx.status === 'completed' ? 'Charged' : (tx.status || 'Pending')}
                      </span>
                    </td>
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
