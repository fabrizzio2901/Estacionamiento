import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.name) { setError('El nombre es requerido'); return; }
        await register(form.email, form.password, form.name);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-parking-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-parking-free/8 rounded-full blur-3xl" />
      </div>

      {/* Grid lines decoration */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#6C63FF 1px, transparent 1px), linear-gradient(90deg, #6C63FF 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-md animate-slide-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-parking-accent flex items-center justify-center
                          shadow-lg shadow-parking-accent/40">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
            <span className="font-display text-3xl font-extrabold text-white tracking-tight">ParkIQ</span>
          </div>
          <p className="text-parking-muted text-sm">Sistema de Estacionamiento Inteligente</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          {/* Tab selector */}
          <div className="flex bg-parking-surface rounded-xl p-1 mb-6">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-display font-semibold transition-all duration-200 ${
                  mode === m
                    ? 'bg-parking-accent text-white shadow-md shadow-parking-accent/30'
                    : 'text-parking-muted hover:text-white'
                }`}
              >
                {m === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-mono text-parking-muted mb-1.5 uppercase tracking-wider">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Juan García"
                  className="w-full bg-parking-surface border border-parking-border rounded-xl px-4 py-3
                           text-parking-text placeholder:text-parking-muted/50 font-body
                           focus:outline-none focus:border-parking-accent focus:ring-2 focus:ring-parking-accent/20
                           transition-all duration-200"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-parking-muted mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="correo@ejemplo.com"
                required
                className="w-full bg-parking-surface border border-parking-border rounded-xl px-4 py-3
                         text-parking-text placeholder:text-parking-muted/50 font-body
                         focus:outline-none focus:border-parking-accent focus:ring-2 focus:ring-parking-accent/20
                         transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-parking-muted mb-1.5 uppercase tracking-wider">
                Contraseña
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
                className="w-full bg-parking-surface border border-parking-border rounded-xl px-4 py-3
                         text-parking-text placeholder:text-parking-muted/50 font-body
                         focus:outline-none focus:border-parking-accent focus:ring-2 focus:ring-parking-accent/20
                         transition-all duration-200"
              />
            </div>

            {error && (
              <div className="bg-parking-occupied/10 border border-parking-occupied/30 rounded-xl px-4 py-3">
                <p className="text-parking-occupied text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                mode === 'login' ? 'Entrar al sistema' : 'Crear cuenta'
              )}
            </button>
          </form>

          {/* Credenciales de prueba */}
          <div className="mt-6 p-4 bg-parking-surface/50 rounded-xl border border-parking-border/50">
            <p className="text-xs font-mono text-parking-muted text-center mb-2">Cuentas de prueba</p>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-parking-muted">
              <div>
                <p className="text-parking-accent">Admin</p>
                  <p>admin@parkiq.com</p>
                  <p>admin123</p>
              </div>
              <div>
                <p className="text-parking-free">Conductor</p>
                <p>conductor@parkiq.com</p>
                <p>driver123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
