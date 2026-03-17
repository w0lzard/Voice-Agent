import Link from 'next/link';

const PLANS = [
  {
    name: 'Individual',
    price: '$99',
    period: '/mo',
    features: [
      '500 Minutes Included',
      '1 AI Agent persona',
      'Zapier Integration',
      'Email Support',
    ],
    cta: 'Choose Plan',
    popular: false,
    href: '/signup',
  },
  {
    name: 'Team',
    price: '$299',
    period: '/mo',
    features: [
      '2,500 Minutes Included',
      '5 AI Agent personas',
      'Direct CRM Integrations',
      'Priority 24/7 Support',
    ],
    cta: 'Choose Plan',
    popular: true,
    href: '/signup',
  },
  {
    name: 'Brokerage',
    price: '$899',
    period: '/mo',
    features: [
      'Unlimited Minutes',
      'Unlimited AI Agents',
      'White-label Branding',
      'Dedicated Account Manager',
    ],
    cta: 'Contact Sales',
    popular: false,
    href: '/contact',
  },
];

export default function PricingSection() {
  return (
    <section className="py-24 px-6 relative overflow-hidden" id="pricing">
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-white">
            Simple, Transparent Pricing
          </h2>
          <p className="text-slate-400 text-lg">
            Only pay for what you use. Scale as your agency grows.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`glass rounded-3xl p-10 relative ${
                plan.popular
                  ? 'border-2 border-primary/50 shadow-2xl shadow-primary/10 -mt-4 md:-mt-6'
                  : 'border border-white/5'
              }`}
            >
              {/* Most Popular badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest whitespace-nowrap">
                  Most Popular
                </div>
              )}

              <h4 className="text-lg font-bold text-slate-400 mb-2">{plan.name}</h4>
              <div className="text-4xl font-black text-white mb-6">
                {plan.price}
                <span className="text-base font-normal text-slate-500">{plan.period}</span>
              </div>

              <ul className="space-y-4 mb-10">
                {plan.features.map(feature => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-slate-200">
                    <span
                      className="material-symbols-outlined text-primary text-[20px] shrink-0"
                      aria-hidden="true"
                    >
                      check
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`block w-full text-center py-4 rounded-xl font-bold transition-all ${
                  plan.popular
                    ? 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'
                    : 'border border-white/10 text-white hover:bg-white/5'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
