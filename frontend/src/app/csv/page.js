"use client";
export const runtime = 'edge';
import { useState, useEffect } from 'react';
import { API_BASE, getAuthHeaders } from '../../lib/api';

const SAMPLE_CSV = [
  ['+915550101', 'John Doe', 'john@example.com'],
  ['+915550102', 'Jane Smith', 'jane@example.com'],
  ['+915550103', 'Bob Johnson', 'bob@example.com'],
];

function CampaignSelector({ selectedId, onSelect }) {
  const [campaigns, setCampaigns] = useState([]);
  const [kbs, setKbs] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKbId, setNewKbId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/v1/campaigns`, { headers: getAuthHeaders() })
      .then(r => r.json()).then(d => setCampaigns(Array.isArray(d.data) ? d.data : [])).catch(() => {});
    fetch(`${API_BASE}/v1/knowledge-bases`, { headers: getAuthHeaders() })
      .then(r => r.json()).then(d => setKbs(Array.isArray(d.data) ? d.data : [])).catch(() => {});
  }, []);

  const createCampaign = async () => {
    if (!newName) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/v1/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name: newName, knowledgeBaseId: newKbId || null })
      });
      const d = await res.json();
      if (d.ok) {
        setCampaigns([d.data, ...campaigns]);
        onSelect(d.data._id);
        setShowNew(false);
        setNewName('');
      }
    } catch {}
    finally { setLoading(false); }
  };

  if (showNew) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">New Campaign</p>
        <input
          type="text"
          placeholder="Campaign name..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          className="w-full px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/8 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-primary/40 transition-colors"
        />
        <select
          value={newKbId}
          onChange={e => setNewKbId(e.target.value)}
          className="w-full px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/8 text-slate-400 focus:outline-none focus:border-primary/40 transition-colors"
        >
          <option value="">No Knowledge Base</option>
          {kbs.map(kb => <option key={kb._id} value={kb._id}>{kb.name} ({kb.companyName})</option>)}
        </select>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setShowNew(false)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 border border-white/8 hover:bg-white/5 transition-all">Cancel</button>
          <button onClick={createCampaign} disabled={loading || !newName} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-all">
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <select
        value={selectedId}
        onChange={e => onSelect(e.target.value)}
        className="flex-1 px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/8 text-slate-300 focus:outline-none focus:border-primary/40 transition-colors"
      >
        <option value="">Select Campaign...</option>
        {campaigns.map(c => (
          <option key={c._id} value={c._id}>{c.name}</option>
        ))}
      </select>
      <button
        onClick={() => setShowNew(true)}
        className="size-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
        title="Create campaign"
      >
        <span className="material-symbols-outlined text-base">add</span>
      </button>
    </div>
  );
}

export default function CSVManagement() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [campaignId, setCampaignId] = useState('');
  const [mode, setMode] = useState('append');
  const [history, setHistory] = useState([]);

  const fetchHistory = () => {
    fetch(`${API_BASE}/v1/uploads`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => setHistory(Array.isArray(d.data) ? d.data : []))
      .catch(() => {});
  };

  useEffect(() => { fetchHistory(); }, []);

  const loadSample = () => {
    setData(SAMPLE_CSV);
    setMessage({ text: 'Sample data loaded. Upload to proceed.', type: 'info' });
    const blob = new Blob([SAMPLE_CSV.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    setFile(new File([blob], 'sample_numbers.csv', { type: 'text/csv' }));
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n').filter(l => l.trim());
      setData(lines.map(line => line.split(',').map(c => c.trim())));
    };
    reader.readAsText(f);
  };

  const upload = async () => {
    if (!file || !campaignId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/v1/calls/upload-numbers?campaignId=${campaignId}&mode=${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv', ...getAuthHeaders() },
        body: await file.text()
      });
      const json = await res.json();
      if (json.ok) {
        setMessage({ text: `Accepted: ${json.results.accepted} · Rejected: ${json.results.rejected}`, type: 'success' });
        setFile(null);
        setData([]);
        setTimeout(fetchHistory, 1000);
      } else {
        setMessage({ text: json.error || 'Upload failed', type: 'error' });
      }
    } catch (e) {
      setMessage({ text: e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">CSV Upload & Analytics</h1>
        <p className="text-sm text-slate-500 mt-0.5">Upload phone number lists and track campaign uploads</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Form */}
        <div className="rounded-2xl border border-white/8 p-5 space-y-4" style={{background: 'rgba(255,255,255,0.03)'}}>
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">upload_file</span>
            Upload Numbers
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Campaign</label>
              <CampaignSelector selectedId={campaignId} onSelect={setCampaignId} />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Upload Mode</label>
              <select
                value={mode}
                onChange={e => setMode(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/8 text-slate-300 focus:outline-none focus:border-primary/40 transition-colors"
              >
                <option value="append">Append (add to existing)</option>
                <option value="replace">Replace (clear & add new)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-600">Select File (.csv, .txt)</label>
                <button onClick={loadSample} className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors">Load Sample</button>
              </div>
              <label className="flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed border-white/8 hover:border-primary/30 transition-colors cursor-pointer" style={{background: 'rgba(255,255,255,0.02)'}}>
                <span className="material-symbols-outlined text-slate-600 text-2xl mb-1">cloud_upload</span>
                <span className="text-xs text-slate-500">{file ? file.name : 'Click to browse'}</span>
                <span className="text-[10px] text-slate-700 mt-0.5">Format: phone, name, email</span>
                <input type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
              </label>
            </div>

            {message && (
              <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
                message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                message.type === 'error' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' :
                'bg-primary/10 border border-primary/20 text-primary'
              }`}>
                {message.text}
              </div>
            )}

            <button
              onClick={upload}
              disabled={!file || !campaignId || loading}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              style={{boxShadow: '0 4px 14px rgba(43,108,238,0.25)'}}
            >
              {loading ? (
                <><span className="material-symbols-outlined animate-spin text-base">refresh</span> Uploading...</>
              ) : (
                <><span className="material-symbols-outlined text-base">upload</span> Upload File</>
              )}
            </button>
          </div>
        </div>

        {/* Upload History */}
        <div className="rounded-2xl border border-white/8 overflow-hidden" style={{background: 'rgba(255,255,255,0.03)'}}>
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">history</span>
              Upload History
            </h3>
          </div>
          {history.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <span className="material-symbols-outlined text-3xl text-slate-700">inbox</span>
              <p className="text-slate-500 text-sm">No upload history.</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-72 custom-scrollbar">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Date', 'Campaign', 'Results'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map(log => (
                    <tr key={log._id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400 truncate max-w-[120px]">{log.campaignId}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-emerald-400 font-bold">{log.recordsAccepted} ok</span>
                          {log.recordsRejected > 0 && <span className="text-rose-400 font-bold">{log.recordsRejected} err</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Data Preview */}
      {data.length > 0 && (
        <div className="rounded-2xl border border-white/8 overflow-hidden" style={{background: 'rgba(255,255,255,0.03)'}}>
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <h3 className="text-sm font-bold text-slate-200">Data Preview</h3>
            <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{data.length} records</span>
          </div>
          <div className="overflow-auto max-h-64 custom-scrollbar">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Phone', 'Name', 'Email'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 100).map((row, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-2.5 text-xs font-mono text-slate-300">{row[0]}</td>
                    <td className="px-5 py-2.5 text-xs text-slate-400">{row[1] || '—'}</td>
                    <td className="px-5 py-2.5 text-xs text-slate-400">{row[2] || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length > 100 && (
              <p className="px-5 py-3 text-xs text-slate-600 text-center">Showing first 100 of {data.length} rows</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
