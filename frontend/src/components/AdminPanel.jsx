import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import SpacesManager from './admin/SpacesManager';
import UsersManager from './admin/UsersManager';
import PricingManager from './admin/PricingManager';
import ReportsPanel from './admin/ReportsPanel';

const ADMIN_TABS = [
  {
    id: 'overview', label: 'Resumen', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    id: 'spaces', label: 'Cajones', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
      </svg>
    )
  },
  {
    id: 'users', label: 'Usuarios', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  {
    id: 'pricing', label: 'Tarifas', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    id: 'reports', label: 'Reportes', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="glass-card px-4 py-3 text-sm">
        <p className="text-parking-muted font-mono text-xs">{label}</p>
        <p className="font-display font-bold text-parking-gold">${payload[0].value.toFixed(2)} MXN</p>
      </div>
    );
  }
  return null;
};

function StatCard({ label, value, sub, color, icon }) {
  const colors = {
    accent: 'text-parking-accent bg-parking-accent/10',
    free: 'text-parking-free bg-parking-free/10',
    occupied: 'text-parking-occupied bg-parking-occupied/10',
    gold: 'text-parking-gold bg-parking-gold/10',
  };
  return (
    <div className="stat-card">
      <div className="absolute top-0 right-0 w-16 h-16 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl opacity-20"
        style={{ background: color === 'free' ? '#00E5A0' : color === 'occupied' ? '#FF3B5C' : color === 'gold' ? '#FFD166' : '#6C63FF' }} />
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>{icon}</div>
      <p className="text-parking-muted text-xs font-mono uppercase tracking-wider mb-1">{label}</p>
      <p className="font-display text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-parking-muted mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState([]);

  useEffect(() => {
    if (activeTab !== 'overview') return;
    Promise.all([
      axios.get('/api/admin/stats'),
      axios.get('/api/reports/revenue?period=week'),
    ]).then(([s, r]) => {
      setStats(s.data);
      setRevenue(r.data.data || []);
    }).catch(console.error);
  }, [activeTab]);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-white">Administración</h2>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {ADMIN_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-body font-medium whitespace-nowrap transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-parking-accent text-white shadow-md shadow-parking-accent/30'
                : 'text-parking-muted hover:text-white hover:bg-parking-card border border-transparent hover:border-parking-border'
            }`}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── RESUMEN ── */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Libres" value={stats.spaces.free} sub={`de ${stats.spaces.total} cajones`} color="free"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>} />
            <StatCard label="Ocupados" value={stats.spaces.occupied} sub={`${stats.spaces.occupancyRate}%`} color="occupied"
              icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z" /></svg>} />
            <StatCard label="Ingresos hoy" value={`$${(stats.revenue.today || 0).toFixed(0)}`} sub={`${stats.sessions.today} sesiones`} color="gold"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1" /></svg>} />
            <StatCard label="Total acumulado" value={`$${(stats.revenue.total || 0).toFixed(0)}`} sub={`${stats.users.total} conductores`} color="accent"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10" /></svg>} />
          </div>

          {revenue.length > 0 && (
            <div className="glass-card p-5">
              <p className="text-xs font-mono text-parking-muted uppercase tracking-wider mb-4">Ingresos últimos 7 días</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={revenue} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B6B8A', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B6B8A', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(108,99,255,0.1)' }} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {revenue.map((_, i) => (
                      <Cell key={i} fill={i === revenue.length - 1 ? '#FFD166' : '#6C63FF'} opacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="glass-card p-4 flex items-center gap-3 cursor-pointer hover:border-parking-accent/50 transition-colors"
            onClick={() => setActiveTab('reports')}>
            <div className="w-10 h-10 rounded-xl bg-parking-accent/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-parking-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium text-parking-text text-sm">Ver reportes completos</p>
              <p className="text-xs text-parking-muted">Ingresos, ocupación y exportar Excel</p>
            </div>
            <svg className="w-4 h-4 text-parking-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      )}

      {activeTab === 'spaces'  && <SpacesManager />}
      {activeTab === 'users'   && <UsersManager />}
      {activeTab === 'pricing' && <PricingManager />}
      {activeTab === 'reports' && <ReportsPanel />}
    </div>
  );
}
