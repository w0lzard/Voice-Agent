const INTEGRATIONS = [
  { icon: 'cloud', label: 'Salesforce', color: 'text-blue-400' },
  { icon: 'hub', label: 'HubSpot', color: 'text-primary' },
  { icon: 'diversity_3', label: 'Follow Up Boss', color: 'text-purple-400' },
  { icon: 'home_pin', label: 'Zillow', color: 'text-cyan-400' },
  { icon: 'database', label: 'KVCore', color: 'text-slate-300' },
];

export default function IntegrationsSection() {
  return (
    <section
      className="py-24 px-6 border-y border-white/5 bg-white/[0.02]"
      id="integrations"
    >
      <div className="max-w-7xl mx-auto text-center">
        <h3 className="text-2xl font-bold text-slate-400 mb-12">
          Seamlessly Integrates With Your Stack
        </h3>

        {/* Integration logos — grayscale until hover */}
        <div className="flex flex-wrap justify-center gap-10 md:gap-16 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
          {INTEGRATIONS.map(item => (
            <div
              key={item.label}
              className="flex items-center gap-3 font-bold text-xl text-white"
            >
              <span
                className={`material-symbols-outlined ${item.color}`}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
