import Link from 'next/link';
import MarketingNavbar from '@/components/MarketingNavbar';
import MarketingFooter from '@/components/MarketingFooter';

const TEAM = [
  { name: 'Arjun Sharma', role: 'CEO & Co-founder', avatar: 'AS', desc: 'Former VP Engineering at Salesforce. 15 years building enterprise sales tech.' },
  { name: 'Priya Nair', role: 'CTO & Co-founder', avatar: 'PN', desc: 'Ex-Google AI researcher. Built speech models used by 50M+ users.' },
  { name: 'David Kim', role: 'Head of Product', avatar: 'DK', desc: 'Previously at HubSpot and Outreach. Obsessed with sales workflow optimization.' },
  { name: 'Meera Patel', role: 'Head of AI', avatar: 'MP', desc: 'PhD in Computational Linguistics. Led NLP teams at Amazon Alexa.' },
];

const VALUES = [
  { icon: 'psychology', title: 'Human-First AI', desc: 'We build AI that augments human capability, not replaces it. Our agents handle the repetitive so your team can focus on what matters.' },
  { icon: 'verified_user', title: 'Trust & Transparency', desc: 'We never hide the fact that AI is calling. Every call is disclosed, compliant, and built with integrity.' },
  { icon: 'speed', title: 'Speed Over Perfection', desc: 'We ship fast, listen to customers, and iterate constantly. Done is better than perfect — then we make it perfect.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{background: '#0a0e17', fontFamily: '"Space Grotesk", sans-serif'}}>
      <MarketingNavbar />

      {/* Hero */}
      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-15 pointer-events-none" style={{background: 'radial-gradient(circle, rgba(43,108,238,0.5) 0%, transparent 70%)'}}></div>
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4">About Us</p>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6">We&apos;re building the<br />future of outbound</h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
            Founded in 2023, VoiceAI started with a simple belief: sales reps should spend their time selling, not dialing. We&apos;re a team of AI engineers, product designers, and sales veterans who know what it takes.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: '2023', label: 'Founded' },
            { value: '500+', label: 'Customers' },
            { value: '10M+', label: 'Calls Powered' },
            { value: '$8M', label: 'Seed Raised' },
          ].map(stat => (
            <div key={stat.label} className="text-center rounded-2xl border border-white/8 p-6" style={{background: 'rgba(255,255,255,0.02)'}}>
              <p className="text-3xl font-black text-white mb-1">{stat.value}</p>
              <p className="text-xs text-slate-600 font-medium uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-white text-center mb-12">Our values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUES.map(v => (
              <div key={v.title} className="rounded-3xl border border-white/8 p-8" style={{background: 'rgba(255,255,255,0.02)'}}>
                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                  <span className="material-symbols-outlined text-primary text-xl">{v.icon}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-3">{v.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-white text-center mb-12">Meet the team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM.map(member => (
              <div key={member.name} className="rounded-3xl border border-white/8 p-6 text-center" style={{background: 'rgba(255,255,255,0.02)'}}>
                <div className="size-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-lg font-bold mx-auto mb-4">
                  {member.avatar}
                </div>
                <h3 className="text-sm font-bold text-slate-100 mb-1">{member.name}</h3>
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-3">{member.role}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{member.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-white/5 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-4">Join us on the mission</h2>
          <p className="text-slate-500 mb-8">We&apos;re hiring. And we&apos;re always looking for customers who want to shape the future of voice AI.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/contact" className="px-8 py-4 rounded-2xl border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/5 transition-all">Get in Touch</Link>
            <Link href="/signup" className="px-8 py-4 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all" style={{boxShadow: '0 8px 30px rgba(43,108,238,0.35)'}}>
              Try VoiceAI Free
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
