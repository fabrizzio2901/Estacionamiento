import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const PERIODS = [
  { key: 'week', label: '7 días' },
  { key: 'month', label: 'Este mes' },
  { key: 'year', label: 'Este año' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="glass-card px-4 py-3 text-sm shadow-xl">
        <p className="text-parking-muted font-mono text-xs mb-1">{label}</p>
        <p className="font-display font-bold text-parking-gold">${payload[0].value.toFixed(2)} MXN</p>
      </div>
    );
  }
  return null;
};

function StatPill({ label, value, color = 'text-white' }) {
  return (
    <div className="glass-card p-4 text-center">
      <p className="text-xs text-parking-muted font-mono uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-display text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function ReportsPanel() {
  const [period, setPeriod] = useState('week');
  const [revenue, setRevenue] = useState(null);
  const [occupancy, setOccupancy] = useState(null);
  const [pendingPayments, setPendingPayments] = useState(null);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [loadingOccupancy, setLoadingOccupancy] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('revenue');

  const loadRevenue = async () => {
    setLoadingRevenue(true);
    try {
      const { data } = await axios.get(`/api/reports/revenue?period=${period}`);
      setRevenue(data);
    } catch (e) { console.error(e); }
    finally { setLoadingRevenue(false); }
  };

  const loadOccupancy = async () => {
    setLoadingOccupancy(true);
    try {
      const [occ, pend] = await Promise.all([
        axios.get('/api/reports/occupancy'),
        axios.get('/api/reports/payments/pending'),
      ]);
      setOccupancy(occ.data);
      setPendingPayments(pend.data);
    } catch (e) { console.error(e); }
    finally { setLoadingOccupancy(false); }
  };

  useEffect(() => { loadRevenue(); }, [period]);
  useEffect(() => { loadOccupancy(); }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await axios.get('/api/reports/sessions/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_sesiones_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) { console.error('Export error', e); }
    finally { setExporting(false); }
  };

  const tabs = [
    { key: 'revenue', label: 'Ingresos' },
    { key: 'occupancy', label: 'Ocupación' },
    { key: 'pending', label: 'Pagos Pendientes' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="font-display font-bold text-lg text-white">Reportes</h3>
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-parking-free/15 text-parking-free
                   hover:bg-parking-free/25 transition-colors text-sm font-mono border border-parking-free/30 disabled:opacity-50">
          {exporting
            ? <div className="w-4 h-4 border-2 border-parking-free/30 border-t-parking-free rounded-full animate-spin" />
            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>}
          Exportar Excel
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-parking-surface rounded-xl p-1 gap-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-display font-semibold transition-all ${
              activeTab === t.key ? 'bg-parking-accent text-white shadow-md' : 'text-parking-muted hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB INGRESOS ── */}
      {activeTab === 'revenue' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-4 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  period === p.key
                    ? 'bg-parking-gold/20 text-parking-gold border border-parking-gold/30'
                    : 'bg-parking-card border border-parking-border text-parking-muted hover:text-white'
                }`}>
                {p.label}
              </button>
            ))}
          </div>

          {revenue && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatPill label="Total período" value={`$${revenue.totalPeriod.toFixed(0)}`} color="text-parking-gold" />
                <StatPill label="Sesiones" value={revenue.totalSessions} color="text-parking-accent" />
                <StatPill
                  label="Promedio / sesión"
                  value={revenue.totalSessions > 0
                    ? `$${(revenue.totalPeriod / revenue.totalSessions).toFixed(0)}`
                    : '$0'}
                  color="text-parking-free"
                />
              </div>

              {loadingRevenue ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="flex gap-2">{[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-parking-accent animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}</div>
                </div>
              ) : revenue.data.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <p className="text-parking-muted text-sm">Sin ingresos en este período</p>
                </div>
              ) : (
                <div className="glass-card p-5">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={revenue.data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FFD166" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#FFD166" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B6B8A', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#6B6B8A', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="total" stroke="#FFD166" strokeWidth={2} fill="url(#goldGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB OCUPACIÓN ── */}
      {activeTab === 'occupancy' && (
        <div className="space-y-4">
          {loadingOccupancy ? (
            <div className="flex justify-center py-8">
              <div className="flex gap-2">{[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-parking-accent animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}</div>
            </div>
          ) : occupancy && (
            <>
              {/* Por zona */}
              <div className="glass-card p-5">
                <p className="text-xs font-mono text-parking-muted uppercase tracking-wider mb-4">Sesiones por zona</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={occupancy.zones} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <XAxis dataKey="zone" tick={{ fontSize: 11, fill: '#6B6B8A', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B6B8A', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(108,99,255,0.1)' }}
                      contentStyle={{ background: '#1A1A26', border: '1px solid #2A2A3E', borderRadius: 12, fontFamily: 'JetBrains Mono', fontSize: 12 }} />
                    <Bar dataKey="sessions" radius={[6, 6, 0, 0]}>
                      {occupancy.zones.map((_, i) => (
                        <Cell key={i} fill={['#6C63FF', '#00E5A0', '#FFD166', '#FF3B5C'][i % 4]} opacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tabla por cajón */}
              <div className="overflow-x-auto rounded-xl border border-parking-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-parking-border bg-parking-surface/50">
                      {['Cajón', 'Zona', 'Estado', 'Total sesiones', 'Duración prom.'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-mono text-parking-muted uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {occupancy.spaces.map(s => (
                      <tr key={s.id} className="border-b border-parking-border/50 hover:bg-parking-surface/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-white">#{s.number}</td>
                        <td className="px-4 py-3 font-mono text-xs text-parking-muted">{s.zone} / P{s.floor}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-mono ${
                            !s.enabled ? 'bg-parking-border text-parking-muted' :
                            s.status === 'FREE' ? 'bg-parking-free/15 text-parking-free' : 'bg-parking-occupied/15 text-parking-occupied'
                          }`}>
                            {!s.enabled ? 'Deshabilitado' : s.status === 'FREE' ? 'Libre' : 'Ocupado'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-parking-text">{s.totalSessions}</td>
                        <td className="px-4 py-3 font-mono text-xs text-parking-muted">
                          {s.avgDurationMins > 0 ? `${s.avgDurationMins} min` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB PAGOS PENDIENTES ── */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {loadingOccupancy ? (
            <div className="flex justify-center py-8">
              <div className="flex gap-2">{[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-parking-accent animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}</div>
            </div>
          ) : pendingPayments && (
            <>
              <div className="glass-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-parking-gold/20 flex items-center justify-center">
                  <span className="text-parking-gold text-lg">$</span>
                </div>
                <div>
                  <p className="text-xs text-parking-muted font-mono">Total pendiente de cobro</p>
                  <p className="font-display text-2xl font-bold text-parking-gold">
                    ${pendingPayments.totalPending.toFixed(2)} MXN
                  </p>
                </div>
              </div>

              {pendingPayments.payments.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <p className="text-parking-free text-sm">✓ No hay pagos pendientes</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-parking-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-parking-border bg-parking-surface/50">
                        {['Usuario', 'Cajón', 'Monto', 'Fecha'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-mono text-parking-muted uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pendingPayments.payments.map(p => (
                        <tr key={p.id} className="border-b border-parking-border/50">
                          <td className="px-4 py-3">
                            <p className="text-parking-text font-medium">{p.user?.name}</p>
                            <p className="text-xs text-parking-muted">{p.user?.email}</p>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-parking-text">
                            #{p.session?.parkingSpace?.number} — {p.session?.parkingSpace?.zone}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono font-semibold text-parking-gold">${p.amount.toFixed(2)}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-parking-muted">
                            {new Date(p.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
