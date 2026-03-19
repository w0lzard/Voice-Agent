"use client";

import dynamic from "next/dynamic";
import { TranscriptPanel } from "../../components/voice/TranscriptPanel";
import { LatencyPanel } from "../../components/voice/LatencyPanel";

// SSR-safe — LiveKit uses browser APIs
const VoiceAgent = dynamic(
  () => import("../../components/voice/VoiceAgent").then((m) => ({ default: m.VoiceAgent })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div> }
);

const WS_SERVER = process.env.NEXT_PUBLIC_WS_SERVER || "http://localhost:8090";
const WS_URL = WS_SERVER.replace(/^http/, "ws") + "/ws";

function LayerBadge({ n, label, desc, colorClass }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${colorClass}`}>
      <span className="text-xs font-bold w-5 shrink-0">{n}</span>
      <div>
        <p className="text-xs font-semibold leading-none">{label}</p>
        <p className="text-[10px] opacity-70 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

export default function VoiceTestPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm font-bold">A</div>
          <div>
            <h1 className="font-bold text-white leading-none">Anantasutra</h1>
            <p className="text-[11px] text-gray-500">Voice Agent Testing Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            OpenAI Realtime
          </span>
          <span className="px-2 py-1 bg-gray-800 rounded text-gray-400">gpt-4o-mini-realtime</span>
          <span className="px-2 py-1 bg-gray-800 rounded text-gray-400">alloy voice</span>
          <a href="/dashboard" className="px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-600/30 transition-colors">
            ← Dashboard
          </a>
        </div>
      </header>

      {/* 3-column layout */}
      <div className="grid grid-cols-12 gap-0" style={{ height: "calc(100vh - 65px)" }}>

        {/* Left: Voice Agent */}
        <div className="col-span-3 border-r border-gray-800 p-6 flex flex-col overflow-y-auto">
          <div className="flex-1 flex flex-col items-center justify-center">
            <VoiceAgent />
          </div>

          {/* Layer architecture info */}
          <div className="mt-6 rounded-xl bg-gray-800/50 border border-gray-700 p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">3-Layer Architecture</p>
            <LayerBadge n="1" label="Pre-recorded Layer" desc="Instant greeting cache (0ms)"
              colorClass="text-orange-400 bg-orange-500/10 border-orange-500/20" />
            <LayerBadge n="2" label="Smart Filler Layer" desc="Covers LLM thinking delays"
              colorClass="text-yellow-400 bg-yellow-500/10 border-yellow-500/20" />
            <LayerBadge n="3" label="AI Intelligence Layer" desc="OpenAI Realtime STT+LLM+TTS"
              colorClass="text-green-400 bg-green-500/10 border-green-500/20" />
          </div>

          {/* Pipeline info */}
          <div className="mt-3 rounded-xl bg-gray-800/50 border border-gray-700 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Pipeline</p>
            <div className="space-y-1.5 text-xs">
              {[
                ["STT",       "OpenAI Realtime native"],
                ["LLM",       "gpt-4o-mini-realtime"],
                ["TTS",       "OpenAI audio stream"],
                ["Voice",     "alloy (feminine)"],
                ["Transport", "LiveKit WebRTC"],
                ["Telephony", "Vobiz SIP"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-600">{k}</span>
                  <span className="text-gray-300">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Transcript */}
        <div className="col-span-6 border-r border-gray-800 p-6 flex flex-col min-h-0">
          <TranscriptPanel wsUrl={WS_URL} />
        </div>

        {/* Right: Latency */}
        <div className="col-span-3 p-6 overflow-y-auto">
          <LatencyPanel wsUrl={WS_URL} />
        </div>
      </div>
    </div>
  );
}
