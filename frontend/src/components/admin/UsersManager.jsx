import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative glass-card w-full max-w-md p-6 animate-slide-in"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg text-white">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-parking-surface flex items-center justify-center text-parking-muted hover:text-white transition-colors">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function UsersManager() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'DRIVER' });

  const load = async () => {
    try {
      const { data } = await axios.get('/api/admin/users');
      setUsers(data);
    } catch { setError('Error al cargar usuarios'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setSaving(true); setError('');
    try {
      await axios.post('/api/admin/users', form);
      setModal(false);
      setForm({ name: '', email: '', password: '', role: 'DRIVER' });
      load();
    } catch (e) { setError(e.response?.data?.error || 'Error al crear'); }
    finally { setSaving(false); }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await axios.patch(`/api/admin/users/${userId}/role`, { role });
      load();
    } catch (e) { setError(e.response?.data?.error || 'Error'); }
  };

  const handleToggle = async (userId) => {
    try {
      await axios.patch(`/api/admin/users/${userId}/toggle`);
      load();
    } catch (e) { setError(e.response?.data?.error || 'Error'); }
  };

  const handleDelete = async (user) => {
    if (!confirm(`¿Eliminar al usuario ${user.name}?`)) return;
    try {
      await axios.delete(`/api/admin/users/${user.id}`);
      load();
    } catch (e) { setError(e.response?.data?.error || 'Error al eliminar'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-lg text-white">Usuarios</h3>
          <p className="text-xs text-parking-muted mt-0.5">{users.length} usuarios registrados</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary text-sm px-4 py-2">
          + Nuevo usuario
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
      ) : (
        <div className="overflow-x-auto rounded-xl border border-parking-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-parking-border bg-parking-surface/50">
                {['Usuario', 'Rol', 'Sesiones', 'Estado', 'Registro', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-mono text-parking-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-parking-border/50 hover:bg-parking-surface/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-parking-text">{u.name}</p>
                    <p className="text-xs text-parking-muted">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      disabled={u.id === currentUser?.id}
                      className="bg-parking-surface border border-parking-border rounded-lg px-2 py-1 text-xs font-mono text-parking-text focus:outline-none focus:border-parking-accent disabled:opacity-40">
                      <option value="DRIVER">Conductor</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-parking-muted">
                    {u._count?.sessions || 0}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(u.id)}
                      disabled={u.id === currentUser?.id}
                      className={`relative w-10 h-5 rounded-full transition-colors duration-300 disabled:opacity-40 ${
                        u.active ? 'bg-parking-free' : 'bg-parking-border'
                      }`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${
                        u.active ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-parking-muted">
                    {new Date(u.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    {u.id !== currentUser?.id && (
                      <button onClick={() => handleDelete(u)}
                        className="px-3 py-1.5 rounded-lg text-xs bg-parking-occupied/10 text-parking-occupied hover:bg-parking-occupied/20 transition-colors font-mono">
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title="Nuevo usuario" onClose={() => { setModal(false); setError(''); }}>
          <div className="space-y-4">
            {[
              { key: 'name', label: 'Nombre completo', type: 'text', placeholder: 'Juan García' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'correo@ejemplo.com' },
              { key: 'password', label: 'Contraseña', type: 'password', placeholder: '••••••••' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-mono text-parking-muted mb-1.5 uppercase tracking-wider">{label}</label>
                <input type={type} value={form[key]} placeholder={placeholder}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className="w-full bg-parking-surface border border-parking-border rounded-xl px-4 py-3
                           text-parking-text placeholder:text-parking-muted/40
                           focus:outline-none focus:border-parking-accent transition-all" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-mono text-parking-muted mb-1.5 uppercase tracking-wider">Rol</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full bg-parking-surface border border-parking-border rounded-xl px-4 py-3
                         text-parking-text focus:outline-none focus:border-parking-accent transition-all">
                <option value="DRIVER">Conductor</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            {error && <p className="text-parking-occupied text-sm">{error}</p>}
            <button onClick={handleCreate} disabled={saving}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 mt-2">
              {saving
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : 'Crear usuario'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
