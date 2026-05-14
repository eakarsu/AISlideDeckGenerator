import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';
import { FiSend, FiMessageSquare, FiLayers, FiLayout, FiMic, FiZap, FiBarChart2, FiStar, FiDownload, FiUsers, FiPlay } from 'react-icons/fi';

const tools = [
  { id:'chat', name:'Chat', desc:'Presentation design assistant', icon:<FiMessageSquare/>, endpoint:'/ai/chat' },
  { id:'pipeline', name:'Deck Pipeline', desc:'Multi-step: outline → content → download', icon:<FiPlay/>, endpoint:'/ai/generate-deck-pipeline',
    fields:[
      {name:'topic',label:'Topic',required:true},
      {name:'num_slides',label:'Number of Slides',type:'number',placeholder:'8'},
      {name:'audience',label:'Audience',placeholder:'business professionals'},
      {name:'style',label:'Style',placeholder:'professional'},
      {name:'purpose',label:'Purpose',placeholder:'inform'},
    ]},
  { id:'deck', name:'Generate Deck (Text)', desc:'Full presentation outline (text)', icon:<FiLayers/>, endpoint:'/ai/generate-deck',
    fields:[
      {name:'topic',label:'Topic',required:true},
      {name:'num_slides',label:'Number of Slides',type:'number',placeholder:'10'},
      {name:'audience',label:'Audience',placeholder:'business professionals'},
      {name:'style',label:'Style',placeholder:'professional'},
      {name:'purpose',label:'Purpose',placeholder:'inform'},
    ]},
  { id:'slide', name:'Generate Slide', desc:'Individual slide content', icon:<FiLayout/>, endpoint:'/ai/generate-slide',
    fields:[
      {name:'slide_title',label:'Slide Title',required:true},
      {name:'context',label:'Context',placeholder:'Business presentation'},
      {name:'layout',label:'Layout',placeholder:'content with bullets'},
      {name:'tone',label:'Tone',placeholder:'professional'},
      {name:'presentation_id',label:'Presentation ID (to save)',type:'number'},
      {name:'slide_number',label:'Slide Number',type:'number',placeholder:'1'},
    ]},
  { id:'notes', name:'Speaker Notes', desc:'Generate speaker notes', icon:<FiMic/>, endpoint:'/ai/generate-notes',
    fields:[
      {name:'slide_content',label:'Slide Content',type:'textarea',required:true},
      {name:'duration_minutes',label:'Duration (min)',type:'number',placeholder:'2'},
      {name:'style',label:'Speaking Style',placeholder:'professional and confident'},
    ]},
  { id:'improve', name:'Improve Content', desc:'Enhance slide content', icon:<FiZap/>, endpoint:'/ai/improve-content',
    fields:[
      {name:'content',label:'Content to Improve',type:'textarea',required:true},
      {name:'improvement_type',label:'Improvement Type',type:'select',options:['concise','persuasive','data-driven','storytelling','executive','creative']},
    ]},
  { id:'chart', name:'Chart Advisor', desc:'Data visualization recommendations', icon:<FiBarChart2/>, endpoint:'/ai/generate-chart',
    fields:[
      {name:'data_description',label:'Data Description',type:'textarea',required:true},
      {name:'chart_purpose',label:'Purpose',placeholder:'show trends'},
      {name:'audience',label:'Audience',placeholder:'business professionals'},
    ]},
  { id:'feedback', name:'Design Feedback', desc:'Get design critique', icon:<FiStar/>, endpoint:'/ai/design-feedback',
    fields:[
      {name:'description',label:'Describe your slide/presentation',type:'textarea',required:true},
      {name:'presentation_id',label:'Presentation ID (to save feedback)',type:'number'},
    ]},
  { id:'export', name:'Export PPTX', desc:'Export presentation as PPTX file', icon:<FiDownload/>, endpoint:null,
    fields:[{name:'presentation_id',label:'Presentation ID',type:'number',required:true}]},
  { id:'collaborate', name:'Share/Collaborate', desc:'Add collaborators to a presentation', icon:<FiUsers/>, endpoint:null,
    fields:[
      {name:'presentation_id',label:'Presentation ID',type:'number',required:true},
      {name:'user_id',label:'User ID to Share With',type:'number',required:true},
      {name:'role',label:'Role',type:'select',options:['viewer','editor','owner']},
    ]},
];

