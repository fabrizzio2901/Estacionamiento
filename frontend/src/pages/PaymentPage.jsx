import { useState, useEffect } from 'react';
import axios from 'axios';

// Simulación del flujo de Stripe Elements
// En producción reemplaza con @stripe/react-stripe-js
function StripeCardForm({ clientSecret, amount, onSuccess, onCancel }) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const formatCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = (v) => {
    const clean = v.replace(/\D/g, '').slice(0, 4);
    return clean.length >= 3 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean;
  };

  const handlePay = async () => {
    if (!cardNumber || !expiry || !cvc || !name) {
      setError('Completa todos los campos');
      return;
    }
    setProcessing(true);
    setError('');

    // En producción: usa stripe.confirmCardPayment(clientSecret, { payment_method: { card } })
    // Aquí simulamos una respuesta exitosa después de 2 segundos
    await new Promise(r => setTimeout(r, 2000));
    onSuccess();
    setProcessing(false);
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 flex items-center justify-between">
        <span className="text-parking-muted text-sm font-mono">Total a pagar</span>
        <span className="font-display text-2xl font-bold text-parking-gold">${amount.toFixed(2)} MXN</span>
      </div>

      <div>
        <label className="block text-xs font-mono text-parking-muted mb-1.5 uppercase tracking-wider">
          Nombre en la tarjeta
        </label>
        <input type="text" value={name} placeholder="JUAN GARCIA"
          onChange={e => setName(e.target.value.toUpperCase())}
          className="w-full bg-parking-surface border border-parking-border rounded-xl px-4 py-3
                   text-parking-text placeholder:text-parking-muted/40 font-mono uppercase
                   focus:outline-none focus:border-parking-accent transition-all" />
      </div>

      <div>
        <label className="block text-xs font-mono text-parking-muted mb-1.5 uppercase tracking-wider">
          Número de tarjeta
        </label>
        <div className="relative">
          <input type="text" value={cardNumber} placeholder="1234 5678 9012 3456"
            onChange={e => setCardNumber(formatCard(e.target.value))}
            className="w-full bg-parking-surface border border-parking-border rounded-xl px-4 py-3 pr-12
                     text-parking-text placeholder:text-parking-muted/40 font-mono
                     focus:outline-none focus:border-parking-accent transition-all" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
            <div className="w-7 h-5 rounded bg-parking-border flex items-center justify-center">
              <span className="text-[8px] text-parking-muted font-bold">VISA</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-mono text-parking-muted mb-1.5 uppercase tracking-wider">Vencimiento</label>
          <input type="text" value={expiry} placeholder="MM/AA"
            onChange={e => setExpiry(formatExpiry(e.target.value))}
            className="w-full bg-parking-surface border border-parking-border rounded-xl px-4 py-3
                     text-parking-text placeholder:text-parking-muted/40 font-mono
                     focus:outline-none focus:border-parking-accent transition-all" />
        </div>
        <div>
          <label className="block text-xs font-mono text-parking-muted mb-1.5 uppercase tracking-wider">CVC</label>
          <input type="text" value={cvc} placeholder="123" maxLength={4}
            onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="w-full bg-parking-surface border border-parking-border rounded-xl px-4 py-3
                     text-parking-text placeholder:text-parking-muted/40 font-mono
                     focus:outline-none focus:border-parking-accent transition-all" />
        </div>
      </div>

      {error && (
        <div className="bg-parking-occupied/10 border border-parking-occupied/30 rounded-xl px-4 py-3">
          <p className="text-parking-occupied text-sm">{error}</p>
        </div>
      )}

      <button onClick={handlePay} disabled={processing}
        className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
        {processing ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Procesando pago...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Pagar ${amount.toFixed(2)} MXN
          </>
        )}
      </button>

      <button onClick={onCancel}
        className="w-full btn-ghost text-sm">
        Cancelar
      </button>

      <p className="text-center text-xs text-parking-muted">
        🔒 Pago seguro procesado por Stripe
      </p>
    </div>
  );
}

export default function PaymentPage() {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await axios.get('/api/payments/pending');
      setPendingPayments(data);
    } catch { setError('Error al cargar pagos'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSelectPayment = async (payment) => {
    setCreating(true); setError('');
    try {
      const { data } = await axios.post('/api/payments/create-intent', { sessionId: payment.sessionId });
      setSelectedPayment(payment);
      setPaymentIntent(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Error al iniciar pago');
    } finally { setCreating(false); }
  };

  const handleSuccess = async () => {
    try {
      await axios.post(`/api/payments/confirm/${paymentIntent.paymentId}`);
      setSuccess(true);
      setSelectedPayment(null);
      setPaymentIntent(null);
      load();
    } catch (e) { setError('Error al confirmar pago'); }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-fade-up">
        <div className="w-20 h-20 rounded-full bg-parking-free/20 border-2 border-parking-free
                      flex items-center justify-center text-4xl mb-6 animate-glow">
          ✓
        </div>
        <h2 className="font-display text-2xl font-bold text-white mb-2">¡Pago exitoso!</h2>
        <p className="text-parking-muted text-center mb-8">Tu pago ha sido procesado correctamente.</p>
        <button onClick={() => setSuccess(false)} className="btn-primary">
          Ver mis pagos
        </button>
      </div>
    );
  }

  if (paymentIntent && selectedPayment) {
    return (
      <div className="max-w-md mx-auto animate-fade-up">
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold text-white">Pagar estancia</h2>
          <p className="text-parking-muted text-sm mt-1">
            Cajón #{selectedPayment.session?.parkingSpace?.number} — Zona {selectedPayment.session?.parkingSpace?.zone}
          </p>
        </div>
        <StripeCardForm
          clientSecret={paymentIntent.clientSecret}
          amount={paymentIntent.amount}
          onSuccess={handleSuccess}
          onCancel={() => { setSelectedPayment(null); setPaymentIntent(null); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <h2 className="font-display text-2xl font-bold text-white">Mis Pagos</h2>

      {error && (
        <div className="bg-parking-occupied/10 border border-parking-occupied/30 rounded-xl px-4 py-3">
          <p className="text-parking-occupied text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="flex gap-2">{[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-parking-accent animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}</div>
        </div>
      ) : pendingPayments.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-parking-free/10 border border-parking-free/20
                        flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
          <p className="font-display text-lg font-semibold text-white mb-1">Sin pagos pendientes</p>
          <p className="text-sm text-parking-muted">Estás al corriente con todos tus pagos</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-parking-muted">{pendingPayments.length} pago{pendingPayments.length !== 1 ? 's' : ''} pendiente{pendingPayments.length !== 1 ? 's' : ''}</p>
          {pendingPayments.map(payment => (
            <div key={payment.id} className="glass-card p-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-display font-semibold text-white">
                  Cajón #{payment.session?.parkingSpace?.number}
                  <span className="text-parking-muted font-normal text-sm ml-2">
                    Zona {payment.session?.parkingSpace?.zone}
                  </span>
                </p>
                <p className="text-xs text-parking-muted font-mono mt-1">
                  {new Date(payment.createdAt).toLocaleDateString('es-MX', {
                    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="font-display text-xl font-bold text-parking-gold">
                  ${payment.amount.toFixed(2)}
                </span>
                <button onClick={() => handleSelectPayment(payment)} disabled={creating}
                  className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                  {creating ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Pagar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
