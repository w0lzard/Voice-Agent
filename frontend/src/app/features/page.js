import Link from 'next/link';
import MarketingNavbar from '@/components/MarketingNavbar';
import MarketingFooter from '@/components/MarketingFooter';

const FEATURE_SECTIONS = [
  {
    category: 'Voice AI',
    icon: 'mic',
    color: 'text-primary',
    bg: 'bg-primary/10',
    items: [
      { title: 'Natural Voice Synthesis', desc: 'Industry-leading TTS voices that are indistinguishable from human agents. Choose from 50+ voices across 20+ languages.' },
      { title: 'Real-time Speech Recognition', desc: 'Sub-200ms transcription latency with 98.5% accuracy. Handles accents, background noise, and interruptions.' },
      { title: 'Emotion Detection', desc: 'Analyzes caller sentiment in real-time and adapts the conversation accordingly — from empathetic to assertive.' },
      { title: 'Custom Voice Cloning', desc: 'Upload a 60-second sample to clone your own voice or your top reps\' voices for personalized outreach.' },
    ]
  },
  {
    category: 'Campaign Management',
    icon: 'campaign',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    items: [
      { title: 'Smart Dialing', desc: 'Predictive dialer with timezone awareness, best-time-to-call optimization, and automatic retry scheduling.' },
      { title: 'CSV Bulk Upload', desc: 'Upload thousands of contacts at once. Auto-validates phone numbers, deduplicates, and normalizes formats.' },
      { title: 'A/B Script Testing', desc: 'Test multiple conversation scripts simultaneously and auto-optimize toward the highest-converting version.' },
      { title: 'DNC List Compliance', desc: 'Automatically scrub against national DNC registries. Built-in TCPA compliance tools for peace of mind.' },
    ]
  },
  {
    category: 'Analytics & Insights',
    icon: 'analytics',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    items: [
      { title: 'Live Call Monitoring', desc: 'Watch calls happen in real-time. Whisper to agents, take over calls, or intervene when sentiment drops.' },
      { title: 'Full Transcripts', desc: 'Every call is transcribed and stored. Search across thousands of calls, filter by keyword, or export to CSV.' },
      { title: 'Conversion Attribution', desc: 'Track exactly which scripts, voices, and times of day drive the most conversions. Close the loop.' },
      { title: 'Team Performance', desc: 'Compare agent performance across all key metrics. Identify coaching opportunities and top performers.' },
    ]
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen" style={{background: '#0a0e17', fontFamily: '"Space Grotesk", sans-serif'}}>
      <MarketingNavbar />

      {/* Hero */}
      <section className="pt-40 pb-20 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-15" style={{background: 'radial-gradient(circle, rgba(43,108,238,0.5) 0%, transparent 70%)'}}></div>
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4">Platform Features</p>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6">Built for scale.<br />Designed for results.</h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
            Every feature is built with one goal: help your team make more meaningful calls, close more deals, and grow faster.
          </p>
        </div>
      </section>

      {/* Feature Sections */}
      {FEATURE_SECTIONS.map((section, i) => (
        <section key={section.category} className={`py-24 px-6 ${i > 0 ? 'border-t border-white/5' : ''}`}>
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-12">
              <div className={`size-11 rounded-2xl flex items-center justify-center ${section.bg}`}>
                <span className={`material-symbols-outlined text-xl ${section.color}`}>{section.icon}</span>
              </div>
              <h2 className="text-2xl font-black text-slate-100">{section.category}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {section.items.map(item => (
                <div key={item.title} className="rounded-2xl border border-white/8 p-6" style={{background: 'rgba(255,255,255,0.02)'}}>
                  <h3 className="text-base font-bold text-slate-100 mb-2 flex items-center gap-2">
                    <span className={`material-symbols-outlined text-base ${section.color}`}>check_circle</span>
                    {item.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="py-20 px-6 border-t border-white/5 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-4">See it all in action</h2>
          <p className="text-slate-500 mb-8">Start your free trial and explore every feature with no credit card required.</p>
          <Link href="/signup" className="inline-flex px-8 py-4 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all" style={{boxShadow: '0 8px 30px rgba(43,108,238,0.35)'}}>
            Start Free Trial
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
