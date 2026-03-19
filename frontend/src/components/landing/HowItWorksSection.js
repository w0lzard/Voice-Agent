const STEPS = [
  {
    num: 1,
    title: 'Connect in Minutes',
    desc: 'Link your CRM, lead sources, or phone system via our REST API or Zapier integration. No engineering team required — just your API key.',
  },
  {
    num: 2,
    title: 'Configure Your Agent',
    desc: 'Choose a voice, set the goal (qualify, book, follow-up), and define your script or let our AI generate one from your product description.',
  },
  {
    num: 3,
    title: 'Launch and Convert',
    desc: 'Your agent starts calling immediately. Watch live transcripts, conversion metrics, and booked appointments flow into your dashboard in real-time.',
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-24 px-6" id="how-it-works">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-primary text-sm font-bold uppercase tracking-widest mb-4">
            How It Works
          </p>
          <h2 className="text-4xl md:text-5xl font-black mb-6 text-white">
            Up and running in under 10 minutes
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
            No complex setup. No training data. Just connect, configure, and launch.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-20 items-center">
          {/* ── Steps list ── */}
          <div className="flex-1 order-2 lg:order-1">
            <div className="space-y-12">
              {STEPS.map(step => (
                <div key={step.num} className="flex gap-6 items-start">
                  <div className="shrink-0 w-12 h-12 rounded-full border border-primary text-primary flex items-center justify-center font-bold text-xl">
                    {step.num}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2 text-white">{step.title}</h4>
                    <p className="text-slate-400 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Dashboard mockup ── */}
          <div className="flex-1 order-1 lg:order-2 w-full">
            <div className="relative">
              <div
                className="absolute -inset-4 blur-3xl rounded-full bg-blue-500/10"
                aria-hidden="true"
              />

              <div className="relative glass rounded-[2.5rem] p-4 shadow-2xl overflow-hidden">
                <div className="bg-[#020617]/80 rounded-[2rem] p-8">
                  {/* Fake window chrome */}
                  <div className="flex items-center gap-2 mb-8" aria-hidden="true">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>

                  <div className="space-y-4">
                    <div className="h-4 bg-white/5 rounded-full w-3/4" aria-hidden="true" />
                    <div className="h-4 bg-white/5 rounded-full w-1/2" aria-hidden="true" />

                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="h-24 bg-primary/10 rounded-2xl border border-primary/20 p-4">
                        <div className="text-[10px] text-primary font-bold mb-1 uppercase tracking-wider">
                          Calls Today
                        </div>
                        <div className="text-2xl font-black text-white">3,847</div>
                      </div>
                      <div className="h-24 bg-purple-500/10 rounded-2xl border border-purple-500/20 p-4">
                        <div className="text-[10px] text-purple-400 font-bold mb-1 uppercase tracking-wider">
                          Converted
                        </div>
                        <div className="text-2xl font-black text-white">412</div>
                      </div>
                    </div>

                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-300">
                          Live Conversation Analysis
                        </span>
                        <span className="text-[10px] text-green-400 font-bold uppercase">Active</span>
                      </div>
                      <div className="space-y-2" aria-hidden="true">
                        <div className="h-2 bg-primary/20 rounded-full w-full" />
                        <div className="h-2 bg-primary/20 rounded-full w-4/5" />
                        <div className="h-2 bg-primary/20 rounded-full w-2/3" />
                      </div>
                    </div>

                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                      <span className="text-xs text-slate-300 font-medium">
                        Agent speaking in <span className="text-primary font-bold">Spanish</span> · Sentiment: Positive
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
