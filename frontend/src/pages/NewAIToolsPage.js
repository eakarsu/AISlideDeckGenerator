import AIFieldPresets, { completeExample } from '../components/AIFieldPresets';
import useCancelableAI from '../components/useCancelableAI';
import ReadableAIReport from "../components/AIResultView";
import React, { useState } from 'react';
import api from '../services/api';
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
      { name: 'slide_outline', label: 'Slide outline', required: true, type: 'textarea' },
      { name: 'slide_title', label: 'Slide title' },
      { name: 'target_minutes_per_slide', label: 'Minutes for this slide', type: 'number', min: 0.5, step: 0.5 },
      { name: 'audience', label: 'Audience', placeholder: 'e.g. board members, students, customers' },
    ],
  },
  {
    id: 'design-consistency-check',
    label: 'Design Consistency Check',
    icon: <FiCheckCircle />,
    endpoint: '/ai/design-consistency-check',
    fields: [
      { name: 'slides', label: 'Slides to review', type: 'json', required: true, placeholder: '[{"title":"Example summary","font":"Inter","color":"#2563eb","content":"Illustrative slide content"}]' },
      { name: 'brand', label: 'Brand guidelines', type: 'json', placeholder: '{"fonts":["Inter"],"colors":["#2563eb"],"tone":"Professional"}' },
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
  const aiRequest = useCancelableAI();
  const { loading, error, result, setError, setResult } = aiRequest;



  const updateField = (name, value) => setForm(prev => ({ ...prev, [name]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    return aiRequest.run(async (options) => {
      const payload = { ...form };
      for (const field of tool.fields) {
        if (field.required && (payload[field.name] === undefined || payload[field.name] === '')) throw new Error(field.label + ' is required.');
        if (field.type === 'number' && payload[field.name] !== '' && payload[field.name] !== undefined) payload[field.name] = Number(payload[field.name]);
        if (field.type === 'json' && payload[field.name]) { try { payload[field.name] = typeof payload[field.name] === 'string' ? JSON.parse(payload[field.name]) : payload[field.name]; } catch (_) { throw new Error(field.label + ': enter valid structured data.'); } }
      }
      if (tool.id === 'content-quality-feedback' && payload.slides_text) { payload.slides = payload.slides_text.split('\n').map((line) => line.trim()).filter(Boolean); delete payload.slides_text; }
      return (await api.post(tool.endpoint, payload, options)).data;
    });
  };

  const renderResult = (value) => <ReadableAIReport result={value} title={tool.label} />;

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
            onClick={() => { aiRequest.cancel(); setTool(t); setForm({}); setResult(null); setError(''); }}
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
        <AIFieldPresets fields={tool.fields} context={tool.label} disabled={loading} onFill={(sample, index) => { setForm(completeExample(tool.fields, sample, index, tool.label, form)); setResult(null); setError(null); }} />

        {tool.fields.map(f => (
          <div key={f.name} style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>
              {f.label} {f.required && <span style={{ color: '#f87171' }}>*</span>}
            </label>
            {f.type === 'textarea' || f.type === 'json' ? (
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
          {loading ? 'Preparing report…' : 'Generate with OpenRouter'}
        </button>
        {loading && <button type="button" className="btn btn-secondary" onClick={aiRequest.cancel}>Cancel</button>}
        {aiRequest.notice && <p className="sr-notice" role="status">{aiRequest.notice}</p>}
      </form>

      <ReadableAIReport result={result} loading={loading} error={error} title={tool.label} />
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
