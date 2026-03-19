'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE, getAuthHeaders } from '../../lib/api';

// ─── Voice definitions ────────────────────────────────────────────────────────
// audioSrc  → /public/audio/*.mp3  (HTML5 Audio — used when file exists)
// sampleText → spoken via Web Speech API when MP3 is unavailable
// pitch / rate / voiceHint → Web Speech API tuning
const VOICES = [
  {
    id: 'v1',
    name: 'Professional — Sarah',
    desc: 'Calm, authoritative, and trustworthy. Best for enterprise calls.',
    audioSrc: '/audio/sarah.wav',
    // Neutral confident pitch, measured pace — sounds polished and business-ready
    sampleText:
      "Hello. This is Sarah from VoiceAI. I am reaching out regarding a strategic opportunity that may be of interest to your organization. I would be glad to schedule a brief consultation at your convenience.",
    pitch: 1.0,   // neutral — not too high, projects confidence
    rate: 0.93,   // measured, deliberate — never rushed
    gender: 'female',
  },
  {
    id: 'v2',
    name: 'Friendly — Mark',
    desc: 'Energetic, approachable, and helpful. Great for lead gen.',
    audioSrc: '/audio/mark.wav',
    // Higher pitch lift + faster rate = upbeat, enthusiastic energy
    sampleText:
      "Hey! Great to connect with you! This is Mark from VoiceAI, and I have some genuinely exciting news I think you are going to love. Do you have just two minutes? I promise it will be worth it!",
    pitch: 1.08,  // brighter, upbeat tone
    rate: 1.12,   // fast and energetic — keeps listeners engaged
    gender: 'male',
  },
  {
    id: 'v3',
    name: 'Sophisticated — James',
    desc: 'Formal, experienced, and precise. Ideal for B2B outreach.',
    audioSrc: '/audio/james.wav',
    // Low pitch + slow deliberate pace = gravitas, authority, formal B2B feel
    sampleText:
      "Good day. I am James, calling on behalf of VoiceAI. I wished to discuss a matter of considerable importance regarding your portfolio. I trust you find this moment suitable for a brief and productive discussion.",
    pitch: 0.78,  // noticeably deeper, authoritative
    rate: 0.82,   // slow and deliberate — every word counts
    gender: 'male',
  },
  {
    id: 'v4',
    name: 'Warm — Elena',
    desc: 'Gentle, patient, and inviting. Perfect for customer support.',
    audioSrc: '/audio/elena.wav',
    // High soft pitch + gentle slow pace = caring, patient, approachable
    sampleText:
      "Hello there. This is Elena from VoiceAI. I hope you are having a wonderful day. I just wanted to take a moment to personally reach out and make sure everything is going smoothly for you. I am here whenever you need me.",
    pitch: 1.28,  // soft and warm — clearly distinct from Sarah
    rate: 0.87,   // gentle, unhurried — patient and caring
    gender: 'female',
  },
];

