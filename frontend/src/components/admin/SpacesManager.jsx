import { useState, useEffect } from 'react';
import axios from 'axios';

const ZONES = ['A', 'B', 'C', 'D'];

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative glass-card w-full max-w-md p-6 animate-slide-in"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg text-white">{title}</h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-parking-surface flex items-center justify-center text-parking-muted hover:text-white transition-colors">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SpaceForm({ initial = {}, onSubmit, loading }) {
  const [form, setForm] = useState({
    number: initial.number || '',
    sensorId: initial.sensorId || '',
    zone: initial.zone || 'A',
    floor: initial.floor || 1,
  });

  return (
    <div className="space-y-4">
      {[
        { key: 'number', label: 'Número de cajón', type: 'number', placeholder: '1' },
        { key: 'sensorId', label: 'ID del sensor', type: 'text', placeholder: 'SENSOR_A01' },
      ].map(({ key, label, type, placeholder }) => (
        <div key={key}>
          <label className="block text-xs font-mono text-parking-muted mb-1.5 uppercase tracking-wider">{label}</label>
          <input type={type} value={form[key]} placeholder={placeholder}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            className="w-full bg-parking-surface border border-parking-border rounded-xl px-4 py-3
                     text-parking-text placeholder:text-parking-muted/40 font-body
                     focus:outline-none focus:border-parking-accent transition-all" />
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-mono text-parking-muted mb-1.5 uppercase tracking-wider">Zona</label>
          <select value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}
            className="w-full bg-parking-surface border border-parking-border rounded-xl px-4 py-3
                     text-parking-text font-body focus:outline-none focus:border-parking-accent transition-all">
            {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-mono text-parking-muted mb-1.5 uppercase tracking-wider">Piso</label>
          <input type="number" value={form.floor} min="1" max="10"
            onChange={(e) => setForm({ ...form, floor: e.target.value })}
            className="w-full bg-parking-surface border border-parking-border rounded-xl px-4 py-3
                     text-parking-text font-body focus:outline-none focus:border-parking-accent transition-all" />
        </div>
      </div>
      <button onClick={() => onSubmit(form)} disabled={loading}
        className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 mt-2">
        {loading
          ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : initial.id ? 'Guardar cambios' : 'Crear cajón'}
      </button>
    </div>
  );
}

export default function SpacesManager() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | {space}
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterZone, setFilterZone] = useState('ALL');

  const load = async () => {
    try {
      const { data } = await axios.get('/api/admin/spaces');
      setSpaces(data);
    } catch { setError('Error al cargar cajones'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (form) => {
    setSaving(true); setError('');
    try {
      await axios.post('/api/admin/spaces', form);
      setModal(null); load();
    } catch (e) { setError(e.response?.data?.error || 'Error al crear'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (form) => {
    setSaving(true); setError('');
    try {
      await axios.put(`/api/admin/spaces/${modal.id}`, form);
      setModal(null); load();
    } catch (e) { setError(e.response?.data?.error || 'Error al editar'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (space) => {
    try {
      await axios.patch(`/api/admin/spaces/${space.id}/toggle`);
      load();
    } catch (e) { setError(e.response?.data?.error || 'Error'); }
  };

  const handleDelete = async (space) => {
    if (!confirm(`¿Eliminar el cajón #${space.number}? Esta acción no se puede deshacer.`)) return;
    try {
      await axios.delete(`/api/admin/spaces/${space.id}`);
      load();
    } catch (e) { setError(e.response?.data?.error || 'Error al eliminar'); }
  };

  const zones = ['ALL', ...new Set(spaces.map(s => s.zone)).values()].sort();
  const filtered = filterZone === 'ALL' ? spaces : spaces.filter(s => s.zone === filterZone);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-lg text-white">Cajones</h3>
          <p className="text-xs text-parking-muted mt-0.5">{spaces.length} cajones registrados</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary text-sm px-4 py-2">
          + Nuevo cajón
        </button>
      </div>

      {error && (
        <div className="bg-parking-occupied/10 border border-parking-occupied/30 rounded-xl px-4 py-3">
          <p className="text-parking-occupied text-sm">{error}</p>
        </div>
      )}

      {/* Filtro por zona */}
      <div className="flex gap-2 flex-wrap">
        {zones.map(z => (
          <button key={z} onClick={() => setFilterZone(z)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              filterZone === z
                ? 'bg-parking-accent text-white'
                : 'bg-parking-card border border-parking-border text-parking-muted hover:text-white'
            }`}>
            {z === 'ALL' ? 'Todos' : `Zona ${z}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="flex gap-2">{[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-parking-accent animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}</div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-parking-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-parking-border bg-parking-surface/50">
                {['Cajón', 'Zona / Piso', 'Sensor ID', 'Estado', 'Habilitado', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-mono text-parking-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(space => (
                <tr key={space.id} className="border-b border-parking-border/50 hover:bg-parking-surface/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-white">#{space.number}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-parking-muted text-xs">
                    {space.zone} / P{space.floor}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-parking-text">{space.sensorId}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium ${
                      space.status === 'FREE'
                        ? 'bg-parking-free/15 text-parking-free'
                        : 'bg-parking-occupied/15 text-parking-occupied'
                    }`}>
                      {space.status === 'FREE' ? 'Libre' : 'Ocupado'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(space)}
                      className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${
                        space.enabled ? 'bg-parking-free' : 'bg-parking-border'
                      }`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${
                        space.enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setModal(space)}
                        className="px-3 py-1.5 rounded-lg text-xs bg-parking-accent/15 text-parking-accent hover:bg-parking-accent/25 transition-colors font-mono">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(space)}
                        className="px-3 py-1.5 rounded-lg text-xs bg-parking-occupied/10 text-parking-occupied hover:bg-parking-occupied/20 transition-colors font-mono">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'create' && (
        <Modal title="Nuevo cajón" onClose={() => { setModal(null); setError(''); }}>
          <SpaceForm onSubmit={handleCreate} loading={saving} />
        </Modal>
      )}

      {modal && modal !== 'create' && (
        <Modal title={`Editar cajón #${modal.number}`} onClose={() => { setModal(null); setError(''); }}>
          <SpaceForm initial={modal} onSubmit={handleEdit} loading={saving} />
        </Modal>
      )}
    </div>
  );
}
