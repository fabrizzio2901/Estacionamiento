/**
 * RF-01: Vista de Billetera Virtual
 * RF-02: Formulario de recarga vía Stripe Test Mode
 * RF-03: Indicador visual de saldo negativo
 */
import { useState, useEffect } from 'react';
import axios from 'axios';

// Simulación de Stripe Elements (Test Mode)
// En producción: instalar @stripe/react-stripe-js y usar <CardElement />
function TopUpForm({ onSuccess, onCancel }) {
  const [amount, setAmount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const QUICK_AMOUNTS = [50, 100, 200, 500];

  const formatCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = (v) => {
    const c = v.replace(/\D/g, '').slice(0, 4);
    return c.length >= 3 ? `${c.slice(0, 2)}/${c.slice(2)}` : c;
  };

  const handleTopUp = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) { setError('Ingresa un monto válido'); return; }
    if (!cardNumber || !expiry || !cvc || !name) { setError('Completa todos los campos'); return; }

    setProcessing(true); setError('');
    try {
      // RF-02: Crear PaymentIntent en Stripe Test Mode
      const { data: intent } = await axios.post('/api/wallet/topup/create-intent', { amount: parsed });

      // En producción: stripe.confirmCardPayment(intent.clientSecret, { payment_method: { card } })
      // Para Test Mode simulamos el delay de Stripe
      await new Promise(r => setTimeout(r, 1800));

      // Confirmar recarga
      const { data: confirmed } = await axios.post(`/api/wallet/topup/confirm/${intent.topUpId}`);
      onSuccess(confirmed.newBalance, parsed);
    } catch (e) {
      setError(e.response?.data?.error || 'Error al procesar la recarga');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Montos rápidos */}
      <div>
        <label className="block text-xs font-mono text-parking-muted mb-2 uppercase tracking-wider">
          Monto a recargar (MXN)
        </label>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {QUICK_AMOUNTS.map(q => (
            <button key={q} onClick={() => setAmount(String(q))}
              className={`py-2 rounded-xl text-sm font-mono font-medium border transition-all ${
                amount === String(q)
                  ? 'bg-parking-accent border-parking-accent text-white'
                  : 'bg-parking-surface border-parking-border text-parking-muted hover:border-parking-accent/50'
              }`}>
              ${q}
            </button>
          ))}
        </div>
        <input type="number" value={amount} placeholder="Otro monto..." min="10"
          onChange={e => setAmount(e.target.value)}
          className="w-full bg-parking-surface border border-parking-border rounded-xl px-4 py-3
                   text-parking-text placeholder:text-parking-muted/40 font-mono
                   focus:outline-none focus:border-parking-accent transition-all" />
      </div>

      <div className="border-t border-parking-border pt-4">
        <p className="text-xs text-parking-muted mb-3 font-mono uppercase tracking-wider">
          Datos de tarjeta (Stripe Test Mode)
        </p>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 mb-3">
          <p className="text-xs text-amber-400">
            🧪 Modo prueba — usa tarjeta <span className="font-mono font-bold">4242 4242 4242 4242</span>, cualquier fecha y CVC
          </p>
        </div>

        <div className="space-y-3">
          <input type="text" value={name} placeholder="NOMBRE EN LA TARJETA"
            onChange={e => setName(e.target.value.toUpperCase())}
            className="w-full bg-parking-surface border border-parking-border rounded-xl px-4 py-3
                     text-parking-text placeholder:text-parking-muted/40 font-mono uppercase
                     focus:outline-none focus:border-parking-accent transition-all" />
          <input type="text" value={cardNumber} placeholder="1234 5678 9012 3456"
            onChange={e => setCardNumber(formatCard(e.target.value))}
            className="w-full bg-parking-surface border border-parking-border rounded-xl px-4 py-3
                     text-parking-text placeholder:text-parking-muted/40 font-mono
                     focus:outline-none focus:border-parking-accent transition-all" />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={expiry} placeholder="MM/AA"
              onChange={e => setExpiry(formatExpiry(e.target.value))}
              className="w-full bg-parking-surface border border-parking-border rounded-xl px-4 py-3
                       text-parking-text placeholder:text-parking-muted/40 font-mono
                       focus:outline-none focus:border-parking-accent transition-all" />
            <input type="text" value={cvc} placeholder="CVC" maxLength={4}
              onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full bg-parking-surface border border-parking-border rounded-xl px-4 py-3
                       text-parking-text placeholder:text-parking-muted/40 font-mono
                       focus:outline-none focus:border-parking-accent transition-all" />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-parking-occupied/10 border border-parking-occupied/30 rounded-xl px-4 py-3">
          <p className="text-parking-occupied text-sm">{error}</p>
        </div>
      )}

      <button onClick={handleTopUp} disabled={processing}
        className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
        {processing ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Procesando recarga...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4v16m8-8H4" />
            </svg>
            Recargar {amount ? `$${amount} MXN` : 'billetera'}
          </>
        )}
      </button>
      <button onClick={onCancel} className="w-full btn-ghost text-sm">Cancelar</button>
      <p className="text-center text-xs text-parking-muted">🔒 Pago seguro procesado por Stripe (Test Mode)</p>
    </div>
  );
}

