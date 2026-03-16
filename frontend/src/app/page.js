'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import MarketingNavbar from '@/components/MarketingNavbar';
import MarketingFooter from '@/components/MarketingFooter';

const FEATURES = [
  { icon: 'mic', title: 'AI Voice Agents', desc: 'Deploy human-like AI agents that handle outbound calls with natural conversation flow and real-time adaptation.', color: 'text-primary', bg: 'bg-primary/10' },
  { icon: 'campaign', title: 'Smart Campaigns', desc: 'Launch and manage multi-channel calling campaigns with intelligent scheduling, retry logic, and lead scoring.', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { icon: 'analytics', title: 'Deep Analytics', desc: 'Track every call metric — sentiment, duration, conversion rate, and agent performance in real-time dashboards.', color: 'text-purple-400', bg: 'bg-purple-500/10' },
];

const STEPS = [
  { num: '01', title: 'Connect Your Data', desc: 'Upload your contact list, connect your CRM, or sync from any source. Our system processes it instantly.' },
  { num: '02', title: 'Configure Your Agent', desc: 'Choose a voice, set conversation scripts, define goals, and train on your knowledge base documents.' },
  { num: '03', title: 'Launch & Monitor', desc: 'Start campaigns with one click. Monitor calls live, review transcripts, and iterate based on analytics.' },
];

const TESTIMONIALS = [
  { name: 'Sarah Chen', role: 'VP Sales, TechCorp', quote: 'VoiceAI tripled our outbound call capacity without adding headcount. Our conversion rate improved 40% in the first month.', avatar: 'SC' },
  { name: 'Marcus Rivera', role: 'CEO, LeadGen Pro', quote: 'The AI voices are indistinguishable from human agents. Our prospects don\'t even realize they\'re talking to AI until we tell them.', avatar: 'MR' },
];

const PLANS = [
  { name: 'Starter', price: '$49', period: '/mo', features: ['500 AI call minutes', '2 voice agents', 'Basic analytics', 'Email support'], cta: 'Start Free Trial', popular: false },
  { name: 'Growth', price: '$149', period: '/mo', features: ['2,500 AI call minutes', '10 voice agents', 'Advanced analytics', 'Priority support', 'Custom voices', 'API access'], cta: 'Get Started', popular: true },
  { name: 'Enterprise', price: 'Custom', period: '', features: ['Unlimited minutes', 'Unlimited agents', 'Custom integrations', 'Dedicated support', 'SLA guarantee', 'White-label option'], cta: 'Contact Sales', popular: false },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || user) return null;

  return (
    <div className="min-h-screen" style={{background: '#0a0e17', fontFamily: '"Space Grotesk", sans-serif'}}>
      <MarketingNavbar />

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full opacity-20" style={{background: 'radial-gradient(circle, rgba(43,108,238,0.4) 0%, transparent 70%)'}}></div>
          <div className="absolute top-20 right-20 w-64 h-64 rounded-full opacity-10" style={{background: 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)'}}></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-xs font-bold text-primary bg-primary/5 mb-8 uppercase tracking-widest">
            <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>
            Now with Gemini Live Voice AI
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6" style={{background: 'linear-gradient(135deg, #ffffff 0%, #ffffff 50%, #64748b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>
            AI Voice Agents<br />That Actually Convert
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Deploy intelligent AI calling agents in minutes. Automate outbound campaigns, qualify leads, and close deals — all with human-like voice conversations at scale.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="px-8 py-4 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all active:scale-95" style={{boxShadow: '0 8px 30px rgba(43,108,238,0.4)'}}>
              Start Free — No Credit Card
            </Link>
            <Link href="/demo" className="px-8 py-4 rounded-2xl border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/5 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-base">play_circle</span>
              Watch Demo
            </Link>
          </div>

          <p className="text-xs text-slate-600 mt-6">14-day free trial · No setup fees · Cancel anytime</p>

          {/* Hero Visual */}
          <div className="mt-16 rounded-3xl border border-white/8 overflow-hidden shadow-2xl relative" style={{background: 'rgba(255,255,255,0.02)'}}>
            <div className="p-1.5 border-b border-white/5" style={{background: 'rgba(255,255,255,0.03)'}}>
              <div className="flex items-center gap-1.5 px-3">
                <div className="size-3 rounded-full bg-rose-500/60"></div>
                <div className="size-3 rounded-full bg-amber-500/60"></div>
                <div className="size-3 rounded-full bg-emerald-500/60"></div>
                <span className="text-xs text-slate-700 ml-3 font-mono">voiceai.app/dashboard</span>
              </div>
            </div>
            <div className="p-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Active Agents', value: '12', icon: 'mic', change: '+3 today', color: 'text-primary' },
                { label: 'Calls Today', value: '1,247', icon: 'call', change: '↑ 18%', color: 'text-emerald-400' },
                { label: 'Conversions', value: '23.5%', icon: 'trending_up', change: '↑ 5.2%', color: 'text-purple-400' },
              ].map(stat => (
                <div key={stat.label} className="rounded-2xl border border-white/8 p-5" style={{background: 'rgba(255,255,255,0.03)'}}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`material-symbols-outlined text-xl ${stat.color}`}>{stat.icon}</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{stat.change}</span>
                  </div>
                  <p className="text-2xl font-black text-slate-100">{stat.value}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4">Platform Features</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-100 mb-4">Everything you need to scale</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">A complete platform for intelligent voice automation — from agent creation to analytics.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded-3xl border border-white/8 p-8 group hover:-translate-y-1 transition-all duration-300" style={{background: 'rgba(255,255,255,0.02)'}}>
                <div className={`size-14 rounded-2xl flex items-center justify-center mb-6 ${f.bg}`}>
                  <span className={`material-symbols-outlined text-2xl ${f.color}`}>{f.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-100 mb-3">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/features" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
              See all features <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4">How It Works</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-100 mb-4">Up and running in 15 minutes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px" style={{background: 'linear-gradient(90deg, rgba(43,108,238,0.4), transparent)'}}></div>
                )}
                <div className="rounded-3xl border border-white/8 p-8" style={{background: 'rgba(255,255,255,0.02)'}}>
                  <span className="text-5xl font-black text-white/5 block mb-4 leading-none">{step.num}</span>
                  <h3 className="text-lg font-bold text-slate-100 mb-3">{step.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl border border-primary/20 p-12 text-center relative overflow-hidden" style={{background: 'linear-gradient(135deg, rgba(43,108,238,0.08), rgba(139,92,246,0.05))'}}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 rounded-full opacity-20" style={{background: 'radial-gradient(circle, rgba(43,108,238,0.8), transparent)'}}></div>
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-10">
              {[
                { value: '10M+', label: 'Calls Processed' },
                { value: '98.5%', label: 'Uptime SLA' },
                { value: '3.2×', label: 'Avg Conversion Lift' },
              ].map(stat => (
                <div key={stat.label}>
                  <p className="text-5xl font-black text-white mb-2">{stat.value}</p>
                  <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4">Testimonials</p>
            <h2 className="text-4xl font-black text-slate-100">Loved by sales teams</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="rounded-3xl border border-white/8 p-8" style={{background: 'rgba(255,255,255,0.02)'}}>
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-amber-400 text-base fill-1">star</span>
                  ))}
                </div>
                <p className="text-slate-300 text-base leading-relaxed mb-6 italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4">Pricing</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-100 mb-4">Simple, transparent pricing</h2>
            <p className="text-slate-500">Start free. Scale as you grow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(plan => (
              <div key={plan.name} className={`rounded-3xl border p-8 relative ${plan.popular ? 'border-primary/40' : 'border-white/8'}`} style={plan.popular ? {background: 'rgba(43,108,238,0.05)'} : {background: 'rgba(255,255,255,0.02)'}}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold text-slate-200 mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-slate-500 text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-400">
                      <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.name === 'Enterprise' ? '/contact' : '/signup'}
                  className={`w-full block text-center py-3 rounded-2xl text-sm font-bold transition-all ${
                    plan.popular
                      ? 'bg-primary text-white hover:bg-primary/90'
                      : 'border border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                  style={plan.popular ? {boxShadow: '0 4px 20px rgba(43,108,238,0.3)'} : {}}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Ready to scale your outbound?</h2>
          <p className="text-slate-500 text-lg mb-10">Join thousands of sales teams using VoiceAI to automate and supercharge their outbound calling.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="px-8 py-4 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all" style={{boxShadow: '0 8px 30px rgba(43,108,238,0.4)'}}>
              Start Free Trial
            </Link>
            <Link href="/contact" className="px-8 py-4 rounded-2xl border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/5 transition-all">
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
