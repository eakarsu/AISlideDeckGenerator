import React, { useState } from 'react';
import api from '../services/api';
import ReactMarkdown from 'react-markdown';
import { FiCpu, FiCopy, FiFileText, FiCheckCircle } from 'react-icons/fi';

const TOOLS = [
  {
    id: 'template-recommend',
    label: 'Template Recommender',
    icon: <FiCopy />,
    endpoint: '/ai/template-recommend',
    fields: [
      { name: 'topic', label: 'Topic', required: true },
      { name: 'audience', label: 'Audience', placeholder: 'e.g. board, students, customers' },
      { name: 'tone', label: 'Tone', placeholder: 'e.g. confident, playful' },
      { name: 'slide_count', label: 'Slide count', type: 'number', placeholder: '12' },
    ],
  },
  {
    id: 'speaker-notes-expand',
    label: 'Speaker Notes Expand',
    icon: <FiFileText />,
    endpoint: '/ai/speaker-notes-expand',
    fields: [
      { name: 'outline', label: 'Outline (one bullet per line)', required: true, type: 'textarea' },
      { name: 'total_minutes', label: 'Total minutes', type: 'number', placeholder: '15' },
      { name: 'style', label: 'Speaking style', placeholder: 'professional and confident' },
    ],
  },
  {
    id: 'design-consistency-check',
    label: 'Design Consistency Check',
    icon: <FiCheckCircle />,
    endpoint: '/ai/design-consistency-check',
    fields: [
      { name: 'presentation_id', label: 'Presentation ID', type: 'number' },
      { name: 'slides_text', label: 'Slides text (optional, one slide per line)', type: 'textarea' },
      { name: 'brand_guidelines', label: 'Brand guidelines (optional)', type: 'textarea' },
    ],
  },
  {
    id: 'content-quality-feedback',
    label: 'Content Quality Feedback',
    icon: <FiFileText />,
    endpoint: '/ai/content-quality-feedback',
    fields: [
      { name: 'slides_text', label: 'Slides text (one slide per line)', required: true, type: 'textarea' },
      { name: 'audience', label: 'Audience', placeholder: 'e.g. board, investors, customers' },
      { name: 'goal', label: 'Goal', placeholder: 'e.g. inform and persuade' },
      { name: 'tone', label: 'Tone', placeholder: 'e.g. professional' },
    ],
  },
];

export default function NewAIToolsPage() {
  const [tool, setTool] = useState(TOOLS[0]);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const updateField = (name, value) => setForm(prev => ({ ...prev, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setResult(null);
    try {
      const payload = { ...form };
      // If there's an outline textarea, split into array
      if (tool.id === 'speaker-notes-expand' && payload.outline) {
        payload.outline = payload.outline.split('\n').map(s => s.trim()).filter(Boolean);
      }
      if (tool.id === 'design-consistency-check' && payload.slides_text) {
        payload.slides = payload.slides_text.split('\n').map(s => s.trim()).filter(Boolean);
      }
      if (tool.id === 'content-quality-feedback' && payload.slides_text) {
        payload.slides = payload.slides_text.split('\n').map(s => s.trim()).filter(Boolean);
        delete payload.slides_text;
      }
      const res = await api.post(tool.endpoint, payload);
      setResult(res.data?.result || res.data);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || err.message || 'Request failed';
      setError(status === 503 ? `${msg} (AI provider not configured)` : msg);
    }
    setLoading(false);
  };

  const renderResult = (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'string') return <ReactMarkdown>{val}</ReactMarkdown>;
    return <pre style={{ background: 'var(--bg-2,#1f2937)', color: '#e5e7eb', padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap', overflow: 'auto' }}>{JSON.stringify(val, null, 2)}</pre>;
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <FiCpu /> New AI Tools
      </h1>
      <p style={{ color: '#9ca3af' }}>Template recommender, speaker-notes expander, and design consistency check.</p>

      <div style={{ display: 'flex', gap: 8, margin: '16px 0', flexWrap: 'wrap' }}>
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTool(t); setForm({}); setResult(null); setError(''); }}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid var(--border, #374151)',
              background: tool.id === t.id ? 'var(--accent, #6366f1)' : 'var(--bg-2, #1f2937)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ background: 'var(--card, #111827)', padding: 20, borderRadius: 12, border: '1px solid var(--border, #374151)' }}>
        {tool.fields.map(f => (
          <div key={f.name} style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>
              {f.label} {f.required && <span style={{ color: '#f87171' }}>*</span>}
            </label>
            {f.type === 'textarea' ? (
              <textarea
                rows={5}
                placeholder={f.placeholder}
                value={form[f.name] || ''}
                onChange={(e) => updateField(f.name, e.target.value)}
                required={f.required}
                style={inputStyle}
              />
            ) : (
              <input
                type={f.type || 'text'}
                placeholder={f.placeholder}
                value={form[f.name] || ''}
                onChange={(e) => updateField(f.name, e.target.value)}
                required={f.required}
                style={inputStyle}
              />
            )}
          </div>
        ))}

        {error && (
          <div style={{ background: '#7f1d1d', color: '#fee2e2', padding: 10, borderRadius: 8, marginBottom: 12 }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: 'var(--accent, #6366f1)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Working...' : 'Run'}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: 16, background: 'var(--card, #111827)', padding: 20, borderRadius: 12, border: '1px solid var(--border, #374151)' }}>
          <h3>Result</h3>
          {renderResult(result)}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 6,
  border: '1px solid var(--border, #374151)',
  background: 'var(--bg-2, #1f2937)',
  color: '#fff',
  fontSize: 14,
  boxSizing: 'border-box',
};
