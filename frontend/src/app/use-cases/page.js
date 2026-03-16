import Link from 'next/link';
import MarketingNavbar from '@/components/MarketingNavbar';
import MarketingFooter from '@/components/MarketingFooter';

const USE_CASES = [
  {
    icon: 'storefront',
    title: 'Sales Development',
    color: 'text-primary',
    bg: 'bg-primary/10',
    headline: 'Prospect at 10× the speed',
    desc: 'Deploy AI SDRs that make hundreds of qualification calls per day. Surface warm leads to your human reps automatically.',
    results: ['300% more qualified leads', '60% reduction in SDR cost', '2-day lead response time → 2 minutes'],
  },
  {
    icon: 'support_agent',
    title: 'Customer Success',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    headline: 'Proactive retention at scale',
    desc: 'Automatically check in with customers at key moments — onboarding, renewal, at-risk. Reduce churn before it happens.',
    results: ['35% reduction in churn', '90% customer satisfaction maintained', 'NPS improvement of 18 points'],
  },
  {
    icon: 'event_available',
    title: 'Appointment Setting',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    headline: 'Fill your calendar automatically',
    desc: 'AI agents call leads, qualify them, and book appointments directly into your calendar. No human needed.',
    results: ['5× more appointments booked', '80% show rate with AI reminders', '24/7 booking capability'],
  },
  {
    icon: 'payments',
    title: 'Collections & Follow-up',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    headline: 'Recover revenue on autopilot',
    desc: 'Sensitive, compliant AI agents for payment reminders, invoice follow-ups, and collections that preserve relationships.',
    results: ['40% improvement in collection rate', '100% TCPA compliance', 'Zero agent burnout'],
  },
  {
    icon: 'survey',
    title: 'Research & Surveys',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    headline: 'Gather insights at massive scale',
    desc: 'Conduct market research, NPS surveys, and customer interviews via AI phone calls. Get rich data fast.',
    results: ['10,000 surveys/day capacity', '95% completion rate', 'Instant sentiment analysis'],
  },
  {
    icon: 'real_estate_agent',
    title: 'Real Estate',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    headline: 'Never miss a buyer lead',
    desc: 'AI agents qualify buyer and seller inquiries 24/7, schedule showings, and keep prospects warm until your agents are available.',
    results: ['100% lead response rate', '3× more showing appointments', '$0 after-hours staffing cost'],
  },
];

export default function UseCasesPage() {
  return (
    <div className="min-h-screen" style={{background: '#0a0e17', fontFamily: '"Space Grotesk", sans-serif'}}>
      <MarketingNavbar />

      {/* Hero */}
      <section className="pt-40 pb-20 px-6 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-15 pointer-events-none" style={{background: 'radial-gradient(circle, rgba(43,108,238,0.5) 0%, transparent 70%)'}}></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4">Use Cases</p>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6">Works for any team<br />with phones to dial</h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">VoiceAI adapts to your workflow. See how teams across industries use it to grow.</p>
        </div>
      </section>

      {/* Use Cases Grid */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {USE_CASES.map(uc => (
            <div key={uc.title} className="rounded-3xl border border-white/8 p-8 group hover:-translate-y-1 transition-all duration-300" style={{background: 'rgba(255,255,255,0.02)'}}>
              <div className={`size-12 rounded-2xl flex items-center justify-center mb-5 ${uc.bg}`}>
                <span className={`material-symbols-outlined text-xl ${uc.color}`}>{uc.icon}</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">{uc.title}</p>
              <h3 className="text-xl font-bold text-slate-100 mb-3">{uc.headline}</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">{uc.desc}</p>
              <div className="space-y-2">
                {uc.results.map(r => (
                  <div key={r} className="flex items-center gap-2 text-xs font-medium text-slate-400">
                    <span className="size-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                    {r}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-white/5 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-4">Don&apos;t see your use case?</h2>
          <p className="text-slate-500 mb-8">VoiceAI is flexible. Talk to our team and we&apos;ll design a solution for your specific workflow.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/contact" className="px-8 py-4 rounded-2xl border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/5 transition-all">Talk to Sales</Link>
            <Link href="/signup" className="px-8 py-4 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all" style={{boxShadow: '0 8px 30px rgba(43,108,238,0.35)'}}>
              Try It Free
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
