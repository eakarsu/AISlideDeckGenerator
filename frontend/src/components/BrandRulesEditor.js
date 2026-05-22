import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function BrandRulesEditor() {
  const [rules, setRules] = useState([]);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState({ name: '', scope: 'global', fonts: '', colors: '', notes: '' });
  const [editId, setEditId] = useState(null);

  const load = async () => {
    try { const r = await api.get('/custom-views/brand-rules'); setRules(r.data); }
    catch (e) { setErr(e.response?.data?.error || e.message); }
  };
  useEffect(() => { load(); }, []);

  const reset = () => { setForm({ name: '', scope: 'global', fonts: '', colors: '', notes: '' }); setEditId(null); };

  const submit = async () => {
    try {
      const payload = {
        ...form,
        fonts: form.fonts ? form.fonts.split(',').map(x => x.trim()).filter(Boolean) : [],
        colors: form.colors ? form.colors.split(',').map(x => x.trim()).filter(Boolean) : [],
      };
      if (editId) await api.put(`/custom-views/brand-rules/${editId}`, payload);
      else await api.post('/custom-views/brand-rules', payload);
      reset(); load();
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  };

  const edit = (r) => {
    setEditId(r.id);
    setForm({
      name: r.name, scope: r.scope || 'global',
      fonts: (r.fonts || []).join(', '),
      colors: (r.colors || []).join(', '),
      notes: r.notes || '',
    });
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this rule?')) return;
    try { await api.delete(`/custom-views/brand-rules/${id}`); load(); }
    catch (e) { setErr(e.response?.data?.error || e.message); }
  };

  return (
    <div style={s.card} data-testid="nonviz-brand-rules-editor">
      <h3 style={s.title}>Brand / Template Rules Editor</h3>
      <div style={s.subtitle}>CRUD rules for fonts and colors applied to templates</div>

      <div style={s.formGrid}>
        <input style={s.in} placeholder="Rule name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <select style={s.in} value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })}>
          <option value="global">global</option>
          <option value="template">template</option>
          <option value="brand">brand</option>
        </select>
        <input style={s.in} placeholder="Fonts (comma-separated)" value={form.fonts} onChange={e => setForm({ ...form, fonts: e.target.value })} />
        <input style={s.in} placeholder="Colors (#hex, comma-separated)" value={form.colors} onChange={e => setForm({ ...form, colors: e.target.value })} />
        <input style={{ ...s.in, gridColumn: '1 / -1' }} placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
          <button style={s.btn} onClick={submit}>{editId ? 'Update Rule' : 'Add Rule'}</button>
          {editId && <button style={{ ...s.btn, background: '#6b7280' }} onClick={reset}>Cancel</button>}
        </div>
      </div>

      {err && <div style={s.err}>{err}</div>}

      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Name</th><th style={s.th}>Scope</th><th style={s.th}>Fonts</th><th style={s.th}>Colors</th><th style={s.th}>Status</th><th style={s.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.map(r => (
            <tr key={r.id}>
              <td style={s.td}>{r.name}</td>
              <td style={s.td}>{r.scope}</td>
              <td style={s.td}>{(r.fonts || []).join(', ')}</td>
              <td style={s.td}>
                {(r.colors || []).map(c => (
                  <span key={c} style={{ display: 'inline-block', width: 16, height: 16, background: c, border: '1px solid #d1d5db', marginRight: 4, verticalAlign: 'middle', borderRadius: 3 }} title={c} />
                ))}
              </td>
              <td style={s.td}>{r.status}</td>
              <td style={s.td}>
                <button style={s.smallBtn} onClick={() => edit(r)}>Edit</button>
                <button style={{ ...s.smallBtn, background: '#ef4444' }} onClick={() => remove(r.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {!rules.length && <tr><td style={s.td} colSpan={6}>No rules yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

const s = {
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 16 },
  title: { margin: '0 0 4px 0', fontSize: 16, fontWeight: 600, color: '#111827' },
  subtitle: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 },
  in: { padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 },
  btn: { padding: '6px 14px', background: '#6366f1', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  smallBtn: { padding: '3px 8px', background: '#6366f1', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer', fontSize: 11, marginRight: 4 },
  err: { padding: 8, background: '#fef2f2', color: '#b91c1c', borderRadius: 6, fontSize: 12, marginBottom: 8 },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 8 },
  th: { textAlign: 'left', padding: 8, fontSize: 12, color: '#374151', borderBottom: '1px solid #e5e7eb' },
  td: { padding: 8, fontSize: 12, color: '#111827', borderBottom: '1px solid #f3f4f6' },
};
