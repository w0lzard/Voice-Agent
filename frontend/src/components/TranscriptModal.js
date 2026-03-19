'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchTranscript } from '@/lib/api';

/**
 * TranscriptModal
 *
 * Props:
 *   call     — call object from the call history table
 *   onClose  — function to dismiss the modal
 *
 * Fetches the transcript via getCallTranscript() (mock or real API).
 * Displays a chat-bubble UI with agent on the left, user on the right.
 */
export default function TranscriptModal({ call, onClose }) {
  const [transcript, setTranscript] = useState(null);
  const [loadingTx, setLoadingTx]   = useState(true);
  const [error, setError]           = useState('');
  const scrollRef                   = useRef(null);

  // ── Fetch transcript ───────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingTx(true);
      setError('');
      try {
        const res = await fetchTranscript(call.call_id || call.id);
        if (cancelled) return;
        if (res?.ok && res?.data) {
          setTranscript(res.data.transcript ?? []);
        } else if (res === null) {
          setTranscript([]);  // 404 → empty (no transcript yet)
        } else {
          setError('Could not load transcript.');
        }
      } catch {
        if (!cancelled) setError('Failed to fetch transcript. Please try again.');
      } finally {
        if (!cancelled) setLoadingTx(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [call]);

  // Auto-scroll to the latest message once loaded
  useEffect(() => {
    if (transcript && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Derived call metadata ──────────────────────────────────────────────────
  const phone     = call.lead_phone || call.phone_number || '—';
  const agentName = call.agent_name || call.assistant_name || 'AI Agent';
  const dur       = call.duration;
  const durStr    = dur ? `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}` : '—';
  const createdAt = call.created_at
    ? new Date(call.created_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

  const statusColor = {
    completed:   'bg-emerald-500/10 text-emerald-400',
    failed:      'bg-rose-500/10 text-rose-400',
    missed:      'bg-rose-500/10 text-rose-400',
    active:      'bg-primary/10 text-primary',
    'in-progress': 'bg-primary/10 text-primary',
    queued:      'bg-amber-500/10 text-amber-400',
  }[call.status?.toLowerCase()] || 'bg-slate-700/50 text-slate-400';

  // ── Format per-message timestamp ──────────────────────────────────────────
  function fmtTime(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg flex flex-col rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ background: '#131a27', maxHeight: '88vh' }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          className="flex items-start justify-between p-5 border-b border-white/8 shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(43,108,238,0.08), rgba(255,255,255,0.01))' }}
        >
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">transcribe</span>
              Call Transcript
            </h3>

            {/* Call meta row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-slate-600">phone</span>
                <span className="font-mono">{phone}</span>
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-slate-600">mic</span>
                {agentName}
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-slate-600">calendar_today</span>
                {createdAt}
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-slate-600">timer</span>
                {durStr}
              </span>
            </div>

            {/* Status badge */}
            <div className="mt-2.5 flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                {call.status || 'Unknown'}
              </span>
              {transcript && (
                <span className="text-[10px] text-slate-600 font-medium">
                  {transcript.length} message{transcript.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all shrink-0 ml-3"
            aria-label="Close transcript"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* ── Speaker legend ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-5 px-5 py-2 border-b border-white/5 shrink-0" style={{ background: 'rgba(255,255,255,0.01)' }}>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span className="size-2 rounded-full bg-primary inline-block" />
            Agent
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span className="size-2 rounded-full bg-slate-500 inline-block" />
            User
          </span>
        </div>

        {/* ── Transcript body ──────────────────────────────────────────────── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 space-y-4"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
        >
          {/* Loading state */}
          {loadingTx && (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-500 text-sm">
              <span className="material-symbols-outlined text-3xl text-primary animate-spin">refresh</span>
              Loading transcript…
            </div>
          )}

          {/* Error state */}
          {!loadingTx && error && (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <span className="material-symbols-outlined text-3xl text-rose-400">error_outline</span>
              <p className="text-rose-400 text-sm font-medium">{error}</p>
              <button
                onClick={() => { setLoadingTx(true); setError(''); }}
                className="text-xs text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loadingTx && !error && transcript?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <span className="material-symbols-outlined text-3xl text-slate-700">chat_bubble_outline</span>
              <p className="text-slate-500 text-sm">No transcript available for this call.</p>
            </div>
          )}

          {/* Chat bubbles */}
          {!loadingTx && !error && transcript?.map((line, i) => {
            const isAgent = line.speaker === 'agent';
            const time    = fmtTime(line.timestamp);

            return (
              <div key={i} className={`flex gap-2.5 items-end ${isAgent ? '' : 'flex-row-reverse'}`}>
                {/* Avatar */}
                <div className={`size-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  isAgent
                    ? 'bg-primary/20 text-primary'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {isAgent ? 'AI' : 'U'}
                </div>

                {/* Bubble + timestamp */}
                <div className={`flex flex-col gap-1 max-w-[78%] ${isAgent ? 'items-start' : 'items-end'}`}>
                  {/* Speaker label */}
                  <p className={`text-[9px] font-bold uppercase tracking-widest px-1 ${isAgent ? 'text-primary/50' : 'text-slate-600'}`}>
                    {isAgent ? agentName : 'User'}
                  </p>

                  {/* Message bubble */}
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isAgent
                      ? 'rounded-tl-sm bg-primary/10 border border-primary/15 text-slate-200'
                      : 'rounded-tr-sm bg-white/5 border border-white/8 text-slate-300'
                  }`}>
                    {line.text}
                  </div>

                  {/* Timestamp */}
                  {time && (
                    <p className="text-[9px] text-slate-700 px-1">{time}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-white/8 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-slate-700 flex items-center gap-1">
            <span className="material-symbols-outlined text-[11px]">info</span>
            Transcript data is for reference only
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/8 text-slate-300 text-sm font-medium hover:bg-white/10 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
