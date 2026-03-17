const FEATURES = [
  {
    icon: 'contact_support',
    title: 'Lead Qualification',
    desc: 'Instantly call new leads from your site or Zillow to qualify their intent, timeline, and budget within seconds of signup.',
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    iconBgHover: 'group-hover:bg-blue-500/20',
  },
  {
    icon: 'calendar_month',
    title: 'Appointment Booking',
    desc: 'Directly syncs with your Google Calendar or Outlook to book house viewings and consultations without a single email.',
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
    iconBgHover: 'group-hover:bg-purple-500/20',
  },
  {
    icon: 'history',
    title: 'Auto Follow-up',
    desc: 'Persistent, polite follow-ups on dead leads or cold prospects until they are ready to talk to a human agent.',
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10',
    iconBgHover: 'group-hover:bg-cyan-500/20',
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-24 px-6 bg-slate-900/20" id="features">
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black mb-6 text-white">
            Tailored for Real Estate
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
            Specific workflows built to handle the complexities of property transactions
            and lead management.
          </p>
        </div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURES.map(feature => (
            <article
              key={feature.title}
              className="glass rounded-3xl p-10 group hover:-translate-y-2 transition-transform duration-300 cursor-default"
            >
              {/* Icon */}
              <div
                className={`w-16 h-16 rounded-2xl ${feature.iconBg} ${feature.iconBgHover} flex items-center justify-center mb-8 transition-colors duration-300`}
              >
                <span
                  className={`material-symbols-outlined ${feature.iconColor} text-3xl`}
                  aria-hidden="true"
                >
                  {feature.icon}
                </span>
              </div>

              <h3 className="text-2xl font-bold mb-4 text-white">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
