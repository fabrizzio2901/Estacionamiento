import { useState, useEffect } from 'react';
import axios from 'axios';

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative glass-card w-full max-w-lg p-6 animate-slide-in"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg text-white">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-parking-surface flex items-center justify-center text-parking-muted hover:text-white">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const emptyForm = { name: '', type: 'HOURLY', pricePerHour: '', ranges: [{ fromHour: 0, toHour: 2, price: 20 }] };

export default function PricingManager() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await axios.get('/api/pricing/all');
      setRules(data);
    } catch { setError('Error al cargar tarifas'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const addRange = () =>
    setForm({ ...form, ranges: [...form.ranges, { fromHour: 0, toHour: 1, price: 10 }] });

  const removeRange = (i) =>
    setForm({ ...form, ranges: form.ranges.filter((_, idx) => idx !== i) });

  const updateRange = (i, key, val) => {
    const r = [...form.ranges];
    r[i] = { ...r[i], [key]: val };
    setForm({ ...form, ranges: r });
  };

  const handleSubmit = async () => {
    setSaving(true); setError('');
    try {
      const payload = {
        name: form.name,
        type: form.type,
        pricePerHour: form.type === 'HOURLY' ? Number(form.pricePerHour) : null,
        ranges: form.type === 'RANGES' ? form.ranges : null,
      };
      if (modal?.id) {
        await axios.put(`/api/pricing/${modal.id}`, payload);
      } else {
        await axios.post('/api/pricing', payload);
      }
      setModal(null);
      setForm(emptyForm);
      load();
    } catch (e) { setError(e.response?.data?.error || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleActivate = async (id) => {
    try {
      await axios.patch(`/api/pricing/${id}/activate`);
      load();
    } catch (e) { setError(e.response?.data?.error || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta tarifa?')) return;
    try {
      await axios.delete(`/api/pricing/${id}`);
      load();
    } catch (e) { setError(e.response?.data?.error || 'Error'); }
  };

  const openEdit = (rule) => {
    setForm({
      name: rule.name,
      type: rule.type,
      pricePerHour: rule.pricePerHour || '',
      ranges: rule.ranges || [{ fromHour: 0, toHour: 2, price: 20 }],
    });
    setModal(rule);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-lg text-white">Tarifas</h3>
          <p className="text-xs text-parking-muted mt-0.5">Solo una tarifa puede estar activa a la vez</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setModal({}); }} className="btn-primary text-sm px-4 py-2">
          + Nueva tarifa
        </button>
      </div>

      {error && (
        <div className="bg-parking-occupied/10 border border-parking-occupied/30 rounded-xl px-4 py-3">
          <p className="text-parking-occupied text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="flex gap-2">{[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-parking-accent animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}</div>
        </div>
      ) : rules.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-parking-muted text-sm">No hay tarifas configuradas. Crea la primera.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {rules.map(rule => (
            <div key={rule.id} className={`glass-card p-5 flex items-center justify-between gap-4 ${
              rule.isActive ? 'border-parking-gold/40' : ''
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                  rule.isActive ? 'bg-parking-gold/20 text-parking-gold' : 'bg-parking-surface text-parking-muted'
                }`}>
                  {rule.type === 'HOURLY' ? '⏱' : '📊'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display font-semibold text-white">{rule.name}</p>
                    {rule.isActive && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-parking-gold/20 text-parking-gold font-mono">
                        Activa
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-parking-muted mt-0.5">
                    {rule.type === 'HOURLY'
                      ? `$${rule.pricePerHour} MXN / hora`
                      : `${rule.ranges?.length || 0} rangos de tiempo`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {!rule.isActive && (
                  <button onClick={() => handleActivate(rule.id)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-parking-gold/15 text-parking-gold hover:bg-parking-gold/25 transition-colors font-mono">
                    Activar
                  </button>
                )}
                <button onClick={() => openEdit(rule)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-parking-accent/15 text-parking-accent hover:bg-parking-accent/25 transition-colors font-mono">
                  Editar
                </button>
                {!rule.isActive && (
                  <button onClick={() => handleDelete(rule.id)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-parking-occupied/10 text-parking-occupied hover:bg-parking-occupied/20 transition-colors font-mono">
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <Modal title={modal?.id ? 'Editar tarifa' : 'Nueva tarifa'} onClose={() => { setModal(null); setError(''); }}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-parking-muted mb-1.5 uppercase tracking-wider">Nombre</label>
              <input type="text" value={form.name} placeholder="Ej: Tarifa estándar"
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-parking-surface border border-parking-border rounded-xl px-4 py-3 text-parking-text placeholder:text-parking-muted/40 focus:outline-none focus:border-parking-accent transition-all" />
            </div>

            <div>
              <label className="block text-xs font-mono text-parking-muted mb-1.5 uppercase tracking-wider">Tipo</label>
              <div className="flex gap-2">
                {[['HOURLY', '⏱ Por hora'], ['RANGES', '📊 Por rangos']].map(([val, label]) => (
                  <button key={val} onClick={() => setForm({ ...form, type: val })}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-display font-semibold transition-all ${
                      form.type === val ? 'bg-parking-accent text-white' : 'bg-parking-surface border border-parking-border text-parking-muted hover:text-white'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {form.type === 'HOURLY' && (
              <div>
                <label className="block text-xs font-mono text-parking-muted mb-1.5 uppercase tracking-wider">Precio por hora (MXN)</label>
                <input type="number" value={form.pricePerHour} placeholder="20"
                  onChange={e => setForm({ ...form, pricePerHour: e.target.value })}
                  className="w-full bg-parking-surface border border-parking-border rounded-xl px-4 py-3 text-parking-text placeholder:text-parking-muted/40 focus:outline-none focus:border-parking-accent transition-all" />
              </div>
            )}

            {form.type === 'RANGES' && (
              <div className="space-y-3">
                <label className="block text-xs font-mono text-parking-muted uppercase tracking-wider">Rangos de tiempo</label>
                {form.ranges.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 bg-parking-surface rounded-xl p-3">
                    <div className="flex-1 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-parking-muted mb-1">Desde (h)</p>
                        <input type="number" value={r.fromHour} min="0"
                          onChange={e => updateRange(i, 'fromHour', Number(e.target.value))}
                          className="w-full bg-parking-bg border border-parking-border rounded-lg px-2 py-1.5 text-parking-text focus:outline-none focus:border-parking-accent" />
                      </div>
                      <div>
                        <p className="text-parking-muted mb-1">Hasta (h)</p>
                        <input type="number" value={r.toHour} min="1"
                          onChange={e => updateRange(i, 'toHour', Number(e.target.value))}
                          className="w-full bg-parking-bg border border-parking-border rounded-lg px-2 py-1.5 text-parking-text focus:outline-none focus:border-parking-accent" />
                      </div>
                      <div>
                        <p className="text-parking-muted mb-1">Precio $MXN</p>
                        <input type="number" value={r.price}
                          onChange={e => updateRange(i, 'price', Number(e.target.value))}
                          className="w-full bg-parking-bg border border-parking-border rounded-lg px-2 py-1.5 text-parking-text focus:outline-none focus:border-parking-accent" />
                      </div>
                    </div>
                    {form.ranges.length > 1 && (
                      <button onClick={() => removeRange(i)}
                        className="w-7 h-7 rounded-lg bg-parking-occupied/15 text-parking-occupied hover:bg-parking-occupied/25 flex items-center justify-center text-sm flex-shrink-0">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={addRange}
                  className="w-full py-2 rounded-xl border border-dashed border-parking-border text-parking-muted hover:text-white hover:border-parking-accent transition-all text-sm">
                  + Agregar rango
                </button>
              </div>
            )}

            {error && <p className="text-parking-occupied text-sm">{error}</p>}
            <button onClick={handleSubmit} disabled={saving}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 mt-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Guardar tarifa'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
