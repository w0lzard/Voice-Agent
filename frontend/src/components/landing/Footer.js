import Link from 'next/link';

const PRODUCT_LINKS = [
  ['Features', '#features'],
  ['Voices', '#'],
  ['Integrations', '#integrations'],
  ['API Docs', '#'],
];

const COMPANY_LINKS = [
  ['About Us', '/about'],
  ['Careers', '#'],
  ['Blog', '#'],
  ['Privacy', '#'],
];

const SOCIAL_LINKS = [
  { icon: 'public', label: 'Website', href: '#' },
  { icon: 'share', label: 'Social', href: '#' },
  { icon: 'mail', label: 'Email', href: '#' },
];

export default function LandingFooter() {
  return (
    <footer className="py-20 px-6 border-t border-white/5 bg-slate-950">
      <div className="max-w-7xl mx-auto">
        {/* Top grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand column */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
                <span className="material-symbols-outlined text-white text-[18px]" aria-hidden="true">
                  record_voice_over
                </span>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Voice<span className="text-primary">AI</span>
              </span>
            </Link>

            <p className="text-slate-500 max-w-sm mb-8 leading-relaxed text-sm">
              The world&apos;s most advanced AI voice platform designed specifically for the real
              estate industry. Transform how you handle leads.
            </p>

            {/* Social icons */}
            <div className="flex gap-3">
              {SOCIAL_LINKS.map(social => (
                <a
                  key={social.icon}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-full glass flex items-center justify-center text-slate-400 hover:text-white hover:bg-primary/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    {social.icon}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Product links */}
          <div>
            <h5 className="font-bold text-white mb-6 uppercase tracking-widest text-[10px]">
              Product
            </h5>
            <ul className="space-y-4">
              {PRODUCT_LINKS.map(([label, href]) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-slate-500 hover:text-primary transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h5 className="font-bold text-white mb-6 uppercase tracking-widest text-[10px]">
              Company
            </h5>
            <ul className="space-y-4">
              {COMPANY_LINKS.map(([label, href]) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-slate-500 hover:text-primary transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[11px] text-slate-600 font-bold uppercase tracking-widest">
            © {new Date().getFullYear()} VoiceAI Technologies Inc. All rights reserved.
          </p>
          <nav className="flex gap-8" aria-label="Legal links">
            {['Terms of Service', 'Privacy Policy', 'Security'].map(label => (
              <a
                key={label}
                href="#"
                className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors font-bold uppercase tracking-widest"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
