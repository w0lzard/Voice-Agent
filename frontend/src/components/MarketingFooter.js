import Link from 'next/link';

export default function MarketingFooter() {
  return (
    <footer className="border-t border-white/5 py-16" style={{background: '#0a0e17'}}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-9 bg-primary rounded-xl flex items-center justify-center" style={{boxShadow: '0 0 16px rgba(43,108,238,0.4)'}}>
                <span className="material-symbols-outlined text-white text-[18px]">graphic_eq</span>
              </div>
              <span className="text-slate-100 font-bold text-base">VoiceAI</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
              AI-powered voice calling platform for modern sales teams. Make smarter outbound calls at scale.
            </p>
          </div>
          {/* Product */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-4">Product</p>
            <div className="space-y-2.5">
              {[['Features', '/features'], ['Pricing', '/pricing'], ['Use Cases', '/use-cases'], ['Demo', '/demo']].map(([label, href]) => (
                <Link key={href} href={href} className="block text-sm text-slate-500 hover:text-slate-300 transition-colors">{label}</Link>
              ))}
            </div>
          </div>
          {/* Company */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-4">Company</p>
            <div className="space-y-2.5">
              {[['About', '/about'], ['Contact', '/contact'], ['Login', '/login'], ['Sign Up', '/signup']].map(([label, href]) => (
                <Link key={href} href={href} className="block text-sm text-slate-500 hover:text-slate-300 transition-colors">{label}</Link>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-700">© {new Date().getFullYear()} VoiceAI Platform. All rights reserved.</p>
          <div className="flex gap-6">
            {['Privacy Policy', 'Terms of Service'].map(label => (
              <span key={label} className="text-xs text-slate-700 hover:text-slate-500 transition-colors cursor-pointer">{label}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