// ─── Audio engine ─────────────────────────────────────────────────────────────
// Tries HTML5 Audio first; falls back to SpeechSynthesis if MP3 is missing.
function useVoicePlayer() {
  const audioRef = useRef(null);       // HTMLAudioElement
  const utteranceRef = useRef(null);   // SpeechSynthesisUtterance
  const [playingId, setPlayingId] = useState(null);

  // Stop everything currently playing
  const stopAll = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
    utteranceRef.current = null;
    setPlayingId(null);
  }, []);

  // Play a voice — toggles off if same voice is already playing
  const play = useCallback((voice) => {
    // Toggle off
    if (playingId === voice.id) {
      stopAll();
      return;
    }

    stopAll();

    // ── Try HTML5 Audio first ──────────────────────────────────────────────
    const audio = new Audio(voice.audioSrc);

    audio.oncanplaythrough = () => {
      audioRef.current = audio;
      setPlayingId(voice.id);
      audio.play().catch(() => {
        // File exists but autoplay blocked — fall through to TTS
        audioRef.current = null;
        playTTS(voice);
      });
    };

    audio.onended = () => setPlayingId(null);
    audio.onerror = () => {
      // MP3 not found (404) — fall back to TTS
      audioRef.current = null;
      playTTS(voice);
    };

    // Kick off the load; onerror fires if file is missing
    audio.load();
  }, [playingId, stopAll]);  // eslint-disable-line

  // ── Web Speech API fallback ───────────────────────────────────────────────
  function playTTS(voice) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const speak = (availableVoices) => {
      const utterance = new SpeechSynthesisUtterance(voice.sampleText);
      utterance.pitch = voice.pitch ?? 1;
      utterance.rate = voice.rate ?? 1;
      utterance.volume = 1;

      // Real browser/OS voice names — group by gender
      const FEMALE_KEYWORDS = ['zira', 'hazel', 'aria', 'jenny', 'natasha', 'karen',
        'samantha', 'victoria', 'moira', 'fiona', 'tessa', 'cortana', 'susan',
        'female', 'woman', 'google uk english female', 'microsoft zira',
        'microsoft hazel', 'microsoft aria'];
      const MALE_KEYWORDS   = ['david', 'mark', 'james', 'daniel', 'rishi', 'lee',
        'alex', 'fred', 'junior', 'ralph', 'male', 'man',
        'google uk english male', 'microsoft david', 'microsoft mark'];

      const keywords = voice.gender === 'female' ? FEMALE_KEYWORDS : MALE_KEYWORDS;
      const enVoices = availableVoices.filter(v => v.lang.startsWith('en'));

      const picked =
        enVoices.find(v => keywords.some(kw => v.name.toLowerCase().includes(kw))) ||
        enVoices[0] ||
        availableVoices[0];

      if (picked) utterance.voice = picked;

      utterance.onstart = () => setPlayingId(voice.id);
      utterance.onend   = () => setPlayingId(null);
      utterance.onerror = () => setPlayingId(null);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setPlayingId(voice.id);
    };

    // Voices may not be loaded yet on first call — wait if needed
    const list = window.speechSynthesis.getVoices();
    if (list.length > 0) {
      speak(list);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        speak(window.speechSynthesis.getVoices());
      };
    }
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); }
      window.speechSynthesis?.cancel();
    };
  }, []);

  return { playingId, play, stopAll };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function VoicePage() {
  const [activeVoice, setActiveVoice] = useState('v1');
  const [isRecording, setIsRecording] = useState(false);
  const [stability, setStability] = useState(65);
  const [clarity, setClarity] = useState(82);
  const [rate, setRate] = useState(1.0);

  const { playingId, play, stopAll } = useVoicePlayer();
  const isPlaying = playingId !== null;

  // Test Call state
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testInstructions, setTestInstructions] = useState('');
  const [callStatus, setCallStatus] = useState(null); // null | 'calling' | 'success' | 'error'
  const [callResult, setCallResult] = useState(null);
  const [callError, setCallError] = useState('');
  const callTimerRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/v1/assistants`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setAgents(Array.isArray(d.assistants) ? d.assistants : []))
      .catch(() => {});
    return () => {
      if (callTimerRef.current) clearTimeout(callTimerRef.current);
    };
  }, []);

  const handleTestCall = async () => {
    if (!testPhone.trim()) { setCallError('Enter a phone number'); return; }
    setCallStatus('calling');
    setCallError('');
    setCallResult(null);
    try {
      const body = { phone_number: testPhone.trim() };
      if (testInstructions.trim()) body.instructions = testInstructions.trim();
      if (selectedAgent) body.metadata = { assistant_id: selectedAgent };
      const res = await fetch(`${API_BASE}/v1/calls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setCallError(data.detail || data.error || 'Call failed');
        setCallStatus('error');
        return;
      }
      setCallResult(data);
      setCallStatus('success');
      callTimerRef.current = setTimeout(() => setCallStatus(null), 8000);
    } catch {
      setCallError('Network error — check backend connection');
      setCallStatus('error');
    }
  };

  const resetCall = () => { setCallStatus(null); setCallResult(null); setCallError(''); };

  const handleVoiceCardClick = (voiceId) => {
    // Selecting a different card while playing → stop audio
    if (activeVoice !== voiceId && playingId) stopAll();
    setActiveVoice(voiceId);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Voice Agents</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure AI voice characteristics for your agents</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 bg-primary rounded-xl text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
          style={{ boxShadow: '0 4px 14px rgba(43,108,238,0.3)' }}
        >
          <span className="material-symbols-outlined text-base">add</span>
          New Agent
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Voice Cards ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Premium AI Voices</h2>
            <button className="text-primary text-xs font-semibold flex items-center gap-1 hover:text-primary/80 transition-colors">
              <span className="material-symbols-outlined text-base">add</span>
              Custom Voice
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {VOICES.map((voice) => {
              const isActive = activeVoice === voice.id;
              const isThisPlaying = playingId === voice.id;

              return (
                <div
                  key={voice.id}
                  onClick={() => handleVoiceCardClick(voice.id)}
                  className={`flex flex-col gap-4 rounded-2xl p-5 transition-all cursor-pointer border-2 ${
                    isActive
                      ? 'border-primary bg-primary/5'
                      : 'border-white/8 hover:border-white/20'
                  }`}
                  style={
                    isActive
                      ? { boxShadow: '0 0 0 1px rgba(43,108,238,0.2)', background: 'rgba(43,108,238,0.05)' }
                      : { background: 'rgba(255,255,255,0.03)' }
                  }
                >
                  <div className="flex items-center justify-between">
                    {/* ── Play / Pause button ──────────────────────────── */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveVoice(voice.id);
                        play(voice);
                      }}
                      title={isThisPlaying ? 'Pause preview' : 'Play preview'}
                      className={`size-10 rounded-full flex items-center justify-center transition-all relative ${
                        isThisPlaying
                          ? 'bg-primary text-white ring-4 ring-primary/20'
                          : isActive
                          ? 'bg-primary text-white'
                          : 'bg-white/5 text-slate-400 hover:bg-primary/20 hover:text-primary'
                      }`}
                      style={(isActive || isThisPlaying) ? { boxShadow: '0 4px 12px rgba(43,108,238,0.4)' } : {}}
                    >
                      {/* Ripple animation while playing */}
                      {isThisPlaying && (
                        <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                      )}
                      <span className="material-symbols-outlined text-[20px] relative z-10">
                        {isThisPlaying ? 'pause' : 'play_arrow'}
                      </span>
                    </button>

                    {/* Badges */}
                    <div className="flex items-center gap-2">
                      {isThisPlaying && (
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-lg">
                          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                          Playing
                        </span>
                      )}
                      {isActive && !isThisPlaying && (
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-primary text-white px-2 py-0.5 rounded-lg">
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-100 mb-1">{voice.name}</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">{voice.desc}</p>
                  </div>

                  {/* Mini waveform — only when this voice is playing */}
                  {isThisPlaying && (
                    <div className="flex items-end justify-start gap-0.5 h-5 pt-1">
                      {Array.from({ length: 18 }).map((_, i) => {
                        const heights = [30, 60, 90, 70, 100, 50, 80, 40, 90, 60, 100, 70, 50, 85, 40, 65, 90, 30];
                        return (
                          <div
                            key={i}
                            className="w-1 rounded-full bg-primary wave-bar"
                            style={{
                              height: `${heights[i % heights.length]}%`,
                              animationDelay: `${(i * 0.06).toFixed(2)}s`,
                              opacity: 0.7,
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Playback hint */}
          <p className="text-[11px] text-slate-600 flex items-center gap-1.5 px-1">
            <span className="material-symbols-outlined text-[13px]">info</span>
            Click ▶ on any voice card to hear a sample preview. Only one voice plays at a time.
          </p>
        </div>

        {/* ── Right: Visualizer + Controls ────────────────────────────────── */}
        <div className="lg:col-span-5 space-y-5">
          {/* Waveform Visualizer */}
          <div
            className="rounded-2xl border border-white/8 p-6 flex flex-col items-center text-center overflow-hidden relative"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <div
              className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none ${
                isPlaying ? 'opacity-25' : 'opacity-8'
              }`}
              style={{ background: 'radial-gradient(circle at center, rgba(43,108,238,0.6), transparent 60%)' }}
            />

            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes soundwave { 0% { transform: scaleY(0.2); } 50% { transform: scaleY(1); } 100% { transform: scaleY(0.2); } }
              .wave-playing .wave-bar { animation: soundwave 1.2s infinite ease-in-out alternate; transform-origin: bottom; }
            ` }} />

            <div className={`flex items-end justify-center gap-1 h-24 mb-5 relative z-10 w-full ${isPlaying ? 'wave-playing' : ''}`}>
              {[...Array(24)].map((_, i) => {
                const heights = [20, 40, 60, 80, 100, 70, 50, 30, 90, 100, 80, 40];
                const h = heights[i % heights.length];
                return (
                  <div
                    key={i}
                    className="wave-bar w-1.5 rounded-full bg-primary"
                    style={{
                      height: isPlaying ? `${h}%` : '4px',
                      animationDelay: `${(i * 0.05).toFixed(2)}s`,
                      opacity: isPlaying ? h / 100 : 0.3,
                    }}
                  />
                );
              })}
            </div>

            <div className="relative z-10">
              <p className="text-primary font-mono text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                {playingId ? (
                  <>
                    <span className="size-2 rounded-full bg-primary animate-pulse" />
                    Playing — {VOICES.find(v => v.id === playingId)?.name.split('—')[1]?.trim()}
                  </>
                ) : (
                  <>
                    <span className="size-2 rounded-full bg-slate-600" />
                    Ready to preview
                  </>
                )}
              </p>
              <p className={`text-sm text-slate-300 italic transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-40'}`}>
                &quot;Hello, I&apos;m{' '}
                {VOICES.find((v) => v.id === activeVoice)?.name.split('—')[1]?.trim()} from VoiceAI. How can I help you?&quot;
              </p>
            </div>

            {/* Play / Stop button inside visualizer */}
            <button
              onClick={() => {
                const voice = VOICES.find(v => v.id === activeVoice);
                if (voice) play(voice);
              }}
              className={`mt-5 relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                playingId === activeVoice
                  ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
              style={playingId !== activeVoice ? { boxShadow: '0 4px 14px rgba(43,108,238,0.3)' } : {}}
            >
              <span className="material-symbols-outlined text-base">
                {playingId === activeVoice ? 'stop_circle' : 'play_arrow'}
              </span>
              {playingId === activeVoice ? 'Stop Preview' : 'Play Sample'}
            </button>
          </div>

          {/* Engine Controls */}
          <div className="rounded-2xl border border-white/8 p-5 space-y-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <h3 className="text-sm font-bold text-slate-200">Engine Tuning</h3>

            {[
              { label: 'Stability', value: stability, onChange: setStability, desc: 'How consistent the voice is across responses.' },
              { label: 'Clarity + Similarity', value: clarity, onChange: setClarity, desc: 'Higher values = clearer but less emotional.' },
            ].map((ctrl) => (
              <div key={ctrl.label} className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{ctrl.label}</label>
                  <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">{ctrl.value}%</span>
                </div>
                <input type="range" min="0" max="100" value={ctrl.value}
                  onChange={(e) => ctrl.onChange(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary bg-white/10" />
                <p className="text-[11px] text-slate-600">{ctrl.desc}</p>
              </div>
            ))}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Speaking Rate</label>
                <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">{rate.toFixed(1)}x</span>
              </div>
              <input type="range" min="0.5" max="2" step="0.1" value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary bg-white/10" />
              <div className="flex justify-between text-[10px] text-slate-600 font-bold px-1">
                <span>Slow</span><span>Normal</span><span>Fast</span>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-white/5">
              <button className="flex-1 py-2.5 rounded-xl border border-white/8 text-sm font-semibold text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-base">settings_backup_restore</span>
                Reset
              </button>
              <button
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                style={{ boxShadow: '0 4px 14px rgba(43,108,238,0.3)' }}
              >
                <span className="material-symbols-outlined text-base">check_circle</span>
                Save Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Use Your Own Voice ──────────────────────────────────────────────── */}
      <div
        className="rounded-2xl border border-primary/20 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(43,108,238,0.07), rgba(139,92,246,0.04))' }}
      >
        <div className="absolute right-0 top-0 bottom-0 flex items-center pr-10 pointer-events-none select-none opacity-[0.04]">
          <span className="material-symbols-outlined text-[200px] text-white">graphic_eq</span>
        </div>

        <div className="relative z-10 p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-xl">record_voice_over</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100">Use your own voice</h2>
                <p className="text-[11px] text-slate-500">Create a personalized AI voice clone</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Record a short 60-second clip and our AI will model your vocal tone, pitch, and cadence — making every agent call sound unmistakably like you.
            </p>
            {isRecording && (
              <div className="flex items-center gap-2 text-xs text-red-400 font-semibold">
                <span className="size-2 rounded-full bg-red-400 animate-pulse" />
                Recording in progress…
              </div>
            )}
          </div>

          <div className="lg:col-span-1 grid grid-cols-3 gap-3">
            {[
              { n: '01', icon: 'mic', label: 'Record', desc: '60-second voice sample' },
              { n: '02', icon: 'auto_fix_high', label: 'Process', desc: 'AI models your voice' },
              { n: '03', icon: 'check_circle', label: 'Deploy', desc: 'Activate on your agents' },
            ].map((step) => (
              <div key={step.n} className="flex flex-col items-center text-center gap-2 px-2 py-3 rounded-xl border border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <span className="text-[10px] font-bold text-primary/60 font-mono">{step.n}</span>
                <span className="material-symbols-outlined text-primary text-xl">{step.icon}</span>
                <div>
                  <p className="text-[11px] font-bold text-slate-200">{step.label}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1 flex flex-col items-center gap-4">
            <div className={`flex items-end justify-center gap-1 h-14 w-full ${isRecording ? 'wave-playing' : ''}`}>
              {[...Array(28)].map((_, i) => {
                const h = [20,50,80,100,70,40,90,60,30,85,100,55,35,75,100,65,45,90,50,30,80,100,60,40,70,95,45,25][i % 28];
                return (
                  <div key={i} className="wave-bar w-1 rounded-full"
                    style={{
                      height: isRecording ? `${h}%` : '3px',
                      background: isRecording ? `rgba(43,108,238,${h / 100})` : 'rgba(255,255,255,0.12)',
                      animationDelay: `${(i * 0.04).toFixed(2)}s`,
                    }}
                  />
                );
              })}
            </div>
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm text-white transition-all relative overflow-hidden ${
                isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'
              }`}
              style={{ boxShadow: isRecording ? '0 4px 20px rgba(239,68,68,0.35)' : '0 4px 20px rgba(43,108,238,0.35)' }}
            >
              {isRecording && <span className="absolute inset-0 bg-red-600 animate-pulse opacity-30 rounded-xl" />}
              <span className="material-symbols-outlined text-[20px] relative z-10">{isRecording ? 'stop_circle' : 'mic'}</span>
              <span className="relative z-10">{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
            </button>
            <p className="text-[10px] text-slate-600 text-center">Speak naturally — no script needed</p>
          </div>
        </div>
      </div>

      {/* ── Test Call Section ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-white/5"
          style={{ background: 'linear-gradient(135deg, rgba(43,108,238,0.06), rgba(139,92,246,0.04))' }}
        >
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[20px]">phone_in_talk</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Test Your Voice Agent</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Dispatch a live call to any number and verify your agent is working</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">Voice Agent</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-[18px] pointer-events-none">smart_toy</span>
                <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 rounded-xl text-sm bg-white/5 border border-white/8 text-slate-300 focus:outline-none focus:border-primary/50 transition-colors appearance-none">
                  <option value="">Default Agent</option>
                  {agents.map((a) => (
                    <option key={a.assistant_id || a._id} value={a.assistant_id || a._id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-slate-600">Select which agent handles this call</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">Destination Number</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-[18px] pointer-events-none">dialpad</span>
                <input type="tel" placeholder="+91 98765 43210" value={testPhone}
                  onChange={(e) => { setTestPhone(e.target.value); if (callStatus === 'error') resetCall(); }}
                  className="w-full pl-9 pr-4 py-3 rounded-xl text-sm bg-white/5 border border-white/8 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-colors" />
              </div>
              <p className="text-[10px] text-slate-600">E.164 format recommended (+countrycode…)</p>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Override Instructions <span className="text-slate-600 normal-case font-normal">(optional)</span>
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-4 text-slate-600 text-[18px] pointer-events-none">edit_note</span>
                <textarea rows={4} placeholder="e.g. Greet warmly, introduce as Sarah, ask about needs..."
                  value={testInstructions} onChange={(e) => setTestInstructions(e.target.value)}
                  className="w-full min-h-[112px] pl-10 pr-4 py-3 rounded-xl text-sm leading-6 bg-white/5 border border-white/8 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-colors resize-none" />
              </div>
              <p className="text-[10px] leading-4 text-slate-600 px-1">Overrides the agent&apos;s default system prompt for this call</p>
            </div>
          </div>

          {callStatus === 'success' && callResult && (
            <div className="mt-5 flex items-center gap-4 px-5 py-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <div className="size-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-emerald-400 text-xl">check_circle</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-emerald-400">Call dispatched successfully</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Call ID: <span className="font-mono text-slate-400">{callResult.call_id}</span>
                  &nbsp;·&nbsp;Status: <span className="font-semibold text-slate-300 capitalize">{callResult.status}</span>
                  {callResult.room_name && <>&nbsp;·&nbsp;Room: <span className="font-mono text-slate-400">{callResult.room_name}</span></>}
                </p>
              </div>
              <button onClick={resetCall} className="shrink-0 size-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          )}

          {callStatus === 'error' && (
            <div className="mt-5 flex items-center gap-4 px-5 py-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
              <div className="size-9 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-rose-400 text-xl">error</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-rose-400">Call failed</p>
                <p className="text-xs text-slate-500 mt-0.5">{callError}</p>
              </div>
              <button onClick={resetCall} className="shrink-0 size-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mt-5 pt-5 border-t border-white/5">
            <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">info</span>
              Real call — standard carrier rates apply
            </p>
            <button
              onClick={handleTestCall}
              disabled={callStatus === 'calling' || !testPhone.trim()}
              className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: callStatus === 'calling' ? 'rgba(43,108,238,0.6)' : '#2b6cee',
                boxShadow: callStatus === 'calling' ? 'none' : '0 4px 16px rgba(43,108,238,0.35)',
              }}
            >
              {callStatus === 'calling' ? (
                <><span className="material-symbols-outlined text-base animate-spin">refresh</span> Dispatching…</>
              ) : (
                <><span className="material-symbols-outlined text-base">call</span> Start Test Call</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
