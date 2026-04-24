import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiGrid, FiLayers, FiLayout, FiCopy, FiDroplet, FiColumns, FiBarChart2, FiImage, FiStar, FiZap, FiMic, FiDownload, FiFlag, FiUsers, FiTrendingUp, FiSettings, FiMessageSquare, FiChevronLeft, FiChevronRight, FiLogOut } from 'react-icons/fi';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CrudPage from './components/CrudPage';
import AIChatPage from './pages/AIChatPage';

const pages = [
  { path:'/presentations', label:'Presentations', icon:<FiLayers/>, api:'presentations',
    columns:['title','theme','slide_count','status','audience'],
    fields:[
      {name:'title',label:'Title',required:true},
      {name:'description',label:'Description',type:'textarea'},
      {name:'theme',label:'Theme'},
      {name:'slide_count',label:'Slide Count',type:'number'},
      {name:'status',label:'Status',type:'select',options:['draft','active','completed','archived']},
      {name:'audience',label:'Audience'},
      {name:'purpose',label:'Purpose'},
      {name:'tags',label:'Tags'},
    ]},
  { path:'/slides', label:'Slides', icon:<FiLayout/>, api:'slides',
    columns:['title','presentation_id','slide_number','layout','status'],
    fields:[
      {name:'title',label:'Title',required:true},
      {name:'presentation_id',label:'Presentation ID',type:'number'},
      {name:'slide_number',label:'Slide Number',type:'number'},
      {name:'content',label:'Content',type:'textarea'},
      {name:'layout',label:'Layout',type:'select',options:['title','content','two-column','three-column','image-focus','chart','data','metrics','quote','comparison','team','video','divider','cta','blank']},
      {name:'speaker_notes',label:'Speaker Notes',type:'textarea'},
      {name:'visual_suggestion',label:'Visual Suggestion',type:'textarea'},
      {name:'status',label:'Status',type:'select',options:['draft','review','approved','final']},
    ]},
  { path:'/templates', label:'Templates', icon:<FiCopy/>, api:'templates',
    columns:['name','category','layout_type','popularity','is_premium'],
    fields:[
      {name:'name',label:'Name',required:true},
      {name:'category',label:'Category',type:'select',options:['pitch','business','marketing','education','sales','creative','analytics','internal','events']},
      {name:'description',label:'Description',type:'textarea'},
      {name:'layout_type',label:'Layout Type'},
      {name:'popularity',label:'Popularity',type:'number'},
      {name:'is_premium',label:'Premium',type:'select',options:['true','false']},
    ]},
  { path:'/themes', label:'Themes', icon:<FiDroplet/>, api:'themes',
    columns:['name','style','primary_color','font_heading'],
    fields:[
      {name:'name',label:'Name',required:true},
      {name:'description',label:'Description',type:'textarea'},
      {name:'primary_color',label:'Primary Color'},
      {name:'secondary_color',label:'Secondary Color'},
      {name:'accent_color',label:'Accent Color'},
      {name:'background_color',label:'Background Color'},
      {name:'text_color',label:'Text Color'},
      {name:'font_heading',label:'Heading Font'},
      {name:'font_body',label:'Body Font'},
      {name:'style',label:'Style',type:'select',options:['modern','elegant','natural','creative','minimal','tech','friendly','corporate','playful','bold','data','organic']},
    ]},
  { path:'/layouts', label:'Layouts', icon:<FiColumns/>, api:'layouts',
    columns:['name','layout_type','grid_columns','placeholder_count'],
    fields:[
      {name:'name',label:'Name',required:true},
      {name:'layout_type',label:'Layout Type'},
      {name:'description',label:'Description',type:'textarea'},
      {name:'grid_columns',label:'Grid Columns',type:'number'},
      {name:'grid_rows',label:'Grid Rows',type:'number'},
      {name:'supports_image',label:'Supports Image',type:'select',options:['true','false']},
      {name:'supports_chart',label:'Supports Chart',type:'select',options:['true','false']},
      {name:'supports_video',label:'Supports Video',type:'select',options:['true','false']},
      {name:'placeholder_count',label:'Placeholders',type:'number'},
    ]},
  { path:'/charts', label:'Charts', icon:<FiBarChart2/>, api:'charts',
    columns:['name','chart_type','color_scheme','presentation_id'],
    fields:[
      {name:'name',label:'Name',required:true},
      {name:'chart_type',label:'Chart Type',type:'select',options:['bar','line','pie','donut','area','radar','funnel','horizontal-bar','treemap','gauge','scatter']},
      {name:'description',label:'Description',type:'textarea'},
      {name:'data_source',label:'Data Source'},
      {name:'color_scheme',label:'Color Scheme'},
      {name:'presentation_id',label:'Presentation ID',type:'number'},
    ]},
  { path:'/images', label:'Images', icon:<FiImage/>, api:'images',
    columns:['name','category','license','file_size'],
    fields:[
      {name:'name',label:'Name',required:true},
      {name:'category',label:'Category',type:'select',options:['backgrounds','people','urban','tech','nature','business','lifestyle']},
      {name:'url',label:'URL'},
      {name:'alt_text',label:'Alt Text'},
      {name:'width',label:'Width',type:'number'},
      {name:'height',label:'Height',type:'number'},
      {name:'file_size',label:'File Size'},
      {name:'license',label:'License'},
      {name:'tags',label:'Tags'},
    ]},
  { path:'/icons', label:'Icon Sets', icon:<FiStar/>, api:'icons',
    columns:['name','icon_count','style','category','source'],
    fields:[
      {name:'name',label:'Name',required:true},
      {name:'icon_count',label:'Icon Count',type:'number'},
      {name:'style',label:'Style',type:'select',options:['outline','filled','colored','animated']},
      {name:'category',label:'Category'},
      {name:'source',label:'Source'},
      {name:'license',label:'License'},
      {name:'format',label:'Format',type:'select',options:['svg','png','webp']},
      {name:'color_customizable',label:'Customizable',type:'select',options:['true','false']},
    ]},
  { path:'/animations', label:'Animations', icon:<FiZap/>, api:'animations',
    columns:['name','type','duration_ms','trigger_event','intensity'],
    fields:[
      {name:'name',label:'Name',required:true},
      {name:'type',label:'Type',type:'select',options:['entrance','exit','emphasis','transition','scroll','celebration']},
      {name:'description',label:'Description',type:'textarea'},
      {name:'duration_ms',label:'Duration (ms)',type:'number'},
      {name:'easing',label:'Easing'},
      {name:'trigger_event',label:'Trigger',type:'select',options:['on-click','on-hover','auto','on-scroll','continuous']},
      {name:'direction',label:'Direction'},
      {name:'intensity',label:'Intensity',type:'select',options:['subtle','medium','dramatic','playful']},
    ]},
  { path:'/speakers', label:'Speaker Notes', icon:<FiMic/>, api:'speakers',
    columns:['title','slide_id','duration_minutes','status'],
    fields:[
      {name:'title',label:'Title',required:true},
      {name:'slide_id',label:'Slide ID',type:'number'},
      {name:'content',label:'Content',type:'textarea'},
      {name:'duration_minutes',label:'Duration (min)',type:'number'},
      {name:'key_points',label:'Key Points',type:'textarea'},
      {name:'audience_cue',label:'Audience Cue',type:'textarea'},
      {name:'transition_note',label:'Transition Note'},
      {name:'status',label:'Status',type:'select',options:['draft','ready','approved']},
    ]},
  { path:'/exports', label:'Exports', icon:<FiDownload/>, api:'exports',
    columns:['file_name','format','file_size','status','download_count'],
    fields:[
      {name:'presentation_id',label:'Presentation ID',type:'number'},
      {name:'format',label:'Format',type:'select',options:['pptx','pdf','html','png','jpg']},
      {name:'file_name',label:'File Name',required:true},
      {name:'file_size',label:'File Size'},
      {name:'status',label:'Status',type:'select',options:['pending','processing','completed','failed']},
      {name:'download_count',label:'Downloads',type:'number'},
    ]},
  { path:'/brands', label:'Brand Kits', icon:<FiFlag/>, api:'brands',
    columns:['name','company','status'],
    fields:[
      {name:'name',label:'Name',required:true},
      {name:'company',label:'Company'},
      {name:'guidelines',label:'Guidelines',type:'textarea'},
      {name:'status',label:'Status',type:'select',options:['active','inactive','archived']},
    ]},
  { path:'/collaborators', label:'Collaborators', icon:<FiUsers/>, api:'collaborators',
    columns:['user_email','presentation_id','role','permissions','status'],
    fields:[
      {name:'presentation_id',label:'Presentation ID',type:'number'},
      {name:'user_email',label:'Email',required:true},
      {name:'role',label:'Role',type:'select',options:['viewer','editor','reviewer','owner']},
      {name:'permissions',label:'Permissions'},
      {name:'status',label:'Status',type:'select',options:['active','inactive','pending']},
      {name:'invited_by',label:'Invited By'},
    ]},
  { path:'/analytics', label:'Analytics', icon:<FiTrendingUp/>, api:'analytics',
    columns:['presentation_id','event_type','views','unique_viewers','completion_rate'],
    fields:[
      {name:'presentation_id',label:'Presentation ID',type:'number'},
      {name:'event_type',label:'Event Type'},
      {name:'views',label:'Views',type:'number'},
      {name:'unique_viewers',label:'Unique Viewers',type:'number'},
      {name:'avg_time_seconds',label:'Avg Time (sec)',type:'number'},
      {name:'completion_rate',label:'Completion Rate',type:'number'},
    ]},
  { path:'/settings', label:'Settings', icon:<FiSettings/>, api:'settings',
    columns:['key','value','category'],
    fields:[
      {name:'key',label:'Key',required:true},
      {name:'value',label:'Value',required:true},
      {name:'category',label:'Category',type:'select',options:['general','appearance','export','presentation','content','collaboration','ai','limits']},
      {name:'description',label:'Description',type:'textarea'},
    ]},
];

