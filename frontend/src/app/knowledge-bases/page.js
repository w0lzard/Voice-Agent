'use client';
import { useState, useEffect } from 'react';
import { fetchDocuments, deleteDocument } from '../../lib/api';
import UploadModal from '../../components/UploadModal';

const CATEGORIES = [
  { id: 'All Documents', icon: 'folder_open' },
  { id: 'Property Listings', icon: 'home_work' },
  { id: 'Scripts & FAQs', icon: 'description' },
  { id: 'Legal & Contracts', icon: 'gavel' },
];

export default function KnowledgeBasePage() {
  const [activeCategory, setActiveCategory] = useState('All Documents');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'agent', text: "Hi! I've processed your latest documents. Ask me anything about what I know.", time: '10:24 AM' }
  ]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState(null);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetchDocuments(activeCategory);
      setDocuments(res.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadDocuments(); }, [activeCategory]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this document?')) return;
    try {
      await deleteDocument(id);
      setDocuments(prev => prev.filter(d => d._id !== id));
    } catch { alert('Failed to delete document'); }
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user', text: chatInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        role: 'agent',
        text: 'I found matching references in your uploaded documents. Would you like me to summarize?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 900);
  };

  const categoryCounts = CATEGORIES.map(c => ({
    ...c,
    count: c.id === 'All Documents' ? documents.length : documents.filter(d => d.category === c.id).length
  }));

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar */}
      <aside className="w-56 border-r border-white/5 flex flex-col gap-5 p-4 shrink-0" style={{background: '#0a0e17'}}>
        <div className="space-y-2">
          <button
            onClick={() => { setUploadType('pdf'); setIsUploadModalOpen(true); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
            style={{boxShadow: '0 4px 14px rgba(43,108,238,0.25)'}}
          >
            <span className="material-symbols-outlined text-base">upload_file</span>
            Upload PDFs
          </button>
          <button
            onClick={() => { setUploadType('url'); setIsUploadModalOpen(true); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-white/8 text-slate-300 text-sm font-medium hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined text-base">link</span>
            Sync Website URL
          </button>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2 px-1">Categories</p>
          <nav className="space-y-0.5">
            {categoryCounts.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${
                  activeCategory === cat.id
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
                  <span className="text-xs">{cat.id}</span>
                </div>
                {cat.count > 0 && (
                  <span className="text-[10px] font-bold bg-white/8 px-1.5 py-0.5 rounded-full text-slate-500">{cat.count}</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto">
          <div className="rounded-xl border border-white/8 p-3" style={{background: 'rgba(255,255,255,0.03)'}}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">Storage</p>
            <div className="h-1.5 rounded-full bg-white/5 mb-1.5">
              <div className="h-1.5 rounded-full bg-primary" style={{width: '75%'}}></div>
            </div>
            <p className="text-[10px] text-slate-500">750 MB / 1 GB (75%)</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-base font-bold text-slate-100">Learned Documents</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeCategory === 'All Documents' ? 'Manage resources your AI agent uses to answer queries.' : `Viewing: ${activeCategory}`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <span className="material-symbols-outlined animate-spin text-primary">refresh</span>
              Loading documents...
            </div>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-white/8 rounded-2xl text-center">
            <span className="material-symbols-outlined text-4xl text-slate-700 mb-3">inventory_2</span>
            <p className="text-slate-400 text-sm font-medium mb-1">No documents found</p>
            <p className="text-xs text-slate-600">Upload PDFs or sync a website URL</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/8 overflow-hidden" style={{background: 'rgba(255,255,255,0.03)'}}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Document', 'Type', 'Status', 'Added', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc._id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`size-8 rounded-lg flex items-center justify-center ${
                          doc.type === 'Website URL' ? 'bg-blue-500/10' : 'bg-rose-500/10'
                        }`}>
                          <span className={`material-symbols-outlined text-[16px] ${
                            doc.type === 'Website URL' ? 'text-blue-400' : 'text-rose-400'
                          }`}>
                            {doc.type === 'Website URL' ? 'language' : 'picture_as_pdf'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">{doc.title}</p>
                          <p className="text-[10px] text-slate-600">
                            {doc.type === 'Website URL' ? `${doc.pages} pages` : `${Math.round(doc.sizeBytes / 1024)} KB · ${doc.pages} pages`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 text-slate-400">{doc.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`size-1.5 rounded-full ${
                          doc.status === 'Ready' ? 'bg-emerald-500' :
                          doc.status === 'Processing' ? 'bg-primary animate-pulse' : 'bg-slate-500'
                        }`}></span>
                        <span className={`text-[10px] font-medium ${
                          doc.status === 'Ready' ? 'text-emerald-400' :
                          doc.status === 'Processing' ? 'text-primary' : 'text-slate-500'
                        }`}>{doc.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-slate-500">
                      {new Date(doc.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(doc._id)} className="size-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Right: Test Chat */}
      <aside className="w-72 border-l border-white/5 flex flex-col shrink-0" style={{background: '#0a0e17'}}>
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-200">Test Knowledge</h3>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full uppercase">Live</span>
          </div>
          <p className="text-xs text-slate-500">Verify what the AI knows from your documents.</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : ''}`}>
              <div className={`px-3 py-2 rounded-xl max-w-[90%] ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-tr-none text-xs'
                  : 'border border-white/8 text-slate-300 rounded-tl-none text-xs'
              }`} style={msg.role === 'agent' ? {background: 'rgba(255,255,255,0.05)'} : {}}>
                {msg.text}
              </div>
              <p className={`text-[10px] text-slate-600 ${msg.role === 'user' ? 'mr-1' : 'ml-1'}`}>
                {msg.role === 'user' ? 'You' : 'AI'} · {msg.time}
              </p>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/5">
          <form onSubmit={handleChatSubmit} className="relative">
            <textarea
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(e); } }}
              className="w-full rounded-xl text-xs py-2.5 pl-3 pr-9 resize-none focus:outline-none focus:border-primary/40 transition-all border border-white/8 text-slate-300 placeholder-slate-600"
              style={{background: 'rgba(255,255,255,0.05)'}}
              placeholder="Ask a question..."
              rows="2"
            />
            <button type="submit" className="absolute right-2 bottom-2 size-6 bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary/90 transition-colors">
              <span className="material-symbols-outlined text-[14px]">send</span>
            </button>
          </form>
          <div className="flex justify-end mt-2">
            <button onClick={() => setChatMessages([])} className="text-[10px] font-bold text-slate-600 hover:text-rose-400 uppercase transition-colors">Reset</button>
          </div>
        </div>
      </aside>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        type={uploadType}
        onUploadComplete={(newDoc) => {
          if (activeCategory === 'All Documents' || newDoc.category === activeCategory) {
            setDocuments(prev => [newDoc, ...prev]);
          }
        }}
      />
    </div>
  );
}
