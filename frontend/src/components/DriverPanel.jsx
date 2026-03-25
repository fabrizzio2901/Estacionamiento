import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function formatDuration(mins) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m > 0 ? `${m}min` : ''}`;
}

export default function DriverPanel() {
  const { user } = useAuth();
  const [sessionData, setSessionData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveMinutes, setLiveMinutes] = useState(0);
  const [liveCost, setLiveCost] = useState(0);

  useEffect(() => {
    Promise.all([
      axios.get('/api/sessions/active'),
      axios.get('/api/sessions/history'),
    ])
      .then(([activeRes, historyRes]) => {
        setSessionData(activeRes.data);
        setHistory(historyRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Actualizar costo en tiempo real si hay sesión activa
  useEffect(() => {
    if (!sessionData?.session) return;

    const entryTime = new Date(sessionData.session.entryTime);
    const tarifaHora = sessionData.tarifaHora || 20;

    const tick = () => {
      const now = new Date();
      const diffMs = now - entryTime;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = diffMs / 3600000;
      setLiveMinutes(diffMins);
      setLiveCost(parseFloat((diffHours * tarifaHora).toFixed(2)));
    };

    tick();
    const interval = setInterval(tick, 30000); // actualizar cada 30s
    return () => clearInterval(interval);
  }, [sessionData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-parking-accent animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <h2 className="font-display text-2xl font-bold text-white">Mi Estancia</h2>

      {/* Sesión activa */}
      {sessionData?.session ? (
        <div className="glass-card p-6 border-parking-free/30">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-parking-free animate-pulse" />
                <span className="text-xs font-mono text-parking-free uppercase tracking-widest">Sesión Activa</span>
              </div>
              <h3 className="font-display text-xl font-bold text-white">
                Cajón {sessionData.session.parkingSpace?.number}
                <span className="text-parking-muted text-base font-normal ml-2">
                  Zona {sessionData.session.parkingSpace?.zone}
                </span>
              </h3>
            </div>
            <div className="text-right">
              <p className="text-xs text-parking-muted mb-1">Entrada</p>
              <p className="font-mono text-sm text-parking-text">
                {new Date(sessionData.session.entryTime).toLocaleTimeString('es-MX', {
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {/* Stats en tiempo real */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-parking-surface rounded-xl p-4 text-center">
              <p className="text-xs text-parking-muted mb-1 font-mono uppercase tracking-wider">Tiempo</p>
              <p className="font-display text-3xl font-bold text-white">{formatDuration(liveMinutes)}</p>
            </div>
            <div className="bg-parking-surface rounded-xl p-4 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-parking-gold/5 to-transparent" />
              <p className="text-xs text-parking-muted mb-1 font-mono uppercase tracking-wider">Costo actual</p>
              <p className="font-display text-3xl font-bold text-parking-gold">
                ${liveCost.toFixed(2)}
                <span className="text-sm font-body font-normal text-parking-muted ml-1">MXN</span>
              </p>
            </div>
          </div>

          <p className="text-xs text-parking-muted text-center mt-3">
            El cobro se calcula al salir del cajón • Tarifa: ${sessionData.tarifaHora || 20}/hr
          </p>
        </div>
      ) : (
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-parking-surface border border-parking-border
                        flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-parking-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
            </svg>
          </div>
          <p className="font-display text-lg font-semibold text-parking-text mb-1">Sin sesión activa</p>
          <p className="text-sm text-parking-muted">Cuando entres a un cajón aparecerá tu estancia aquí</p>
        </div>
      )}

      {/* Historial */}
      {history.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-display font-semibold text-white mb-4">Historial reciente</h3>
          <div className="space-y-3">
            {history.slice(0, 5).map((session) => (
              <div key={session.id}
                className="flex items-center justify-between py-3 border-b border-parking-border last:border-0">
                <div>
                  <p className="font-medium text-parking-text text-sm">
                    Cajón {session.parkingSpace?.number} — Zona {session.parkingSpace?.zone}
                  </p>
                  <p className="text-xs text-parking-muted font-mono">
                    {new Date(session.entryTime).toLocaleDateString('es-MX', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                    {session.durationMins && ` · ${formatDuration(session.durationMins)}`}
                  </p>
                </div>
                <div className="text-right">
                  {session.payment ? (
                    <>
                      <p className={`font-mono font-medium text-sm ${
                        session.payment.status === 'PAID' ? 'text-parking-free' : 'text-parking-gold'
                      }`}>
                        ${session.payment.amount.toFixed(2)}
                      </p>
                      <span className={`text-xs ${
                        session.payment.status === 'PAID' ? 'text-parking-free' : 'text-parking-gold'
                      }`}>
                        {session.payment.status === 'PAID' ? '✓ Pagado' : 'Pendiente'}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-parking-muted">Sin cobro</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
