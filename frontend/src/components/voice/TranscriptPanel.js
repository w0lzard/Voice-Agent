"use client";

import { useEffect, useRef, useState } from "react";

function LanguageBadge({ lang }) {
  const colors = {
    hi:       "bg-orange-500/20 text-orange-300 border-orange-500/30",
    en:       "bg-blue-500/20 text-blue-300 border-blue-500/30",
    hinglish: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    unknown:  "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase ${colors[lang] ?? colors.unknown}`}>
      {lang}
    </span>
  );
}

function Bubble({ ev, showRaw }) {
  const isUser = ev.role === "user";
  if (ev.is_noise || ev.is_foreign_script) {
    return (
      <div className="flex justify-center">
        <span className="text-[11px] text-gray-600 bg-gray-800/60 rounded-full px-3 py-0.5 border border-gray-700">
          {ev.is_noise ? "🔇 Noise" : "🔤 Foreign"} — {ev.raw?.slice(0, 30)}
        </span>
      </div>
    );
  }
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[80%] space-y-1">
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed
          ${isUser ? "bg-blue-600 text-white rounded-br-sm" : "bg-gray-700 text-gray-100 rounded-bl-sm"}`}>
          {ev.cleaned || ev.raw}
        </div>
        <div className={`flex items-center gap-2 px-1 ${isUser ? "justify-end" : "justify-start"}`}>
          <span className="text-[10px] text-gray-600">
            {new Date(ev.timestamp * 1000).toLocaleTimeString()}
          </span>
          <LanguageBadge lang={ev.language} />
          {showRaw && ev.raw !== ev.cleaned && (
            <span className="text-[10px] text-gray-600 truncate max-w-[100px]" title={ev.raw}>
              raw: {ev.raw?.slice(0, 25)}…
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function TranscriptPanel({ wsUrl }) {
  const [events, setEvents] = useState([]);
  const [showRaw, setShowRaw] = useState(false);
  const [filterNoise, setFilterNoise] = useState(true);
  const bottomRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          const ev = JSON.parse(e.data);
          if (ev.type === "transcript") setEvents(prev => [...prev, ev].slice(-200));
        } catch {}
      };
      ws.onclose = () => setTimeout(connect, 3000);
    };
    connect();
    return () => wsRef.current?.close();
  }, [wsUrl]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [events]);

  const visible = filterNoise ? events.filter(e => !e.is_noise && !e.is_foreign_script) : events;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Live Transcript</h3>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-200">
            <input type="checkbox" checked={filterNoise} onChange={e => setFilterNoise(e.target.checked)} className="accent-blue-500" />
            Filter noise
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-200">
            <input type="checkbox" checked={showRaw} onChange={e => setShowRaw(e.target.checked)} className="accent-blue-500" />
            Show raw
          </label>
          <button onClick={() => setEvents([])} className="text-gray-500 hover:text-red-400 transition-colors">Clear</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-2">
            <span className="text-4xl">🎤</span>
            <p className="text-sm">Transcript appears here</p>
          </div>
        ) : visible.map((ev, i) => <Bubble key={i} ev={ev} showRaw={showRaw} />)}
        <div ref={bottomRef} />
      </div>

      {events.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-800 flex gap-4 text-xs text-gray-500">
          <span>{events.filter(e => e.role === "user").length} user turns</span>
          <span>{events.filter(e => e.role === "agent").length} agent turns</span>
          <span>{events.filter(e => e.is_noise).length} noise filtered</span>
        </div>
      )}
    </div>
  );
}
