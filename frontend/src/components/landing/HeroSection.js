import Link from 'next/link';

const WAVE_BARS = [
  { height: 'h-8', opacity: 'opacity-40' },
  { height: 'h-12', opacity: 'opacity-50' },
  { height: 'h-20', opacity: 'opacity-70' },
  { height: 'h-16', opacity: 'opacity-60' },
  { height: 'h-24', opacity: 'opacity-100' },
  { height: 'h-[72px]', opacity: 'opacity-80' },
  { height: 'h-12', opacity: 'opacity-50' },
  { height: 'h-8', opacity: 'opacity-40' },
];

const AVATAR_COLORS = ['bg-slate-800', 'bg-slate-700', 'bg-slate-600'];

export default function HeroSection() {
  return (
    <section className="relative pt-40 pb-24 px-6 hero-gradient overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(43,108,238,0.08) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        {/* ── Left column ── */}
        <div className="flex-1 text-center lg:text-left">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Next-Gen Real Estate AI
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black leading-[1.1] mb-8">
            <span className="bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
              AI Voice Agents That Call Your Real Estate Leads{' '}
            </span>
            <span className="text-primary">Intelligently</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed">
            Automate lead qualification, appointment booking, and customer follow-ups with
            human-like AI voice agents that never sleep.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-2"
            >
              Start Free Trial
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

          {/* Social proof */}
          <div className="mt-10 flex items-center justify-center lg:justify-start gap-4 text-slate-500 text-sm">
            <div className="flex -space-x-2" aria-hidden="true">
              {AVATAR_COLORS.map((color, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full border-2 border-[#020617] ${color}`}
                />
              ))}
            </div>
            <span>Joined by 2,000+ top-producing agents</span>
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
                  <h3 className="font-bold text-white">Live AI Demo</h3>
                  <p className="text-xs text-slate-400">Press play to hear the AI in action</p>
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
              {/* Progress bar */}
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
              aria-label="Play example: Seller Lead Qualifying"
            >
              <span className="material-symbols-outlined fill-1" aria-hidden="true">play_arrow</span>
              Hear Example: Seller Lead Qualifying
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
