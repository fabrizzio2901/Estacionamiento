import { useState } from 'react';
import axios from 'axios';

export default function ParkingAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hola. Puedo decirte la tarifa actual, cuantos cajones hay y cuales estan disponibles.',
    },
  ]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const { data } = await axios.post('/api/assistant/chat', {
        messages: nextMessages,
      });

      setMessages([
        ...nextMessages,
        { role: 'assistant', content: data.reply || 'Sin respuesta' },
      ]);
    } catch (error) {
      const msg =
        error.response?.data?.error || 'No pude responder en este momento.';
      setMessages([...nextMessages, { role: 'assistant', content: msg }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-parking-accent text-white shadow-lg shadow-parking-accent/30 flex items-center justify-center"
        title="Asistente IA"
      >
        IA
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-24px)] glass-card border border-parking-border rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-4 py-3 border-b border-parking-border flex items-center justify-between bg-parking-surface">
            <div>
              <p className="font-display font-bold text-white">Asistente ParkIQ</p>
              <p className="text-xs text-parking-muted">
                Tarifas, cajones y disponibilidad
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-parking-muted hover:text-white text-sm"
            >
              ✕
            </button>
          </div>

          <div className="h-80 overflow-y-auto p-3 space-y-3 bg-parking-bg">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-parking-accent text-white'
                      : 'bg-parking-card text-parking-text border border-parking-border'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-parking-card text-parking-text border border-parking-border rounded-2xl px-3 py-2 text-sm">
                  Pensando...
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-parking-border bg-parking-surface">
            <div className="flex gap-2 mb-2 flex-wrap">
              {[
                'Cuanto cuesta 1 hora',
                'Cuantos lugares hay',
                'Cuales estan disponibles',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs px-2 py-1 rounded-full border border-parking-border text-parking-muted hover:text-white hover:border-parking-accent"
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregunta algo del estacionamiento..."
                className="flex-1 resize-none bg-parking-bg border border-parking-border rounded-xl px-3 py-2 text-sm text-parking-text placeholder:text-parking-muted focus:outline-none focus:border-parking-accent"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-4 rounded-xl bg-parking-accent text-white disabled:opacity-50"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}