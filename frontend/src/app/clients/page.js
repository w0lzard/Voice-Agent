'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchClients, fetchTranscript } from '../../lib/api';

function TranscriptModal({ isOpen, onClose, clientPhone, transcriptText, loading }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="rounded-2xl border border-white/8 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]" style={{background: '#151c2a'}}>
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">description</span>
            Transcript
            <span className="text-sm font-normal text-slate-500 ml-1">{clientPhone}</span>
          </h3>
          <button onClick={onClose} className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar" style={{background: 'rgba(255,255,255,0.02)'}}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <span className="material-symbols-outlined text-4xl mb-2 animate-spin text-primary">refresh</span>
              <p className="text-sm">Loading transcript...</p>
            </div>
          ) : transcriptText ? (
            <pre className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">{transcriptText}</pre>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <span className="material-symbols-outlined text-4xl mb-2 text-slate-700">speaker_notes_off</span>
              <p className="text-sm">No transcript available.</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-white/8 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 border border-white/8 hover:bg-white/5 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientsManagementPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);
  const [selectedClientPhone, setSelectedClientPhone] = useState(null);
  const [transcriptText, setTranscriptText] = useState('');
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    async function getClients() {
      try {
        setLoading(true);
        const res = await fetchClients(page, 20);
        if (isMounted && res.ok) {
          setClients(res.data || []);
          setTotalPages(res.total ? Math.ceil(res.total / 20) : 1);
        }
      } catch {}
      finally { if (isMounted) setLoading(false); }
    }
    getClients();
    return () => { isMounted = false; };
  }, [page]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setActiveDropdown(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleViewTranscript = async (client) => {
    setActiveDropdown(null);
    setSelectedClientPhone(client.phoneNumber);
    setTranscriptText('');
    setIsTranscriptModalOpen(true);
    setIsTranscriptLoading(true);
    try {
      if (!client.lastCallId) { setTranscriptText(null); return; }
      const res = await fetchTranscript(client.lastCallId);
      setTranscriptText(res?.parsed?.text || null);
    } catch {
      setTranscriptText('Error loading transcript.');
    } finally {
      setIsTranscriptLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Campaign Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Contact directory with call history and interactions</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/8 text-slate-300 text-sm font-medium hover:bg-white/5 transition-all">
          <span className="material-symbols-outlined text-base">download</span>
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/8 overflow-hidden" style={{background: 'rgba(255,255,255,0.03)'}}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">contacts</span>
            Contact Directory
          </h3>
          <span className="text-xs text-slate-600">{clients.length} contacts</span>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <div className="inline-flex items-center gap-2 text-slate-500 text-sm">
              <span className="material-symbols-outlined animate-spin text-primary">refresh</span>
              Loading contacts...
            </div>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <span className="material-symbols-outlined text-4xl text-slate-700">contact_page</span>
            <p className="text-slate-500 text-sm">No contacts found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Contact', 'Total Calls', 'Total Duration', 'Last Interaction', 'Actions'].map(h => (
                    <th key={h} className={`px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-600 ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((client, idx) => {
                  const durationMins = Math.floor(client.totalDuration / 60);
                  const durationSecs = client.totalDuration % 60;
                  const initials = (client.phoneNumber || '??').replace(/\D/g, '').slice(-2);
                  return (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold">
                            {initials}
                          </div>
                          <span className="text-sm font-mono text-slate-300">{client.phoneNumber}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm font-bold text-slate-300 bg-white/5 px-2.5 py-0.5 rounded-lg">{client.totalCalls}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-400">
                        {durationMins > 0 ? `${durationMins}m ` : ''}{durationSecs}s
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {client.lastCall ? new Date(client.lastCall).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="px-5 py-3 text-right relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === idx ? null : idx); }}
                          className="size-7 rounded-lg flex items-center justify-center ml-auto text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
                        >
                          <span className="material-symbols-outlined text-base">more_vert</span>
                        </button>
                        {activeDropdown === idx && (
                          <div
                            ref={dropdownRef}
                            className="absolute right-8 top-10 w-44 rounded-xl border border-white/8 py-1 z-20 shadow-xl text-left"
                            style={{background: '#1a2236'}}
                          >
                            <button
                              onClick={() => handleViewTranscript(client)}
                              className="w-full px-4 py-2.5 text-sm text-slate-300 hover:text-slate-100 hover:bg-white/5 flex items-center gap-2 transition-colors"
                            >
                              <span className="material-symbols-outlined text-base">description</span>
                              View Transcript
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
          <span className="text-xs text-slate-600">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="size-7 rounded-lg flex items-center justify-center border border-white/8 text-slate-400 hover:text-slate-200 hover:bg-white/5 disabled:opacity-30 transition-all">
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="size-7 rounded-lg flex items-center justify-center border border-white/8 text-slate-400 hover:text-slate-200 hover:bg-white/5 disabled:opacity-30 transition-all">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      <TranscriptModal
        isOpen={isTranscriptModalOpen}
        onClose={() => setIsTranscriptModalOpen(false)}
        clientPhone={selectedClientPhone}
        transcriptText={transcriptText}
        loading={isTranscriptLoading}
      />
    </div>
  );
}
