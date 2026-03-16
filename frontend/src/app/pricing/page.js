import Link from 'next/link';
import MarketingNavbar from '@/components/MarketingNavbar';
import MarketingFooter from '@/components/MarketingFooter';

const PLANS = [
  {
    name: 'Starter',
    price: '$49',
    period: '/month',
    desc: 'Perfect for small teams getting started with AI calling.',
    features: ['500 AI call minutes/mo', '2 active voice agents', 'Basic analytics dashboard', 'CSV contact upload', 'Email support', '14-day free trial'],
    cta: 'Start Free Trial',
    href: '/signup',
    popular: false,
  },
  {
    name: 'Growth',
    price: '$149',
    period: '/month',
    desc: 'For growing teams that need more power and flexibility.',
    features: ['2,500 AI call minutes/mo', '10 active voice agents', 'Advanced analytics & reports', 'A/B script testing', 'API access', 'Priority email & chat support', 'Custom voices', 'Live call monitoring'],
    cta: 'Get Started',
    href: '/signup',
    popular: true,
  },
  {
    name: 'Scale',
    price: '$399',
    period: '/month',
    desc: 'For high-volume teams with serious outbound needs.',
    features: ['10,000 AI call minutes/mo', 'Unlimited voice agents', 'Full analytics suite', 'Dedicated account manager', 'Webhook integrations', 'Custom compliance tools', 'White-label option', 'SLA guarantee'],
    cta: 'Get Started',
    href: '/signup',
    popular: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'Tailored solutions for large organizations with complex needs.',
    features: ['Unlimited AI call minutes', 'Unlimited agents & workspaces', 'Custom AI model training', 'SSO & advanced security', 'Dedicated infrastructure', 'Professional services', 'Custom SLA', 'On-premise deployment option'],
    cta: 'Contact Sales',
    href: '/contact',
    popular: false,
  },
];

const FAQS = [
  { q: 'What counts as an AI call minute?', a: 'One minute of active AI conversation time. Hold time and ring time are not counted.' },
  { q: 'Can I change plans anytime?', a: 'Yes, upgrade or downgrade at any time. Changes take effect at the start of your next billing cycle.' },
  { q: 'Is there a setup fee?', a: 'No. All plans include free onboarding and setup support. You only pay your monthly subscription.' },
  { q: 'What happens if I exceed my minute limit?', a: 'You\'ll be notified at 80% usage. Overages are billed at $0.08/minute, or you can upgrade anytime.' },
  { q: 'Do you offer annual billing?', a: 'Yes! Annual billing saves you 20%. Contact sales or select annual in your billing settings after signup.' },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen" style={{background: '#0a0e17', fontFamily: '"Space Grotesk", sans-serif'}}>
      <MarketingNavbar />

      {/* Hero */}
      <section className="pt-40 pb-16 px-6 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-15 pointer-events-none" style={{background: 'radial-gradient(circle, rgba(43,108,238,0.5) 0%, transparent 70%)'}}></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4">Pricing</p>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6">Simple, transparent pricing</h1>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">Start free. Pay as you grow. No hidden fees, no contracts.</p>
        </div>
      </section>

      {/* Plans */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {PLANS.map(plan => (
            <div key={plan.name} className={`rounded-3xl border p-8 relative flex flex-col ${plan.popular ? 'border-primary/40' : 'border-white/8'}`} style={plan.popular ? {background: 'rgba(43,108,238,0.06)'} : {background: 'rgba(255,255,255,0.02)'}}>
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-200 mb-1">{plan.name}</h3>
                <p className="text-xs text-slate-600 mb-4">{plan.desc}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  {plan.period && <span className="text-slate-500 text-sm">{plan.period}</span>}
                </div>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-400">
                    <span className="material-symbols-outlined text-emerald-400 text-base mt-0.5 shrink-0">check</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={plan.href}
                className={`w-full block text-center py-3 rounded-2xl text-sm font-bold transition-all ${
                  plan.popular ? 'bg-primary text-white hover:bg-primary/90' : 'border border-white/10 text-slate-300 hover:bg-white/5'
                }`}
                style={plan.popular ? {boxShadow: '0 4px 20px rgba(43,108,238,0.3)'} : {}}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-white text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {FAQS.map(item => (
              <div key={item.q} className="rounded-2xl border border-white/8 p-6" style={{background: 'rgba(255,255,255,0.02)'}}>
                <h3 className="text-sm font-bold text-slate-200 mb-2">{item.q}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
