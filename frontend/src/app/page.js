'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import MarketingNavbar from '@/components/MarketingNavbar';
import MarketingFooter from '@/components/MarketingFooter';

const FEATURES = [
  {
    icon: 'contact_support',
    title: 'Lead Qualification',
    desc: 'Instantly call new leads from your site or Zillow to qualify their intent, timeline, and budget within seconds of signup.',
    color: 'text-accent-blue',
    bg: 'bg-blue-500/10',
    hoverBg: 'hover:bg-blue-500/20',
  },
  {
    icon: 'calendar_month',
    title: 'Appointment Booking',
    desc: 'Directly syncs with your Google Calendar or Outlook to book house viewings and consultations without a single email.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    hoverBg: 'hover:bg-purple-500/20',
  },
  {
    icon: 'history',
    title: 'Auto Follow-up',
    desc: 'Persistent, polite follow-ups on dead leads or cold prospects until they are ready to talk to a human agent.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    hoverBg: 'hover:bg-cyan-500/20',
  },
];

const HOW_IT_WORKS = [
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

const INTEGRATIONS = [
  { icon: 'cloud', label: 'Salesforce', color: 'text-blue-400' },
  { icon: 'hub', label: 'HubSpot', color: 'text-primary' },
  { icon: 'diversity_3', label: 'Follow Up Boss', color: 'text-purple-400' },
  { icon: 'home_pin', label: 'Zillow', color: 'text-cyan-400' },
  { icon: 'database', label: 'KVCore', color: 'text-slate-300' },
];

const PLANS = [
  {
    name: 'Individual',
    price: '$99',
    period: '/mo',
    features: ['500 Minutes Included', '1 AI Agent persona', 'Zapier Integration', 'Email Support'],
    cta: 'Choose Plan',
    popular: false,
    href: '/signup',
  },
  {
    name: 'Team',
    price: '$299',
    period: '/mo',
    features: ['2,500 Minutes Included', '5 AI Agent personas', 'Direct CRM Integrations', 'Priority 24/7 Support'],
    cta: 'Choose Plan',
    popular: true,
    href: '/signup',
  },
  {
    name: 'Brokerage',
    price: '$899',
    period: '/mo',
    features: ['Unlimited Minutes', 'Unlimited AI Agents', 'White-label Branding', 'Dedicated Account Manager'],
    cta: 'Contact Sales',
    popular: false,
    href: '/contact',
  },
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
    <div className="min-h-screen bg-[#020617] text-slate-100 overflow-x-hidden" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
      <MarketingNavbar />

      {/* Hero */}
      <section className="relative pt-40 pb-20 px-6" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(43,108,238,0.15) 0%, transparent 60%)' }}>
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          {/* Left */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Next-Gen Real Estate AI</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-[1.1] mb-8" style={{ background: 'linear-gradient(to right, #fff, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              AI Voice Agents That Call Your Real Estate Leads{' '}
              <span style={{ WebkitTextFillColor: '#2b6cee', color: '#2b6cee' }}>Intelligently</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
              Automate lead qualification, appointment booking, and customer follow-ups with human-like AI voice agents that never sleep.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link href="/signup" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-lg transition-all" style={{ boxShadow: '0 8px 30px rgba(43,108,238,0.4)' }}>
                Start Free Trial <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <Link href="/demo" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
                Book Demo <span className="material-symbols-outlined">videocam</span>
              </Link>
            </div>
            <div className="mt-10 flex items-center justify-center lg:justify-start gap-4 text-slate-500 text-sm">
              <div className="flex -space-x-2">
                <div className="size-8 rounded-full border-2 border-[#020617] bg-slate-800"></div>
                <div className="size-8 rounded-full border-2 border-[#020617] bg-slate-700"></div>
                <div className="size-8 rounded-full border-2 border-[#020617] bg-slate-600"></div>
              </div>
              <span>Joined by 2,000+ top-producing agents</span>
            </div>
          </div>

          {/* Right — Live AI Demo Card */}
          <div className="flex-1 w-full max-w-2xl">
            <div className="relative group overflow-hidden p-8 rounded-[2rem]" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem]"></div>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-full bg-primary flex items-center justify-center" style={{ boxShadow: '0 8px 24px rgba(43,108,238,0.4)' }}>
                    <span className="material-symbols-outlined text-white">graphic_eq</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Live AI Demo</h3>
                    <p className="text-xs text-slate-400">Press play to hear the AI in action</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-md bg-green-500/10 text-green-500 text-xs font-bold uppercase">Online</span>
              </div>
              <div className="bg-black/40 rounded-2xl p-6 border border-white/5 mb-6">
                <div className="flex items-end justify-center gap-1.5 h-24 mb-6">
                  {[32, 48, 80, 64, 96, 72, 48, 32].map((h, i) => (
                    <div key={i} className="w-2 rounded-full bg-primary" style={{ height: `${h}px`, opacity: 0.4 + i * 0.08 }}></div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>00:12</span>
                  <div className="flex-1 mx-4 h-1 bg-white/10 rounded-full relative">
                    <div className="absolute left-0 top-0 h-full w-1/3 bg-primary rounded-full"></div>
                  </div>
                  <span>02:45</span>
                </div>
              </div>
              <button className="w-full p-4 rounded-xl flex items-center justify-center gap-3 transition-colors font-bold" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="material-symbols-outlined fill-1">play_arrow</span>
                <span>Hear Example: Seller Lead Qualifying</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6" style={{ background: 'rgba(148,163,184,0.03)' }} id="features">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-6">Tailored for Real Estate</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Specific workflows built to handle the complexities of property transactions and lead management.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map(f => (
              <div key={f.title} className="p-10 rounded-3xl group hover:-translate-y-2 transition-transform" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className={`size-16 rounded-2xl flex items-center justify-center mb-8 ${f.bg} transition-colors`}>
                  <span className={`material-symbols-outlined text-3xl ${f.color}`}>{f.icon}</span>
                </div>
                <h3 className="text-2xl font-bold mb-4">{f.title}</h3>
                <p className="text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6" id="how-it-works">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-20 items-center">
            {/* Steps */}
            <div className="flex-1 order-2 lg:order-1 space-y-12">
              {HOW_IT_WORKS.map(step => (
                <div key={step.num} className="flex gap-6">
                  <div className="shrink-0 size-12 rounded-full border border-primary text-primary flex items-center justify-center font-bold text-xl">
                    {step.num}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2 text-white">{step.title}</h4>
                    <p className="text-slate-400">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Dashboard mockup */}
            <div className="flex-1 order-1 lg:order-2">
              <div className="relative">
                <div className="absolute -inset-4 blur-3xl rounded-full" style={{ background: 'rgba(59,130,246,0.1)' }}></div>
                <div className="relative p-4 rounded-[2.5rem] shadow-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="bg-[#020617]/80 rounded-[2rem] p-8">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="size-3 rounded-full bg-red-500"></div>
                      <div className="size-3 rounded-full bg-yellow-500"></div>
                      <div className="size-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="space-y-4">
                      <div className="h-4 bg-white/5 rounded-full w-3/4"></div>
                      <div className="h-4 bg-white/5 rounded-full w-1/2"></div>
                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="h-24 rounded-2xl p-4" style={{ background: 'rgba(43,108,238,0.1)', border: '1px solid rgba(43,108,238,0.2)' }}>
                          <div className="text-[10px] text-primary font-bold mb-1 uppercase">Calls Today</div>
                          <div className="text-2xl font-black text-white">142</div>
                        </div>
                        <div className="h-24 rounded-2xl p-4" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                          <div className="text-[10px] text-blue-400 font-bold mb-1 uppercase">Appts Set</div>
                          <div className="text-2xl font-black text-white">18</div>
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-slate-300">Live Conversation Analysis</span>
                          <span className="text-[10px] text-green-500 font-bold uppercase">Active</span>
                        </div>
                        <div className="space-y-2">
                          <div className="h-2 bg-primary/20 rounded-full w-full"></div>
                          <div className="h-2 bg-primary/20 rounded-full w-4/5"></div>
                          <div className="h-2 bg-primary/20 rounded-full w-2/3"></div>
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

      {/* Integrations */}
      <section className="py-24 px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }} id="integrations">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="text-2xl font-bold text-slate-400 mb-12">Seamlessly Integrates With Your Stack</h3>
          <div className="flex flex-wrap justify-center gap-12 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
            {INTEGRATIONS.map(item => (
              <div key={item.label} className="flex items-center gap-3 font-bold text-xl">
                <span className={`material-symbols-outlined ${item.color}`}>{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="relative overflow-hidden text-center p-12 md:p-20 rounded-[3rem]" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="absolute top-0 right-0 p-10 opacity-10">
              <span className="material-symbols-outlined" style={{ fontSize: '10rem' }}>format_quote</span>
            </div>
            <div className="max-w-3xl mx-auto">
              <div className="flex justify-center gap-1 mb-8">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="material-symbols-outlined text-primary fill-1">star</span>
                ))}
              </div>
              <p className="text-3xl md:text-4xl font-bold italic leading-relaxed text-white mb-10">
                &ldquo;The AI calling agent qualified three seller leads and booked two listing appointments in its first week. It pays for itself 10x over every single month.&rdquo;
              </p>
              <div className="flex items-center justify-center gap-4">
                <div className="size-16 rounded-full bg-slate-800 border-2 border-white/10"></div>
                <div className="text-left">
                  <h5 className="font-bold text-xl">Marcus Thorne</h5>
                  <p className="text-slate-400">Director at Thorne Realty Group</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6" id="pricing">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-400">Only pay for what you use. Scale as your agency grows.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PLANS.map(plan => (
              <div key={plan.name} className="p-10 rounded-3xl relative" style={plan.popular ? { background: 'rgba(255,255,255,0.03)', border: '2px solid rgba(43,108,238,0.5)', backdropFilter: 'blur(12px)' } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest">
                    Most Popular
                  </div>
                )}
                <h4 className="text-lg font-bold text-slate-400 mb-2">{plan.name}</h4>
                <div className="text-4xl font-black mb-6">
                  {plan.price}<span className="text-base font-normal text-slate-500">{plan.period}</span>
                </div>
                <ul className="space-y-4 mb-10">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>check</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href} className={`block w-full text-center py-4 rounded-xl font-bold transition-all ${plan.popular ? 'bg-primary text-white hover:bg-primary/90' : 'border border-white/10 hover:bg-white/5 text-white'}`} style={plan.popular ? { boxShadow: '0 4px 20px rgba(43,108,238,0.3)' } : {}}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
