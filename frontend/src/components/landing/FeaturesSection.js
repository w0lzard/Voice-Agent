const FEATURES = [
  {
    icon: 'record_voice_over',
    title: 'Human-like AI Voice',
    desc: 'Voices indistinguishable from humans — natural pacing, emotion, and conversational flow that builds instant trust with every caller.',
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    iconBgHover: 'group-hover:bg-blue-500/20',
  },
  {
    icon: 'language',
    title: 'Multilingual at Scale',
    desc: "Speak your customer's language fluently. Deploy agents in 50+ languages and dialects with native-quality pronunciation and cultural nuance.",
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
    iconBgHover: 'group-hover:bg-purple-500/20',
  },
  {
    icon: 'bolt',
    title: 'Real-time Intelligence',
    desc: 'Sub-500ms response latency with live sentiment analysis, dynamic objection handling, and adaptive conversation paths — all in real-time.',
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10',
    iconBgHover: 'group-hover:bg-cyan-500/20',
  },
  {
    icon: 'calendar_month',
    title: 'Automatic Scheduling',
    desc: 'AI syncs with your calendar to book qualified appointments on the spot — no follow-up emails, no back-and-forth, no human effort needed.',
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    iconBgHover: 'group-hover:bg-emerald-500/20',
  },
  {
    icon: 'api',
    title: 'Developer-first API',
    desc: 'REST API, webhooks, and SDKs for every stack. Embed outbound calling into your product in minutes, not months.',
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-500/10',
    iconBgHover: 'group-hover:bg-orange-500/20',
  },
  {
    icon: 'analytics',
    title: 'Conversation Analytics',
    desc: 'Full transcripts, sentiment scores, conversion rates, and call recordings — searchable and exportable from your dashboard.',
    iconColor: 'text-pink-400',
    iconBg: 'bg-pink-500/10',
    iconBgHover: 'group-hover:bg-pink-500/20',
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-24 px-6 bg-slate-900/20" id="features">
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-20">
          <p className="text-primary text-sm font-bold uppercase tracking-widest mb-4">
            Platform Features
          </p>
          <h2 className="text-4xl md:text-5xl font-black mb-6 text-white">
            Everything you need to deploy<br className="hidden md:block" /> AI callers at scale
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
            A complete voice AI stack — from natural language understanding to CRM integration —
            so you can focus on growth, not infrastructure.
          </p>
        </div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(feature => (
            <article
              key={feature.title}
              className="glass rounded-3xl p-8 group hover:-translate-y-2 transition-transform duration-300 cursor-default"
            >
              <div
                className={`w-14 h-14 rounded-2xl ${feature.iconBg} ${feature.iconBgHover} flex items-center justify-center mb-6 transition-colors duration-300`}
              >
                <span
                  className={`material-symbols-outlined ${feature.iconColor} text-2xl`}
                  aria-hidden="true"
                >
                  {feature.icon}
                </span>
              </div>

              <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed text-sm">{feature.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
