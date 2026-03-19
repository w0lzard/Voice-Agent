import Link from 'next/link';

const WAVE_BARS = [
  { height: 'h-8',    opacity: 'opacity-40' },
  { height: 'h-12',   opacity: 'opacity-50' },
  { height: 'h-20',   opacity: 'opacity-70' },
  { height: 'h-16',   opacity: 'opacity-60' },
  { height: 'h-24',   opacity: 'opacity-100' },
  { height: 'h-[72px]', opacity: 'opacity-80' },
  { height: 'h-12',   opacity: 'opacity-50' },
  { height: 'h-8',    opacity: 'opacity-40' },
];

const STATS = [
  { value: '10M+', label: 'Calls Placed' },
  { value: '50+',  label: 'Languages' },
  { value: '98%',  label: 'Uptime SLA' },
];

export default function HeroSection() {
  return (
    <section className="relative pt-40 pb-24 px-6 hero-gradient overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(43,108,238,0.10) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        {/* ── Left column ── */}
        <div className="flex-1 text-center lg:text-left">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              AI Voice Agent Platform
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black leading-[1.1] mb-6">
            <span className="bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
              Human-like AI calling that{' '}
            </span>
            <span className="text-primary">converts</span>
            <span className="bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
              , not just talks
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed">
            Deploy AI voice agents that speak naturally in 50+ languages, handle objections in
            real-time, and book qualified appointments — 24/7, at scale.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-2"
            >
              Get Started
              <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
            </Link>
            <Link
              href="/demo"
              className="w-full sm:w-auto glass px-8 py-4 rounded-xl font-bold text-lg transition-all hover:bg-white/5 flex items-center justify-center gap-2 text-white"
            >
              Book Demo
              <span className="material-symbols-outlined" aria-hidden="true">videocam</span>
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-12 flex flex-wrap items-center justify-center lg:justify-start gap-8">
            {STATS.map(stat => (
              <div key={stat.label} className="text-center lg:text-left">
                <div className="text-2xl font-black text-white">{stat.value}</div>
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column — Live AI Demo card ── */}
        <div className="flex-1 w-full max-w-lg">
          <div className="glass rounded-[2rem] p-8 relative group overflow-hidden hover:border-white/20 transition-all duration-300">
            {/* Hover glow overlay */}
            <div
              className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem]"
              aria-hidden="true"
            />

            {/* Card header */}
            <div className="relative flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
                  <span className="material-symbols-outlined text-white" aria-hidden="true">graphic_eq</span>
                </div>
                <div>
                  <h3 className="font-bold text-white">Live AI Agent</h3>
                  <p className="text-xs text-slate-400">Press play to hear it in action</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-md bg-green-500/10 text-green-400 text-xs font-bold uppercase">
                Online
              </span>
            </div>

            {/* Waveform visualizer */}
            <div className="relative bg-black/40 rounded-2xl p-6 border border-white/5 mb-6">
              <div className="flex items-end justify-center gap-1.5 h-24 mb-6" aria-hidden="true">
                {WAVE_BARS.map((bar, i) => (
                  <div
                    key={i}
                    className={`w-2 bg-primary rounded-full wave-bar ${bar.height} ${bar.opacity}`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>00:12</span>
                <div className="flex-1 mx-4 h-1 bg-white/10 rounded-full relative">
                  <div className="absolute left-0 top-0 h-full w-1/3 bg-primary rounded-full" aria-hidden="true" />
                </div>
                <span>02:45</span>
              </div>
            </div>

            {/* Play button */}
            <button
              className="relative w-full glass hover:bg-white/10 text-white p-4 rounded-xl flex items-center justify-center gap-3 transition-colors font-bold group-hover:border-primary/40"
              aria-label="Play example AI call"
            >
              <span className="material-symbols-outlined fill-1" aria-hidden="true">play_arrow</span>
              Hear Example: Outbound Sales Call
            </button>

            {/* Real-time tag */}
            <p className="mt-4 text-center text-xs text-slate-600 font-medium">
              Real-time speech · Natural interruptions · Zero latency
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
