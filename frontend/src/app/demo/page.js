import Link from 'next/link';
import MarketingNavbar from '@/components/MarketingNavbar';
import MarketingFooter from '@/components/MarketingFooter';

export default function DemoPage() {
  return (
    <div className="min-h-screen" style={{background: '#0a0e17', fontFamily: '"Space Grotesk", sans-serif'}}>
      <MarketingNavbar />

      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-15 pointer-events-none" style={{background: 'radial-gradient(circle, rgba(43,108,238,0.5) 0%, transparent 70%)'}}></div>

        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4">Interactive Demo</p>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6">See VoiceAI in action</h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto mb-12">
            Watch how our AI agents handle real sales conversations — from cold opening to appointment booking.
          </p>

          {/* Video placeholder */}
          <div className="rounded-3xl border border-white/8 overflow-hidden relative aspect-video mb-12" style={{background: 'rgba(255,255,255,0.02)'}}>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="size-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 hover:bg-primary/20 transition-all cursor-pointer">
                <span className="material-symbols-outlined text-primary text-4xl fill-1">play_circle</span>
              </div>
              <p className="text-slate-500 text-sm">Demo video — 3 min 42 sec</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none" style={{background: 'linear-gradient(to top, rgba(10,14,23,0.6), transparent)'}}></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12 text-left">
            {[
              { icon: 'schedule', title: '0:00 — Cold Intro', desc: 'Watch the AI open a cold call with perfect pacing and tone.' },
              { icon: 'psychology', title: '1:15 — Objection Handling', desc: 'See how it navigates "I\'m not interested" without sounding pushy.' },
              { icon: 'calendar_month', title: '2:30 — Booking', desc: 'The agent books a meeting directly into the rep\'s calendar.' },
            ].map(item => (
              <div key={item.title} className="rounded-2xl border border-white/8 p-5" style={{background: 'rgba(255,255,255,0.02)'}}>
                <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-primary text-base">{item.icon}</span>
                </div>
                <p className="text-xs font-bold text-slate-400 mb-1">{item.title}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="px-8 py-4 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all" style={{boxShadow: '0 8px 30px rgba(43,108,238,0.35)'}}>
              Start Free Trial
            </Link>
            <Link href="/contact" className="px-8 py-4 rounded-2xl border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/5 transition-all">
              Book a Live Demo
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
