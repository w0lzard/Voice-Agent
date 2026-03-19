"use client";

import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  useLocalParticipant,
  DisconnectButton,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useState, useCallback } from "react";
import { StatusBadge } from "./StatusBadge";

const WS_SERVER = process.env.NEXT_PUBLIC_WS_SERVER || "http://localhost:8090";

function AgentRoomUI() {
  const { state, audioTrack } = useVoiceAssistant();
  const { localParticipant } = useLocalParticipant();
  const [micMuted, setMicMuted] = useState(false);

  const toggleMic = useCallback(async () => {
    await localParticipant.setMicrophoneEnabled(micMuted);
    setMicMuted(m => !m);
  }, [localParticipant, micMuted]);

  const agentState = state ?? "connecting";
  const isSpeaking = agentState === "speaking";
  const isListening = agentState === "listening";

  return (
    <div className="flex flex-col items-center gap-6">
      <RoomAudioRenderer />
      <StatusBadge state={agentState} />

      {/* Visualizer ring */}
      <div className="relative flex items-center justify-center">
        <div className={`absolute w-36 h-36 rounded-full border-2 transition-all duration-500
          ${isSpeaking ? "border-purple-500 scale-110 animate-pulse" : isListening ? "border-green-500" : "border-gray-700 scale-95"}`}
        />
        <div className={`w-28 h-28 rounded-full flex flex-col items-center justify-center border-2 transition-all duration-300
          ${isSpeaking ? "bg-purple-500/10 border-purple-500/50" : isListening ? "bg-green-500/10 border-green-500/50" : "bg-gray-800 border-gray-700"}`}>
          <span className="text-3xl">🤖</span>
          <span className="text-[10px] text-gray-400 mt-1">Shubhi</span>
        </div>
      </div>

      {/* LiveKit bar visualizer */}
      {audioTrack && (
        <div className="w-48 h-10">
          <BarVisualizer trackRef={audioTrack} state={agentState} barCount={16} className="w-full h-full" />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button onClick={toggleMic}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
            ${micMuted ? "bg-red-500/20 border border-red-500/40 text-red-400" : "bg-green-500/20 border border-green-500/40 text-green-400"}`}>
          {micMuted ? "🔇 Unmute" : "🎤 Mute"}
        </button>
        <DisconnectButton className="px-4 py-2 rounded-full text-sm font-medium bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-all">
          End Call
        </DisconnectButton>
      </div>
    </div>
  );
}

export function VoiceAgent() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${WS_SERVER}/start-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setSession(data);
    } catch (e) {
      setError(e.message || "Failed to start session");
    } finally {
      setLoading(false);
    }
  };

  if (session) {
    return (
      <LiveKitRoom token={session.token} serverUrl={session.url} connect audio video={false} onDisconnected={() => setSession(null)}>
        <AgentRoomUI />
      </LiveKitRoom>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-28 h-28 rounded-full bg-gray-800 border-2 border-gray-700 flex flex-col items-center justify-center">
        <span className="text-4xl">🤖</span>
      </div>
      <div className="text-center">
        <p className="font-semibold text-white text-lg">Shubhi</p>
        <p className="text-sm text-gray-400">AI Voice Agent · Anantasutra</p>
        <p className="text-xs text-gray-600 mt-1">gpt-4o-mini-realtime · alloy</p>
      </div>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-sm text-red-400 text-center max-w-xs">{error}</div>
      )}
      <button onClick={startSession} disabled={loading}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-full transition-all shadow-lg">
        {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Connecting…</> : <>🎤 Start Voice Test</>}
      </button>
      <p className="text-xs text-gray-600 text-center max-w-xs">
        Connects to LiveKit and dispatches the AI agent. Microphone access required.
      </p>
    </div>
  );
}
