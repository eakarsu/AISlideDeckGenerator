import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function TemplateUsageHeatmap() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get('/custom-views/template-usage-heatmap')
      .then(r => setData(r.data))
      .catch(e => setErr(e.response?.data?.error || e.message));
  }, []);

  if (err) return <div style={s.err}>Error: {err}</div>;
  if (!data) return <div style={s.loading}>Loading template usage heatmap...</div>;

  const max = Math.max(1, ...data.matrix.flat());
  const color = v => {
    if (!v) return '#f3f4f6';
    const intensity = Math.min(1, v / max);
    const r = Math.round(241 - intensity * 130);
    const g = Math.round(245 - intensity * 145);
    const b = Math.round(249 - intensity * 10);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div style={s.card} data-testid="viz-template-heatmap">
      <h3 style={s.title}>{data.title}</h3>
      <div style={s.subtitle}>Heatmap of template usage across teams/audiences</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}></th>
              {data.teams.map(t => <th key={t} style={s.th}>{t}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.templates.map((tpl, ri) => (
              <tr key={tpl}>
                <td style={s.thRow}>{tpl}</td>
                {data.teams.map((tm, ci) => {
                  const v = data.matrix[ri][ci];
                  return (
                    <td key={tm + ci} style={{ ...s.cell, background: color(v) }} title={`${tpl} × ${tm}: ${v}`}>
                      {v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const s = {
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 16 },
  title: { margin: '0 0 4px 0', fontSize: 16, fontWeight: 600, color: '#111827' },
  subtitle: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  table: { borderCollapse: 'collapse', minWidth: '100%' },
  th: { padding: '6px 10px', fontSize: 11, fontWeight: 600, color: '#374151', textAlign: 'center', borderBottom: '1px solid #e5e7eb' },
  thRow: { padding: '6px 10px', fontSize: 12, color: '#111827', textAlign: 'left', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' },
  cell: { padding: '8px 12px', textAlign: 'center', fontSize: 12, color: '#111827', minWidth: 48, borderBottom: '1px solid #fff' },
  err: { padding: 12, background: '#fef2f2', color: '#b91c1c', borderRadius: 6 },
  loading: { padding: 12, color: '#6b7280' },
};
