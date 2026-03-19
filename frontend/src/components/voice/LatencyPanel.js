"use client";

import { useEffect, useRef, useState } from "react";

const TARGET_MS = 1500;

function LatencyBar({ label, value, max, colorClass }) {
  const pct = value != null ? Math.min((value / max) * 100, 100) : 0;
  const bad = value != null && value >= max;
  const warn = value != null && value >= max * 0.6 && !bad;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className={`font-mono font-semibold ${bad ? "text-red-400" : warn ? "text-yellow-400" : "text-green-400"}`}>
          {value != null ? `${Math.round(value)}ms` : "—"}
        </span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? "border-blue-500/40 bg-blue-500/5" : "border-gray-700 bg-gray-800/50"}`}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold font-mono ${highlight ? "text-blue-300" : "text-white"}`}>
        {value != null ? Math.round(value) : "—"}
        {value != null && <span className="text-sm font-normal text-gray-400 ml-1">ms</span>}
      </p>
    </div>
  );
}

export function LatencyPanel({ wsUrl }) {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  const serverBase = wsUrl.replace(/^ws/, "http").replace("/ws", "");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const r = await fetch(`${serverBase}/stats`);
        if (r.ok) setStats(await r.json());
      } catch {}
    };
    fetchStats();
    const id = setInterval(fetchStats, 5000);
    return () => clearInterval(id);
  }, [serverBase]);

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onclose = () => { setConnected(false); setTimeout(connect, 3000); };
      ws.onmessage = (e) => {
        try {
          const ev = JSON.parse(e.data);
          if (ev.type === "latency") setEvents(prev => [ev, ...prev].slice(0, 20));
        } catch {}
      };
    };
    connect();
    return () => wsRef.current?.close();
  }, [wsUrl]);

  const latest = events[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Latency Metrics</h3>
        <span className={`text-xs flex items-center gap-1.5 ${connected ? "text-green-400" : "text-red-400"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
          {connected ? "Live" : "Offline"}
        </span>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Avg Round-trip" value={stats.avg_total_ms} highlight />
          <StatCard label="P95 Latency" value={stats.p95_total_ms} />
          <StatCard label="Avg STT" value={stats.avg_stt_ms} />
          <StatCard label="LLM TTFB" value={stats.avg_llm_ttfb_ms} />
        </div>
      )}

      {stats?.avg_total_ms != null && (
        <div className={`rounded-lg px-3 py-2 text-xs flex items-center justify-between
          ${stats.avg_total_ms < TARGET_MS ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
          <span>Target &lt; {TARGET_MS}ms</span>
          <span className="font-semibold">{stats.below_target_pct != null ? `${stats.below_target_pct}% on target` : ""}</span>
        </div>
      )}

      {latest && (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 space-y-3">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Turn #{latest.turn_id}</p>
          <LatencyBar label="STT" value={latest.stt_ms} max={500} colorClass="bg-cyan-400" />
          <LatencyBar label="LLM (TTFB)" value={latest.llm_ttfb_ms} max={600} colorClass="bg-blue-400" />
          <LatencyBar label="TTS (TTFB)" value={latest.tts_ttfb_ms} max={400} colorClass="bg-purple-400" />
          <div className="pt-1 border-t border-gray-700">
            <LatencyBar label="TOTAL" value={latest.total_ms} max={TARGET_MS} colorClass="bg-green-400" />
          </div>
        </div>
      )}

      {events.length > 1 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {events.slice(1).map((ev, i) => (
            <div key={i} className="flex items-center justify-between text-xs bg-gray-800/30 rounded-lg px-3 py-1.5">
              <span className="text-gray-500">Turn #{ev.turn_id}</span>
              <span className={`font-mono font-semibold ${ev.total_ms < TARGET_MS ? "text-green-400" : "text-red-400"}`}>
                {ev.total_ms != null ? `${Math.round(ev.total_ms)}ms` : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      {!latest && (
        <div className="text-center py-8 text-gray-600 text-sm">No data yet — start a session and speak.</div>
      )}
    </div>
  );
}
