/**
 * RF-04: Botón "Mostrar QR de Acceso" en la vista principal del conductor
 * RF-05: Renderizado del código QR en canvas
 * RF-06: Payload encriptado (solo userId + exp, sin datos sensibles)
 */
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';

function QRDisplay({ qrToken, userName }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!qrToken || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, qrToken, {
      width: 220,
      margin: 2,
      color: { dark: '#0f172a', light: '#f8fafc' },
    }).catch(console.error);
  }, [qrToken]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="p-3 bg-[#f8fafc] rounded-2xl shadow-2xl shadow-parking-accent/20">
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>
      <p className="text-xs text-parking-muted font-mono text-center">
        {userName} · Muestra este código al escáner
      </p>
    </div>
  );
}

export default function QRAccessCard() {
  const [qrToken, setQrToken] = useState(null);
  const [userName, setUserName] = useState('');
  const [walletBalance, setWalletBalance] = useState(null);
  const [isNegative, setIsNegative] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const handleMostrarQR = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await axios.get('/api/qr/generar');
      setQrToken(data.qrToken);
      setUserName(data.userName);
      setWalletBalance(data.walletBalance);
      setIsNegative(data.isNegative);
      setShowQR(true);

      // Contador regresivo de 10 min (600 segundos)
      setCountdown(600);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setShowQR(false);
            setQrToken(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e) {
      setError(e.response?.data?.error || 'Error al generar QR');
    } finally {
      setLoading(false);
    }
  };

  const handleOcultar = () => {
    setShowQR(false);
    clearInterval(timerRef.current);
  };

  const formatCountdown = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-parking-accent/20 border border-parking-accent/30
                      flex items-center justify-center">
          <svg className="w-5 h-5 text-parking-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
          </svg>
        </div>
        <div>
          <h3 className="font-display font-semibold text-white">Acceso QR</h3>
          <p className="text-xs text-parking-muted">Tu código para entrar y salir</p>
        </div>
      </div>

      {/* RF-03: advertencia de saldo negativo */}
      {isNegative && walletBalance !== null && (
        <div className="bg-parking-occupied/10 border border-parking-occupied/30 rounded-xl px-4 py-3 mb-4">
          <p className="text-parking-occupied text-sm">
            ⚠️ Saldo negativo (${walletBalance?.toFixed(2)} MXN) — el acceso de entrada será denegado.
            Ve a <strong>Billetera</strong> para recargar.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-parking-occupied/10 border border-parking-occupied/30 rounded-xl px-4 py-3 mb-4">
          <p className="text-parking-occupied text-sm">{error}</p>
        </div>
      )}

      {showQR && qrToken ? (
        <div className="space-y-4">
          <QRDisplay qrToken={qrToken} userName={userName} />

          <div className="flex items-center justify-between bg-parking-surface rounded-xl px-4 py-3">
            <span className="text-xs text-parking-muted font-mono">Expira en</span>
            <span className={`font-mono font-bold text-sm ${
              countdown < 60 ? 'text-parking-occupied animate-pulse' : 'text-parking-accent'
            }`}>
              {formatCountdown(countdown)}
            </span>
          </div>

          <div className="flex gap-2">
            <button onClick={handleMostrarQR} disabled={loading}
              className="flex-1 btn-ghost text-sm">
              🔄 Renovar QR
            </button>
            <button onClick={handleOcultar}
              className="flex-1 btn-ghost text-sm">
              Ocultar
            </button>
          </div>
        </div>
      ) : (
        /* RF-04: Botón principal de la interfaz */
        <button onClick={handleMostrarQR} disabled={loading}
          className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generando QR...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM5 20a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
              </svg>
              Mostrar QR de Acceso
            </>
          )}
        </button>
      )}
    </div>
  );
}