function ProtectedRoute({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" />;
}

function Sidebar({ collapsed, setCollapsed }) {
  const navigate = useNavigate();
  const logout = () => { localStorage.removeItem('token'); navigate('/login'); };

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">SD</div>
        <span className="sidebar-title">Slide Deck AI</span>
        <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <FiChevronRight/> : <FiChevronLeft/>}
        </button>
      </div>
      <div className="sidebar-section-title">Main</div>
      <ul className="nav-items">
        <NavLink to="/dashboard" className={({isActive})=>`nav-item ${isActive?'active':''}`}>
          <span className="nav-icon"><FiGrid/></span><span className="nav-label">Dashboard</span>
        </NavLink>
        <NavLink to="/ai-chat" className={({isActive})=>`nav-item ${isActive?'active':''}`}>
          <span className="nav-icon"><FiMessageSquare/></span><span className="nav-label">AI Assistant</span>
        </NavLink>
      </ul>
      <div className="sidebar-section-title">Content</div>
      <ul className="nav-items">
        {pages.slice(0,6).map(p => (
          <NavLink key={p.path} to={p.path} className={({isActive})=>`nav-item ${isActive?'active':''}`}>
            <span className="nav-icon">{p.icon}</span><span className="nav-label">{p.label}</span>
          </NavLink>
        ))}
      </ul>
      <div className="sidebar-section-title">Assets</div>
      <ul className="nav-items">
        {pages.slice(6,10).map(p => (
          <NavLink key={p.path} to={p.path} className={({isActive})=>`nav-item ${isActive?'active':''}`}>
            <span className="nav-icon">{p.icon}</span><span className="nav-label">{p.label}</span>
          </NavLink>
        ))}
      </ul>
      <div className="sidebar-section-title">Management</div>
      <ul className="nav-items">
        {pages.slice(10).map(p => (
          <NavLink key={p.path} to={p.path} className={({isActive})=>`nav-item ${isActive?'active':''}`}>
            <span className="nav-icon">{p.icon}</span><span className="nav-label">{p.label}</span>
          </NavLink>
        ))}
      </ul>
      <div style={{marginTop:'auto',padding:'12px 8px',borderTop:'1px solid var(--border)'}}>
        <div className="nav-item" onClick={logout}>
          <span className="nav-icon"><FiLogOut/></span><span className="nav-label">Logout</span>
        </div>
      </div>
    </div>
  );
}

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="app-layout">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={`main-content ${collapsed ? 'expanded' : ''}`}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard pages={pages}/>} />
          <Route path="/ai-chat" element={<AIChatPage/>} />
          {pages.map(p => (
            <Route key={p.path} path={p.path} element={
              <CrudPage title={p.label} apiPath={p.api} columns={p.columns} fields={p.fields} />
            }/>
          ))}
          <Route path="*" element={<Navigate to="/dashboard"/>} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login/>} />
        <Route path="/*" element={<ProtectedRoute><AppLayout/></ProtectedRoute>} />
      </Routes>
      <ToastContainer position="bottom-right" theme="dark" autoClose={3000} />
    </BrowserRouter>
  );
}
