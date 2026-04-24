import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';
import { FiSend, FiMessageSquare, FiLayers, FiLayout, FiMic, FiZap, FiBarChart2, FiStar } from 'react-icons/fi';

const tools = [
  { id:'chat', name:'Chat', desc:'Presentation design assistant', icon:<FiMessageSquare/>, endpoint:'/ai/chat' },
  { id:'deck', name:'Generate Deck', desc:'Full presentation outline', icon:<FiLayers/>, endpoint:'/ai/generate-deck',
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
    ]},
];

export default function AIChatPage() {
  const [activeTool, setActiveTool] = useState(tools[0]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [form, setForm] = useState({});
  const [sending, setSending] = useState(false);
  const [convId, setConvId] = useState(null);
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

  const sendTool = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    const desc = Object.entries(form).filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join('\n');
    setMessages(prev => [...prev, { role:'user', content:`[${activeTool.name}]\n${desc}` }]);
    try {
      const { data } = await api.post(activeTool.endpoint, form);
      setMessages(prev => [...prev, { role:'assistant', content:data.result, model:data.model, usage:data.usage }]);
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
          <p className="page-subtitle">7 AI-powered tools for presentation design</p>
        </div>
      </div>

      <div className="ai-tools-grid">
        {tools.map(t => (
          <div key={t.id} className={`ai-tool-card ${activeTool.id === t.id ? 'active' : ''}`} onClick={() => { setActiveTool(t); setForm({}); }}>
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
              {sending ? 'Generating...' : `Generate ${activeTool.name}`}
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
              <div className="chat-content"><div className="loading"><div className="spinner"></div>Thinking...</div></div>
            </div>
          )}
          <div ref={messagesEnd} />
        </div>

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