export default function WalletPage() {
  const [balance, setBalance] = useState(null);
  const [isNegative, setIsNegative] = useState(false);
  const [topUps, setTopUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const load = async () => {
    try {
      const [balRes, histRes] = await Promise.all([
        axios.get('/api/wallet/balance'),
        axios.get('/api/wallet/topups'),
      ]);
      setBalance(balRes.data.balance);
      setIsNegative(balRes.data.isNegative);
      setTopUps(histRes.data);
    } catch (e) {
      console.error('Error cargando billetera:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSuccess = (newBalance, amount) => {
    setBalance(newBalance);
    setIsNegative(newBalance < 0);
    setShowTopUp(false);
    setSuccessMsg(`¡Recarga de $${amount} MXN exitosa!`);
    setTimeout(() => setSuccessMsg(''), 4000);
    load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-parking-accent animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up max-w-md mx-auto">
      <h2 className="font-display text-2xl font-bold text-white">Mi Billetera</h2>

      {successMsg && (
        <div className="bg-parking-free/10 border border-parking-free/30 rounded-xl px-4 py-3">
          <p className="text-parking-free text-sm font-medium">✓ {successMsg}</p>
        </div>
      )}

      {/* Saldo principal — RF-03: color rojo si es negativo */}
      <div className={`glass-card p-6 ${isNegative ? 'border-parking-occupied/40' : 'border-parking-free/20'}`}>
        <p className="text-xs font-mono text-parking-muted uppercase tracking-widest mb-2">
          Saldo disponible
        </p>
        <div className="flex items-end gap-2 mb-4">
          <span className={`font-display text-5xl font-bold ${isNegative ? 'text-parking-occupied' : 'text-parking-free'}`}>
            ${balance?.toFixed(2)}
          </span>
          <span className="text-parking-muted mb-1 font-mono">MXN</span>
        </div>

        {/* RF-03: Advertencia de saldo negativo */}
        {isNegative && (
          <div className="bg-parking-occupied/10 border border-parking-occupied/30 rounded-xl px-4 py-3 mb-4">
            <p className="text-parking-occupied text-sm font-medium">
              ⚠️ Saldo pendiente — No podrás ingresar al estacionamiento hasta recargar tu billetera.
            </p>
          </div>
        )}

        {!showTopUp ? (
          <button onClick={() => setShowTopUp(true)}
            className="w-full btn-primary flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Recargar billetera
          </button>
        ) : (
          <TopUpForm onSuccess={handleSuccess} onCancel={() => setShowTopUp(false)} />
        )}
      </div>

      {/* Historial de recargas */}
      {topUps.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-display font-semibold text-white mb-4">Historial de recargas</h3>
          <div className="space-y-3">
            {topUps.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-parking-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-parking-text">Recarga via Stripe</p>
                  <p className="text-xs text-parking-muted font-mono">
                    {new Date(t.createdAt).toLocaleDateString('es-MX', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold text-parking-free">+${t.amount.toFixed(2)}</p>
                  <span className={`text-xs ${t.status === 'PAID' ? 'text-parking-free' : 'text-parking-gold'}`}>
                    {t.status === 'PAID' ? '✓ Acreditado' : 'Pendiente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
