import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../hooks/useSocket';

function ParkingSpaceCard({ space, isNew }) {
  const isFree = space.status === 'FREE';
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (isNew) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 700);
      return () => clearTimeout(t);
    }
  }, [isNew]);

  return (
    <div
      className={`
        relative border-2 rounded-xl p-3 flex flex-col items-center justify-center
        transition-all duration-500 cursor-default select-none
        ${isFree ? 'space-free' : 'space-occupied'}
        ${flash ? 'space-just-changed' : ''}
        aspect-square
      `}
    >
      {/* Número del cajón */}
      <span className="font-mono text-xs text-parking-muted mb-1">
        {String(space.number).padStart(2, '0')}
      </span>

      {/* Ícono de estado */}
      <div className={`text-2xl ${isFree ? 'text-parking-free' : 'text-parking-occupied'}`}>
        {isFree ? (
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
          </svg>
        ) : (
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm7 3a3 3 0 00-3 3v2h6V9a3 3 0 00-3-3zm0 2a1 1 0 011 1v2h-2V9a1 1 0 011-1z" />
          </svg>
        )}
      </div>

      {/* Badge de zona */}
      <span className={`
        mt-1.5 text-xs font-mono font-medium px-1.5 py-0.5 rounded-md
        ${isFree
          ? 'bg-parking-free/20 text-parking-free'
          : 'bg-parking-occupied/20 text-parking-occupied'}
      `}>
        {space.zone}{space.number}
      </span>

      {/* Indicador en vivo cuando está ocupado */}
      {!isFree && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-parking-occupied animate-pulse" />
      )}
    </div>
  );
}

export default function ParkingGrid() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [changedIds, setChangedIds] = useState(new Set());
  const [filter, setFilter] = useState('ALL');
  const { connected, onSpaceUpdate } = useSocket();

  // Cargar estado inicial
  useEffect(() => {
    axios.get('/api/spaces')
      .then(({ data }) => setSpaces(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Escuchar actualizaciones en tiempo real
  useEffect(() => {
    const cleanup = onSpaceUpdate((data) => {
      if (data.type === 'INITIAL') {
        setSpaces(data.spaces);
        return;
      }

      // Actualizar el cajón que cambió
      setSpaces((prev) =>
        prev.map((s) =>
          s.id === data.spaceId ? { ...s, status: data.status } : s
        )
      );

      // Activar animación de flash
      setChangedIds((prev) => {
        const next = new Set(prev);
        next.add(data.spaceId);
        setTimeout(() => {
          setChangedIds((p) => {
            const n = new Set(p);
            n.delete(data.spaceId);
            return n;
          });
        }, 800);
        return next;
      });
    });

    return cleanup;
  }, []);

  const filtered = spaces.filter((s) => {
    if (filter === 'FREE') return s.status === 'FREE';
    if (filter === 'OCCUPIED') return s.status === 'OCCUPIED';
    return true;
  });

  const freeCount = spaces.filter((s) => s.status === 'FREE').length;
  const occupiedCount = spaces.filter((s) => s.status === 'OCCUPIED').length;
  const occupancyPct = spaces.length > 0 ? Math.round((occupiedCount / spaces.length) * 100) : 0;

  const zones = [...new Set(spaces.map((s) => s.zone))].sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
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
      {/* Header con stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Mapa en Vivo</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-parking-free animate-pulse' : 'bg-parking-muted'}`} />
            <span className="text-sm text-parking-muted font-mono">
              {connected ? 'Conectado • Tiempo real' : 'Reconectando...'}
            </span>
          </div>
        </div>

        {/* Mini stats */}
        <div className="flex items-center gap-3">
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-parking-free" />
            <span className="font-mono text-sm text-parking-free font-medium">{freeCount} libre{freeCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-parking-occupied" />
            <span className="font-mono text-sm text-parking-occupied font-medium">{occupiedCount} ocupado{occupiedCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Barra de ocupación */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-parking-muted">Ocupación total</span>
          <span className="font-mono text-sm font-medium text-parking-text">{occupancyPct}%</span>
        </div>
        <div className="h-2 bg-parking-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${occupancyPct}%`,
              background: occupancyPct > 80
                ? 'linear-gradient(90deg, #FF3B5C, #FF6B35)'
                : occupancyPct > 50
                ? 'linear-gradient(90deg, #FFD166, #FF9500)'
                : 'linear-gradient(90deg, #00E5A0, #00B4D8)',
            }}
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {['ALL', 'FREE', 'OCCUPIED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-body font-medium transition-all duration-200 ${
              filter === f
                ? 'bg-parking-accent text-white shadow-lg shadow-parking-accent/30'
                : 'bg-parking-card border border-parking-border text-parking-muted hover:text-white hover:border-parking-accent/50'
            }`}
          >
            {f === 'ALL' ? 'Todos' : f === 'FREE' ? '✓ Libres' : '● Ocupados'}
          </button>
        ))}
      </div>

      {/* Grid por zonas */}
      {zones.map((zone) => {
        const zoneSpaces = filtered.filter((s) => s.zone === zone);
        if (zoneSpaces.length === 0) return null;

        return (
          <div key={zone}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-parking-accent/20 border border-parking-accent/30
                            flex items-center justify-center">
                <span className="font-display font-bold text-parking-accent text-sm">{zone}</span>
              </div>
              <span className="font-display font-semibold text-parking-text">Zona {zone}</span>
              <div className="flex-1 h-px bg-parking-border" />
              <span className="font-mono text-xs text-parking-muted">
                {zoneSpaces.filter((s) => s.status === 'FREE').length}/{zoneSpaces.length} libres
              </span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {zoneSpaces.map((space) => (
                <ParkingSpaceCard
                  key={space.id}
                  space={space}
                  isNew={changedIds.has(space.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
