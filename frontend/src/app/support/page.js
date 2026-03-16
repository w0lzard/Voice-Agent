'use client';

import { useState } from 'react';

const FAQS = [
  {
    q: 'Why are calls not starting immediately?',
    a: 'Most delays are queue-related or provider retries. Check active campaign limits and available concurrent capacity in your dashboard.'
  },
  {
    q: 'How do I verify backend connectivity?',
    a: 'Open your backend health endpoint and confirm 200 status. Then verify NEXT_PUBLIC_API_BASE points to the same environment.'
  },
  {
    q: 'Can I monitor transcripts live?',
    a: 'Yes. Use the Real-Time Dashboard where transcripts stream for active calls once WebSocket is connected.'
  },
  {
    q: 'How do I rotate API credentials safely?',
    a: 'Create a new credential, update environment variables, redeploy, and revoke old keys after validating call flow.'
  },
  {
    q: 'What happens when my balance runs out?',
    a: 'Calls will be paused. You can top up from the Wallet page and enable auto-reload to prevent interruptions.'
  },
];

const CHANNELS = [
  {
    icon: 'chat',
    title: 'Live Chat',
    desc: 'Chat with engineering support for deployment and runtime incidents.',
    action: 'Start Chat',
    href: 'mailto:support@voiceai.app?subject=Live%20Support%20Request',
    accent: 'primary',
  },
  {
    icon: 'mail',
    title: 'Email Support',
    desc: 'Share logs and stack traces for deep-dive investigations.',
    action: 'support@voiceai.app',
    href: 'mailto:support@voiceai.app',
    accent: 'cyan',
  },
  {
    icon: 'phone_in_talk',
    title: 'On-Call Line',
    desc: 'For urgent production incidents requiring immediate callback.',
    action: '+91 80 4000 1122',
    href: 'tel:+918040001122',
    accent: 'purple',
  },
];

export default function SupportPage() {
  const [openIndex, setOpenIndex] = useState(0);

  const accentMap = {
    primary: { bg: 'bg-primary/10', text: 'text-primary', btn: 'bg-primary hover:bg-primary/90' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', btn: 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-white' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', btn: 'bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white' },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Help & Support</h1>
          <p className="text-sm text-slate-500 mt-0.5">Troubleshoot and get assistance for your VoiceAI platform</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Priority Support Enabled</span>
        </div>
      </div>

      {/* Support Channels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {CHANNELS.map(ch => {
          const a = accentMap[ch.accent];
          return (
            <div key={ch.title} className="rounded-2xl border border-white/8 p-5 space-y-4" style={{background: 'rgba(255,255,255,0.03)'}}>
              <div className={`size-11 rounded-xl flex items-center justify-center ${a.bg}`}>
                <span className={`material-symbols-outlined text-xl ${a.text}`}>{ch.icon}</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 mb-1">{ch.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{ch.desc}</p>
              </div>
              <a
                href={ch.href}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  ch.accent === 'primary'
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : a.btn
                }`}
                style={ch.accent === 'primary' ? {boxShadow: '0 4px 14px rgba(43,108,238,0.3)'} : {}}
              >
                {ch.action}
              </a>
            </div>
          );
        })}
      </div>

      {/* FAQs */}
      <div className="rounded-2xl border border-white/8 overflow-hidden" style={{background: 'rgba(255,255,255,0.03)'}}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">help</span>
            Frequently Asked Questions
          </h3>
          <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-full uppercase">{FAQS.length} articles</span>
        </div>
        <div className="divide-y divide-white/5">
          {FAQS.map((item, i) => {
            const isOpen = i === openIndex;
            return (
              <button
                key={item.q}
                onClick={() => setOpenIndex(isOpen ? -1 : i)}
                className="w-full text-left px-5 py-4 hover:bg-white/2 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className={`text-sm font-semibold transition-colors ${isOpen ? 'text-primary' : 'text-slate-200'}`}>
                    {item.q}
                  </span>
                  <span className={`material-symbols-outlined text-base shrink-0 transition-transform text-slate-500 ${isOpen ? 'rotate-180 text-primary' : ''}`}>
                    expand_more
                  </span>
                </div>
                {isOpen && (
                  <p className="text-sm text-slate-400 mt-3 leading-relaxed pr-8">
                    {item.a}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="rounded-2xl border border-white/8 p-5" style={{background: 'linear-gradient(135deg, rgba(43,108,238,0.05), rgba(139,92,246,0.03))'}}>
        <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base">lightbulb</span>
          Quick Tips
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { icon: 'refresh', tip: 'Try refreshing the page if WebSocket disconnects' },
            { icon: 'settings', tip: 'Check env vars if the backend returns 500 errors' },
            { icon: 'account_balance_wallet', tip: 'Enable auto-reload to prevent call interruptions' },
          ].map(t => (
            <div key={t.tip} className="flex items-start gap-3 rounded-xl border border-white/5 p-3" style={{background: 'rgba(255,255,255,0.02)'}}>
              <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-[14px]">{t.icon}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{t.tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
