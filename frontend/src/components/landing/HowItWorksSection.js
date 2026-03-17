const STEPS = [
  {
    num: 1,
    title: 'Connect Your Lead Sources',
    desc: 'Integration with Zillow, Realtor.com, and Facebook Ads takes less than 2 minutes via Zapier or direct API.',
  },
  {
    num: 2,
    title: 'Customize Your Agent Persona',
    desc: 'Choose from 50+ human-like voices and customize the script or goals based on your specific market niche.',
  },
  {
    num: 3,
    title: 'Watch Your Calendar Fill Up',
    desc: 'AI calls leads immediately, qualifies them, and places confirmed appointments directly into your CRM.',
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-24 px-6" id="how-it-works">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-20 items-center">

          {/* ── Steps list ── */}
          <div className="flex-1 order-2 lg:order-1">
            <div className="space-y-12">
              {STEPS.map(step => (
                <div key={step.num} className="flex gap-6 items-start">
                  {/* Step number circle */}
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
              {/* Ambient glow behind card */}
              <div
                className="absolute -inset-4 blur-3xl rounded-full bg-blue-500/10"
                aria-hidden="true"
              />

              {/* Outer glass card */}
              <div className="relative glass rounded-[2.5rem] p-4 shadow-2xl overflow-hidden">
                {/* Inner dark panel */}
                <div className="bg-[#020617]/80 rounded-[2rem] p-8">
                  {/* Fake window chrome */}
                  <div className="flex items-center gap-2 mb-8" aria-hidden="true">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>

                  {/* Content skeleton */}
                  <div className="space-y-4">
                    <div className="h-4 bg-white/5 rounded-full w-3/4" aria-hidden="true" />
                    <div className="h-4 bg-white/5 rounded-full w-1/2" aria-hidden="true" />

                    {/* Stat cards */}
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="h-24 bg-primary/10 rounded-2xl border border-primary/20 p-4">
                        <div className="text-[10px] text-primary font-bold mb-1 uppercase tracking-wider">
                          Calls Today
                        </div>
                        <div className="text-2xl font-black text-white">142</div>
                      </div>
                      <div className="h-24 bg-blue-500/10 rounded-2xl border border-blue-500/20 p-4">
                        <div className="text-[10px] text-blue-400 font-bold mb-1 uppercase tracking-wider">
                          Appts Set
                        </div>
                        <div className="text-2xl font-black text-white">18</div>
                      </div>
                    </div>

                    {/* Live analysis widget */}
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