function SlidePreviewCard({ slide }) {
  let content = slide.content;
  if (content) {
    try {
      const parsed = JSON.parse(content);
      content = parsed.content || parsed.key_bullets?.join('\n• ') || JSON.stringify(parsed);
    } catch (_) {}
  }
  return (
    <div style={{ background: '#1e1b4b', border: '1px solid #4338ca', borderRadius: 8, padding: 16, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ color: '#818cf8', fontSize: 12 }}>Slide {slide.slide_number}</span>
        <span style={{ color: '#64748b', fontSize: 12 }}>{slide.layout}</span>
      </div>
      <h4 style={{ color: '#e2e8f0', marginBottom: 8 }}>{slide.title}</h4>
      {content && <p style={{ color: '#94a3b8', fontSize: 13, whiteSpace: 'pre-line' }}>{String(content).substring(0, 300)}{content.length > 300 ? '...' : ''}</p>}
      {slide.speaker_notes && <div style={{ marginTop: 8, padding: 8, background: '#0f172a', borderRadius: 4, fontSize: 12, color: '#64748b' }}>Notes: {String(slide.speaker_notes).substring(0, 150)}</div>}
    </div>
  );
}

export default function AIChatPage() {
  const [activeTool, setActiveTool] = useState(tools[0]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [form, setForm] = useState({});
  const [sending, setSending] = useState(false);
  const [convId, setConvId] = useState(null);
  const [pipelineResult, setPipelineResult] = useState(null);
  const messagesEnd = useRef(null);

  useEffect(() => { messagesEnd.current?.scrollIntoView({behavior:'smooth'}); }, [messages]);

  const sendChat = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role:'user', content:msg }]);
    setSending(true);
    try {
      const { data } = await api.post(activeTool.endpoint, { message:msg, conversation_id:convId });
      setConvId(data.conversation_id);
      setMessages(prev => [...prev, { role:'assistant', content:data.message, model:data.model, usage:data.usage }]);
    } catch (err) {
      setMessages(prev => [...prev, { role:'assistant', content:`Error: ${err.response?.data?.error || err.message}` }]);
    }
    setSending(false);
  };

  const handleExportPptx = async () => {
    if (!form.presentation_id) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/presentations/${form.presentation_id}/export-pptx`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const err = await response.json();
        setMessages(prev => [...prev, { role:'assistant', content:`Export failed: ${err.error}` }]);
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `presentation_${form.presentation_id}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
      setMessages(prev => [...prev, { role:'assistant', content:`PPTX file downloaded for presentation ${form.presentation_id}` }]);
    } catch (err) {
      setMessages(prev => [...prev, { role:'assistant', content:`Export error: ${err.message}` }]);
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    if (!form.presentation_id || !form.user_id) return;
    setSending(true);
    try {
      const { data } = await api.post(`/presentations/${form.presentation_id}/share`, { user_id: parseInt(form.user_id), role: form.role || 'editor' });
      setMessages(prev => [...prev, { role:'assistant', content:`Shared! Collaborator added: User ${form.user_id} as ${form.role || 'editor'}` }]);
      setForm({});
    } catch (err) {
      setMessages(prev => [...prev, { role:'assistant', content:`Share failed: ${err.response?.data?.error || err.message}` }]);
    }
    setSending(false);
  };

  const sendTool = async (e) => {
    e.preventDefault();
    if (sending) return;

    // Special handlers
    if (activeTool.id === 'export') { await handleExportPptx(); return; }
    if (activeTool.id === 'collaborate') { await handleShare(e); return; }

    setSending(true);
    setPipelineResult(null);
    const desc = Object.entries(form).filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join('\n');
    setMessages(prev => [...prev, { role:'user', content:`[${activeTool.name}]\n${desc}` }]);
    try {
      const { data } = await api.post(activeTool.endpoint, form);

      if (activeTool.id === 'pipeline') {
        // Multi-step pipeline result
        setPipelineResult(data);
        setMessages(prev => [...prev, {
          role:'assistant',
          content:`**Deck Pipeline Complete!**\n\nPresentation ID: **${data.presentation_id}**\nGenerated **${data.total_slides}** slides for: "${data.topic}"\n\nYou can now export to PPTX using the Export PPTX tool with Presentation ID: ${data.presentation_id}`,
          model:'anthropic/claude-3-5-sonnet-20241022',
          pipelineData: data,
        }]);
      } else if (typeof data.result === 'object') {
        setMessages(prev => [...prev, { role:'assistant', content: JSON.stringify(data.result, null, 2), model:data.model, usage:data.usage }]);
      } else {
        setMessages(prev => [...prev, { role:'assistant', content: data.result || JSON.stringify(data), model:data.model, usage:data.usage }]);
      }
      setForm({});
    } catch (err) {
      setMessages(prev => [...prev, { role:'assistant', content:`Error: ${err.response?.data?.error || err.message}` }]);
    }
    setSending(false);
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Assistant</h1>
          <p className="page-subtitle">{tools.length} AI-powered tools for presentation design</p>
        </div>
      </div>

      <div className="ai-tools-grid">
        {tools.map(t => (
          <div key={t.id} className={`ai-tool-card ${activeTool.id === t.id ? 'active' : ''}`} onClick={() => { setActiveTool(t); setForm({}); setPipelineResult(null); }}>
            <div className="ai-tool-icon">{t.icon}</div>
            <div className="ai-tool-name">{t.name}</div>
            <div className="ai-tool-desc">{t.desc}</div>
          </div>
        ))}
      </div>

      <div className="ai-chat-container">
        {activeTool.fields && (
          <form className="ai-form" onSubmit={sendTool}>
            <div className="ai-form-row">
              {activeTool.fields.map(f => (
                <div className="form-group" key={f.name} style={f.type==='textarea'?{gridColumn:'1/-1'}:{}}>
                  <label className="form-label">{f.label}{f.required && ' *'}</label>
                  {f.type === 'textarea' ? (
                    <textarea className="form-textarea" value={form[f.name]||''} placeholder={f.placeholder} onChange={e=>setForm({...form,[f.name]:e.target.value})} required={f.required} />
                  ) : f.type === 'select' ? (
                    <select className="form-select" value={form[f.name]||''} onChange={e=>setForm({...form,[f.name]:e.target.value})}>
                      <option value="">Select...</option>
                      {f.options.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input className="form-input" type={f.type||'text'} value={form[f.name]||''} placeholder={f.placeholder} onChange={e=>setForm({...form,[f.name]:e.target.value})} required={f.required} />
                  )}
                </div>
              ))}
            </div>
            <button type="submit" className="btn btn-primary" disabled={sending} style={{alignSelf:'flex-start'}}>
              {sending ? 'Processing...' : activeTool.id === 'export' ? 'Download PPTX' : activeTool.id === 'collaborate' ? 'Add Collaborator' : `Generate ${activeTool.name}`}
            </button>
          </form>
        )}

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🎨</div>
              <div className="empty-text">Start a conversation with the AI assistant</div>
              <p style={{color:'var(--text-muted)',fontSize:13}}>Select a tool above and start creating</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`chat-message ${m.role}`}>
              <div className="chat-avatar">{m.role === 'user' ? '👤' : '🤖'}</div>
              <div className="chat-content">
                <ReactMarkdown>{m.content}</ReactMarkdown>
                {m.pipelineData && m.pipelineData.slides && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ color: '#818cf8', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>
                      Generated Slides ({m.pipelineData.slides.length})
                    </div>
                    {m.pipelineData.slides.map(s => <SlidePreviewCard key={s.id || s.slide_number} slide={s} />)}
                    <div style={{ marginTop: 12, padding: 12, background: '#1e293b', borderRadius: 8, fontSize: 13 }}>
                      <span style={{ color: '#64748b' }}>To export: switch to </span>
                      <strong style={{ color: '#818cf8' }}>Export PPTX</strong>
                      <span style={{ color: '#64748b' }}> tool and enter Presentation ID: </span>
                      <strong style={{ color: '#e2e8f0' }}>{m.pipelineData.presentation_id}</strong>
                    </div>
                  </div>
                )}
                {m.model && (
                  <div className="chat-meta">
                    <span>Model: {m.model}</span>
                    {m.usage && <span>Tokens: {m.usage.total_tokens}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="chat-message assistant">
              <div className="chat-avatar">🤖</div>
              <div className="chat-content"><div className="loading"><div className="spinner"></div>
                {activeTool.id === 'pipeline' ? 'Generating full deck (outline → content → notes)...' : 'Thinking...'}
              </div></div>
            </div>
          )}
          <div ref={messagesEnd} />
        </div>

        {pipelineResult && (
          <div style={{ padding: '16px', borderTop: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ color: '#818cf8', margin: 0, fontSize: 16 }}>
                Deck Ready: "{pipelineResult.topic}" — {pipelineResult.total_slides} slides
              </h3>
              <button
                className="btn btn-primary"
                style={{ fontSize: 13, padding: '6px 14px' }}
                onClick={() => {
                  setActiveTool(tools.find(t => t.id === 'export'));
                  setForm({ presentation_id: pipelineResult.presentation_id });
                  setPipelineResult(null);
                }}
              >
                <FiDownload style={{ marginRight: 6 }} /> Export to PPTX (ID: {pipelineResult.presentation_id})
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
              {pipelineResult.slides?.map(s => <SlidePreviewCard key={s.id || s.slide_number} slide={s} />)}
            </div>
          </div>
        )}

        {activeTool.id === 'chat' && (
          <div className="chat-input-area">
            <textarea className="chat-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} placeholder="Ask about presentation design, slide content, storytelling..." rows={1} />
            <button className="btn btn-primary chat-send" onClick={sendChat} disabled={sending || !input.trim()}>
              <FiSend/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
