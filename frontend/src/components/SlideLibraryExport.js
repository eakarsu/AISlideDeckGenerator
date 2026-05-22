import React, { useState } from 'react';
import api from '../services/api';

export default function SlideLibraryExport() {
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true); setErr(null);
    try {
      const r = await api.get('/custom-views/slide-library-export', { params: { format: 'pdf' } });
      setDoc(r.data);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally { setLoading(false); }
  };

  const download = () => {
    if (!doc) return;
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'slide-library.pdf.json';
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div style={s.card} data-testid="nonviz-slide-library-export">
      <h3 style={s.title}>Slide Library Export (PDF)</h3>
      <div style={s.subtitle}>Generate a PDF-ready document of the entire slide library</div>
      <div style={s.row}>
        <button style={s.btn} onClick={run} disabled={loading}>{loading ? 'Generating...' : 'Generate Export'}</button>
        <button style={{ ...s.btn, background: '#10b981' }} onClick={download} disabled={!doc}>Download .pdf.json</button>
      </div>
      {err && <div style={s.err}>{err}</div>}
      {doc && (
        <div style={s.summary}>
          <div><strong>Title:</strong> {doc.title}</div>
          <div><strong>Pages:</strong> {doc.total_pages}</div>
          <div><strong>Format:</strong> {doc.format}</div>
          <div><strong>Generated:</strong> {doc.generated_at}</div>
          <div style={{ marginTop: 8, maxHeight: 240, overflow: 'auto', background: '#f9fafb', padding: 8, borderRadius: 6 }}>
            {doc.pages.slice(0, 10).map(p => (
              <div key={p.page} style={{ fontSize: 12, borderBottom: '1px dashed #e5e7eb', padding: '4px 0' }}>
                <strong>Page {p.page}:</strong> {p.title} <span style={{ color: '#6b7280' }}>({p.presentation || 'unassigned'})</span>
              </div>
            ))}
            {doc.pages.length > 10 && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>+{doc.pages.length - 10} more pages...</div>}
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 16 },
  title: { margin: '0 0 4px 0', fontSize: 16, fontWeight: 600, color: '#111827' },
  subtitle: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  row: { display: 'flex', gap: 8, marginBottom: 12 },
  btn: { padding: '6px 14px', background: '#6366f1', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  err: { padding: 8, background: '#fef2f2', color: '#b91c1c', borderRadius: 6, fontSize: 12 },
  summary: { fontSize: 13, color: '#111827', lineHeight: 1.6 },
};
