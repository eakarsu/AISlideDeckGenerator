import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function DeckCreationByTemplateChart() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get('/custom-views/deck-creation-by-template')
      .then(r => setData(r.data))
      .catch(e => setErr(e.response?.data?.error || e.message));
  }, []);

  if (err) return <div style={s.err}>Error: {err}</div>;
  if (!data) return <div style={s.loading}>Loading deck creation chart...</div>;

  const max = Math.max(1, ...data.values);
  return (
    <div style={s.card} data-testid="viz-deck-by-template">
      <h3 style={s.title}>{data.title}</h3>
      <div style={s.subtitle}>Bar chart of deck creations grouped by template</div>
      <div style={s.bars}>
        {data.labels.map((label, i) => {
          const v = data.values[i];
          const pct = Math.round((v / max) * 100);
          return (
            <div key={label + i} style={s.row}>
              <div style={s.lbl} title={label}>{label}</div>
              <div style={s.barTrack}>
                <div style={{ ...s.barFill, width: pct + '%' }} />
              </div>
              <div style={s.val}>{v}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 16 },
  title: { margin: '0 0 4px 0', fontSize: 16, fontWeight: 600, color: '#111827' },
  subtitle: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  bars: { display: 'flex', flexDirection: 'column', gap: 6 },
  row: { display: 'grid', gridTemplateColumns: '180px 1fr 48px', alignItems: 'center', gap: 8 },
  lbl: { fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  barTrack: { background: '#f3f4f6', height: 14, borderRadius: 7, overflow: 'hidden' },
  barFill: { background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', height: '100%', borderRadius: 7 },
  val: { fontSize: 12, color: '#111827', textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  err: { padding: 12, background: '#fef2f2', color: '#b91c1c', borderRadius: 6 },
  loading: { padding: 12, color: '#6b7280' },
};
