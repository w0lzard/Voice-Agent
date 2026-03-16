'use client';
import { useState } from 'react';
import MarketingNavbar from '@/components/MarketingNavbar';
import MarketingFooter from '@/components/MarketingFooter';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '', reason: 'sales' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen" style={{background: '#0a0e17', fontFamily: '"Space Grotesk", sans-serif'}}>
      <MarketingNavbar />

      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-15 pointer-events-none" style={{background: 'radial-gradient(circle, rgba(43,108,238,0.5) 0%, transparent 70%)'}}></div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4">Contact Us</p>
            <h1 className="text-5xl font-black text-white mb-4">Let&apos;s talk</h1>
            <p className="text-slate-500 text-lg">Whether you need a demo, have questions, or want a custom plan — we&apos;re here.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact info */}
            <div className="space-y-5">
              {[
                { icon: 'mail', title: 'Email Us', value: 'hello@voiceai.app', desc: 'For general inquiries and demos' },
                { icon: 'support_agent', title: 'Sales', value: 'sales@voiceai.app', desc: 'Custom plans and enterprise' },
                { icon: 'help', title: 'Support', value: 'support@voiceai.app', desc: 'Technical support and billing' },
              ].map(item => (
                <div key={item.title} className="rounded-2xl border border-white/8 p-5" style={{background: 'rgba(255,255,255,0.02)'}}>
                  <div className="flex items-start gap-3">
                    <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-base">{item.icon}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">{item.title}</p>
                      <p className="text-sm font-semibold text-slate-200">{item.value}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              {submitted ? (
                <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-12 text-center">
                  <div className="size-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-emerald-400 text-3xl">check_circle</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">Message Sent!</h3>
                  <p className="text-slate-500">We&apos;ll get back to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="rounded-3xl border border-white/8 p-8 space-y-5" style={{background: 'rgba(255,255,255,0.02)'}}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {[
                      { label: 'Full Name', key: 'name', type: 'text', placeholder: 'John Doe', required: true },
                      { label: 'Work Email', key: 'email', type: 'email', placeholder: 'you@company.com', required: true },
                    ].map(field => (
                      <div key={field.key}>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">{field.label}</label>
                        <input
                          type={field.type}
                          required={field.required}
                          value={form[field.key]}
                          onChange={e => setForm({...form, [field.key]: e.target.value})}
                          placeholder={field.placeholder}
                          className="w-full px-4 py-3 rounded-xl text-sm border border-white/8 text-slate-300 placeholder-slate-700 focus:outline-none focus:border-primary/40 transition-colors"
                          style={{background: 'rgba(255,255,255,0.04)'}}
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Company</label>
                    <input
                      type="text"
                      value={form.company}
                      onChange={e => setForm({...form, company: e.target.value})}
                      placeholder="Acme Corp"
                      className="w-full px-4 py-3 rounded-xl text-sm border border-white/8 text-slate-300 placeholder-slate-700 focus:outline-none focus:border-primary/40 transition-colors"
                      style={{background: 'rgba(255,255,255,0.04)'}}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Reason</label>
                    <select
                      value={form.reason}
                      onChange={e => setForm({...form, reason: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl text-sm border border-white/8 text-slate-300 focus:outline-none focus:border-primary/40 transition-colors"
                      style={{background: 'rgba(255,255,255,0.04)'}}
                    >
                      <option value="sales">Sales inquiry</option>
                      <option value="demo">Request a demo</option>
                      <option value="enterprise">Enterprise / custom plan</option>
                      <option value="support">Technical support</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Message</label>
                    <textarea
                      required
                      rows={4}
                      value={form.message}
                      onChange={e => setForm({...form, message: e.target.value})}
                      placeholder="Tell us about your use case and team size..."
                      className="w-full px-4 py-3 rounded-xl text-sm border border-white/8 text-slate-300 placeholder-slate-700 focus:outline-none focus:border-primary/40 transition-colors resize-none"
                      style={{background: 'rgba(255,255,255,0.04)'}}
                    />
                  </div>
                  <button type="submit" className="w-full py-3.5 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all" style={{boxShadow: '0 4px 20px rgba(43,108,238,0.3)'}}>
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
