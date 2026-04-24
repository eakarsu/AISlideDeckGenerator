import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FiLayers, FiLayout, FiCopy, FiDroplet, FiColumns, FiBarChart2, FiImage, FiStar, FiZap, FiMic, FiDownload, FiFlag, FiUsers, FiTrendingUp } from 'react-icons/fi';

const statMeta = [
  { key:'presentations', label:'Presentations', icon:<FiLayers/>, path:'/presentations', color:'#f59e0b' },
  { key:'slides', label:'Slides', icon:<FiLayout/>, path:'/slides', color:'#3b82f6' },
  { key:'templates', label:'Templates', icon:<FiCopy/>, path:'/templates', color:'#8b5cf6' },
  { key:'themes', label:'Themes', icon:<FiDroplet/>, path:'/themes', color:'#ec4899' },
  { key:'layouts', label:'Layouts', icon:<FiColumns/>, path:'/layouts', color:'#06b6d4' },
  { key:'charts', label:'Charts', icon:<FiBarChart2/>, path:'/charts', color:'#10b981' },
  { key:'images', label:'Images', icon:<FiImage/>, path:'/images', color:'#f97316' },
  { key:'icons', label:'Icon Sets', icon:<FiStar/>, path:'/icons', color:'#eab308' },
  { key:'animations', label:'Animations', icon:<FiZap/>, path:'/animations', color:'#a855f7' },
  { key:'speakers', label:'Speaker Notes', icon:<FiMic/>, path:'/speakers', color:'#14b8a6' },
  { key:'exports', label:'Exports', icon:<FiDownload/>, path:'/exports', color:'#6366f1' },
  { key:'brands', label:'Brand Kits', icon:<FiFlag/>, path:'/brands', color:'#ef4444' },
  { key:'collaborators', label:'Collaborators', icon:<FiUsers/>, path:'/collaborators', color:'#0ea5e9' },
  { key:'analytics', label:'Analytics', icon:<FiTrendingUp/>, path:'/analytics', color:'#22c55e' },
];

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => setStats(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">AI Slide Deck Generator Overview</p>
        </div>
      </div>
      {loading ? (
        <div className="loading"><div className="spinner"></div>Loading dashboard...</div>
      ) : (
        <div className="stats-grid">
          {statMeta.map(s => (
            <Link key={s.key} to={s.path} className="stat-card">
              <div className="stat-icon" style={{color: s.color}}>{s.icon}</div>
              <div className="stat-value">{stats[s.key] ?? 0}</div>
              <div className="stat-label">{s.label}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
