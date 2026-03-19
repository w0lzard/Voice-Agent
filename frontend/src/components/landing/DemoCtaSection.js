import Link from 'next/link';

const DEMO_HIGHLIGHTS = [
  { icon: 'check_circle', text: 'No credit card required' },
  { icon: 'check_circle', text: '100 free calls on signup' },
  { icon: 'check_circle', text: 'Cancel anytime' },
];

export default function DemoCtaSection() {
  return (
    <section className="py-24 px-6" id="demo">
      <div className="max-w-7xl mx-auto">
        {/* Demo preview strip */}
        <div className="glass rounded-3xl p-8 md:p-12 mb-16 relative overflow-hidden">
          {/* Background glow */}
          <div
            className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(43,108,238,0.12) 0%, transparent 70%)' }}
            aria-hidden="true"
          />

          <div className="relative flex flex-col lg:flex-row items-center gap-12">
            {/* Left: transcript mockup */}
            <div className="flex-1 w-full">
              <p className="text-primary text-xs font-bold uppercase tracking-widest mb-4">
                Live Transcript
              </p>
              <div className="space-y-4 font-mono text-sm">
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold uppercase mt-0.5">AI</span>
                  <p className="text-slate-300 leading-relaxed">
                    Hi, this is Alex from VoiceAI. I wanted to quickly connect about your inquiry. Is now a good time to chat for just two minutes?
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-[10px] font-bold uppercase mt-0.5">Lead</span>
                  <p className="text-slate-400 leading-relaxed">
                    Sure, yeah go ahead.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold uppercase mt-0.5">AI</span>
                  <p className="text-slate-300 leading-relaxed">
                    Great! I can see you were interested in our enterprise plan. Are you looking to automate outbound calls, inbound support, or both?
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex gap-1" aria-hidden="true">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-primary rounded-full wave-bar"
                        style={{ height: `${[10, 16, 12, 8][i]}px` }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-500">AI is speaking…</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px h-64 bg-white/10 shrink-0" aria-hidden="true" />

            {/* Right: call stats */}
            <div className="flex-1 w-full space-y-5">
              <p className="text-primary text-xs font-bold uppercase tracking-widest mb-4">
                Call Intelligence
              </p>
              {[
                { label: 'Sentiment', value: 'Positive', color: 'text-green-400', bar: 'bg-green-400', pct: '78%' },
                { label: 'Engagement', value: 'High', color: 'text-blue-400', bar: 'bg-blue-400', pct: '85%' },
                { label: 'Intent to Buy', value: 'Likely', color: 'text-purple-400', bar: 'bg-purple-400', pct: '65%' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between mb-1.5 text-sm">
                    <span className="text-slate-400 font-medium">{item.label}</span>
                    <span className={`font-bold ${item.color}`}>{item.value}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full">
                    <div
                      className={`h-full ${item.bar} rounded-full`}
                      style={{ width: item.pct }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              ))}
              <div className="pt-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="text-xs text-slate-500 font-medium mb-1">Language Detected</div>
                <div className="text-white font-bold">English (US) · <span className="text-primary">Switch to Spanish?</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA banner */}
        <div
          className="rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(43,108,238,0.15) 0%, rgba(139,92,246,0.10) 100%)' }}
        >
          <div
            className="absolute inset-0 rounded-3xl border border-white/10 pointer-events-none"
            aria-hidden="true"
          />

          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Ready to convert more<br className="hidden md:block" /> with every call?
          </h2>
          <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Join thousands of companies using AI Voice Agent Platform to scale conversations
            without scaling headcount.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link
              href="/signup"
              className="bg-primary hover:bg-primary/90 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-2"
            >
              Get Started Free
              <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
            </Link>
            <Link
              href="/demo"
              className="glass hover:bg-white/5 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
            >
              Talk to Sales
              <span className="material-symbols-outlined" aria-hidden="true">phone_in_talk</span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {DEMO_HIGHLIGHTS.map(item => (
              <div key={item.text} className="flex items-center gap-2 text-slate-400 text-sm">
                <span className="material-symbols-outlined text-green-400 text-[18px]" aria-hidden="true">
                  {item.icon}
                </span>
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
