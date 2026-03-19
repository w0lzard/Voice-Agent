"use client";

/**
 * TranscriptDebugPanel
 * --------------------
 * Real-time 4-lane debug panel showing every stage of the voice pipeline:
 *
 *   🎤 Raw Deepgram transcript  (interim + final)
 *   🧠 Text sent to LLM         (final, noise-filtered)
 *   🤖 AI response text         (LLM output)
 *   🔊 Spoken by TTS            (Sarvam output)
 *
 * Also flags mismatches between what the LLM received and what it said.
 */

import { useEffect, useRef, useState } from "react";

const LANE_CONFIG = [
  {
    id:    "deepgram",
    icon:  "🎤",
    label: "Deepgram STT",
    desc:  "Raw transcript (streaming)",
    color: "text-cyan-400",
    bg:    "bg-cyan-500/5 border-cyan-500/20",
  },
  {
    id:    "llm_input",
    icon:  "🧠",
    label: "LLM Input",
    desc:  "Sent after noise filter",
    color: "text-blue-400",
    bg:    "bg-blue-500/5 border-blue-500/20",
  },
  {
    id:    "llm_output",
    icon:  "🤖",
    label: "AI Response",
    desc:  "LLM generated text",
    color: "text-purple-400",
    bg:    "bg-purple-500/5 border-purple-500/20",
  },
  {
    id:    "tts_spoken",
    icon:  "🔊",
    label: "Sarvam TTS",
    desc:  "Spoken audio text",
    color: "text-green-400",
    bg:    "bg-green-500/5 border-green-500/20",
  },
];

function Lane({ config, entries }) {
  const bottomRef = useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <div className={`rounded-lg border p-3 flex flex-col gap-1 min-h-0 ${config.bg}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base">{config.icon}</span>
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-wide ${config.color}`}>
            {config.label}
          </p>
          <p className="text-[9px] text-gray-600">{config.desc}</p>
        </div>
      </div>
      <div className="overflow-y-auto max-h-24 space-y-1 text-[10px]">
        {entries.length === 0 && (
          <p className="text-gray-700 italic">Waiting…</p>
        )}
        {entries.map((e, i) => (
          <div key={i} className={`rounded px-1.5 py-0.5 leading-snug
            ${e.is_noise ? "text-gray-600 line-through" : config.color}
            ${e.is_final === false ? "opacity-60" : "opacity-100"}`}>
            {e.text}
            {!e.is_final && <span className="ml-1 text-gray-600">[…]</span>}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function MismatchAlert({ input, output }) {
  if (!input || !output) return null;
  // Simple heuristic: if response contains completely different language signals
  const inputHasDevanagari = /[\u0900-\u097F]/.test(input);
  const outputHasDevanagari = /[\u0900-\u097F]/.test(output);
  if (inputHasDevanagari !== outputHasDevanagari) {
    return (
      <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 text-[10px] text-yellow-400">
        ⚠ Language mismatch: input={inputHasDevanagari ? "Hindi" : "English"} →
        output={outputHasDevanagari ? "Hindi" : "English"}
      </div>
    );
  }
  return null;
}

export function TranscriptDebugPanel({ wsUrl }) {
  const [lanes, setLanes]       = useState({ deepgram: [], llm_input: [], llm_output: [], tts_spoken: [] });
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  // Derive LLM input/output from transcript events:
  // role=user  (is_noise=false) → llm_input
  // role=agent                  → llm_output + tts_spoken
  // Deepgram interim events → deepgram lane (type="transcript_interim")
  const addEntry = (laneId, entry) => {
    setLanes(prev => ({
      ...prev,
      [laneId]: [...prev[laneId], entry].slice(-30),  // keep last 30 per lane
    }));
  };

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen  = () => setConnected(true);
      ws.onclose = () => { setConnected(false); setTimeout(connect, 3000); };
      ws.onmessage = (e) => {
        try {
          const ev = JSON.parse(e.data);

          if (ev.type === "transcript") {
            const text = ev.cleaned || ev.raw || "";
            if (!text) return;

            if (ev.role === "user") {
              // Raw Deepgram output
              addEntry("deepgram", {
                text,
                is_noise: ev.is_noise || ev.is_foreign_script,
                is_final: true,
              });
              // LLM sees it only if not noise
              if (!ev.is_noise && !ev.is_foreign_script) {
                addEntry("llm_input", { text, is_noise: false, is_final: true });
              }
            } else if (ev.role === "agent") {
              addEntry("llm_output",  { text, is_noise: false, is_final: true });
              addEntry("tts_spoken",  { text, is_noise: false, is_final: true });
            }
          }

          if (ev.type === "transcript_interim") {
            addEntry("deepgram", {
              text: ev.transcript || "",
              is_noise: false,
              is_final: false,
            });
          }
        } catch {}
      };
    };
    connect();
    return () => wsRef.current?.close();
  }, [wsUrl]);

  const lastInput  = lanes.llm_input.filter(e => !e.is_noise).at(-1)?.text;
  const lastOutput = lanes.llm_output.at(-1)?.text;

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
          Pipeline Debug
        </h3>
        <span className={`text-[9px] flex items-center gap-1 ${connected ? "text-green-400" : "text-red-400"}`}>
          <span className={`w-1 h-1 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
          {connected ? "Live" : "Off"}
        </span>
      </div>

      <MismatchAlert input={lastInput} output={lastOutput} />

      {LANE_CONFIG.map(cfg => (
        <Lane key={cfg.id} config={cfg} entries={lanes[cfg.id]} />
      ))}

      <div className="text-[9px] text-gray-700 text-center mt-auto">
        Deepgram → Filter → LLM → Sarvam
      </div>
    </div>
  );
}
