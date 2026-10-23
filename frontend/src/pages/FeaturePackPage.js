import React, { useEffect, useState } from 'react';
export default function FeaturePackPage(){
  const [tasks,setTasks]=useState([]); const [search,setSearch]=useState(''); const [status,setStatus]=useState(''); const [title,setTitle]=useState(''); const [ai,setAi]=useState(null); const [error,setError]=useState('');
  const token=localStorage.getItem('token')||localStorage.getItem('authToken')||'';
  const headers={'Content-Type':'application/json',Authorization:`Bearer ${token}`};
  async function load(){ try{ const q=new URLSearchParams(); if(search)q.set('search',search); if(status)q.set('status',status); const r=await fetch(`/api/feature-pack/tasks?${q}`,{headers}); const d=await r.json(); setTasks(d.data||[]); }catch(e){ setError(String(e)); } }
  useEffect(()=>{load();},[]);
  async function create(e){ e.preventDefault(); await fetch('/api/feature-pack/tasks',{method:'POST',headers,body:JSON.stringify({title})}); setTitle(''); load(); }
  async function toggle(t){ await fetch(`/api/feature-pack/tasks/${t.id}`,{method:'PUT',headers,body:JSON.stringify({status:t.status==='done'?'todo':'done',completed:t.status!=='done'})}); load(); }
  async function runAi(slug){ const r=await fetch(`/api/feature-pack/ai/${slug}`,{headers}); setAi(await r.json()); }
  function download(fmt){ fetch(`/api/feature-pack/export?format=${fmt}`,{headers}).then(r=>r.blob()).then(b=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=`feature-pack.${fmt}`; a.click(); }); }
  return (<main><h1>Feature Pack — slide decks</h1>{error&&<p role="alert">{error}</p>}
    <section aria-label="Search and filter"><h2>Search &amp; Filter</h2><input aria-label="Search tasks" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks" /><select aria-label="Filter by status" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option><option value="todo">todo</option><option value="in_progress">in_progress</option><option value="done">done</option></select><button onClick={load}>Search</button></section>
    <section aria-label="Tasks"><h2>Tasks</h2><form onSubmit={create}><input aria-label="New task title" value={title} onChange={e=>setTitle(e.target.value)} placeholder="New task title" /><button type="submit">Create task</button></form>
    <ul>{tasks.map(t=>(<li key={t.id}><strong>{t.title}</strong> — Status: {t.status} — Priority: {t.priority} — Completed: {String(t.completed)} — Estimate (hours): {t.estimateHours} — Description: {t.description||'(empty)'} <button onClick={()=>toggle(t)}>Toggle done</button></li>))}</ul></section>
    <section aria-label="Export"><h2>Export</h2><button onClick={()=>download('csv')}>Export CSV</button><button onClick={()=>download('json')}>Export JSON</button></section>
    <section aria-label="AI insights"><h2>AI Insights</h2><p>Deterministic fallback (no AI provider called) — aiGenerated: false</p><button onClick={()=>runAi('slide-readability')}>Slide Readability</button> <button onClick={()=>runAi('outline-expansion')}>Outline Expansion</button> <button onClick={()=>runAi('design-consistency')}>Design Consistency</button>{ai&&<div><p>Label: {ai.label}</p><p>Summary: {ai.summary}</p><p>Score: {ai.score}</p><p>aiGenerated: {String(ai.aiGenerated)}</p></div>}</section>
  </main>); }
