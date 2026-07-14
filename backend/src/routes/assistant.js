const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

let openaiClient = null;

async function getOpenAIClient() {
  if (openaiClient) return openaiClient;

  const { default: OpenAI } = await import('openai');
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  return openaiClient;
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)} MXN`;
}

function buildParkingContext(pricingRule, spaces) {
  const enabledSpaces = spaces.filter((s) => s.enabled);
  const freeSpaces = enabledSpaces.filter((s) => s.status === 'FREE');
  const occupiedSpaces = enabledSpaces.filter((s) => s.status === 'OCCUPIED');
  const disabledSpaces = spaces.filter((s) => !s.enabled);

  const freeList = freeSpaces.length
    ? freeSpaces
        .map((s) => `Cajon ${s.number} (Zona ${s.zone}, Piso ${s.floor})`)
        .join(', ')
    : 'No hay cajones libres en este momento.';

  let pricingText = 'No hay tarifa activa configurada.';
  if (pricingRule) {
    if (pricingRule.type === 'HOURLY') {
      pricingText = `Tarifa activa: ${formatMoney(pricingRule.pricePerHour)} por hora.`;
    } else {
      pricingText = `Tarifa activa por rangos: ${JSON.stringify(pricingRule.ranges)}.`;
    }
  }

  const contextText = `
DATOS ACTUALES DEL ESTACIONAMIENTO PARKIQ
- Cajones habilitados: ${enabledSpaces.length}
- Cajones disponibles: ${freeSpaces.length}
- Cajones ocupados: ${occupiedSpaces.length}
- Cajones deshabilitados: ${disabledSpaces.length}
- Lista exacta de cajones disponibles: ${freeList}
- ${pricingText}
- Moneda: MXN

REGLAS DE NEGOCIO
- Si preguntan cuanto cuesta X horas y la tarifa es HOURLY, multiplica el precio por hora.
- Si preguntan cuales estan disponibles, responde con la lista exacta.
- Si preguntan cuantos lugares hay, usa los cajones habilitados.
- No inventes datos que no esten aqui.
`.trim();

  return {
    contextText,
    stats: {
      total: enabledSpaces.length,
      free: freeSpaces.length,
      occupied: occupiedSpaces.length,
      disabled: disabledSpaces.length,
    },
  };
}

router.post('/chat', authMiddleware, async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'OPENAI_API_KEY no esta configurada en el backend',
      });
    }

    const rawMessages = Array.isArray(req.body.messages)
      ? req.body.messages
      : [{ role: 'user', content: req.body.message }];

    const messages = rawMessages
      .filter(
        (m) =>
          m &&
          ['user', 'assistant'].includes(m.role) &&
          typeof m.content === 'string' &&
          m.content.trim()
      )
      .slice(-10);

    if (!messages.length) {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }

    const prisma = req.app.get('prisma');

    const [pricingRule, spaces] = await Promise.all([
      prisma.pricingRule.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.parkingSpace.findMany({
        orderBy: [{ floor: 'asc' }, { number: 'asc' }],
      }),
    ]);

    const { contextText, stats } = buildParkingContext(pricingRule, spaces);

    const developerPrompt = `
Eres el asistente virtual de ParkIQ.

Tu trabajo es responder SOLO preguntas relacionadas con:
- costo del estacionamiento
- disponibilidad de cajones
- cantidad de lugares
- estado general del estacionamiento
- uso del sistema ParkIQ

Reglas:
- Responde siempre en espanol.
- Se breve, claro y directo.
- Usa unicamente los datos del contexto.
- Si el usuario pregunta algo fuera del estacionamiento, di que solo puedes ayudar con temas del estacionamiento ParkIQ.
- Nunca inventes precios, cajones, horarios o reglas que no aparezcan en el contexto.
- Si faltan datos, dilo claramente.
`.trim();

    const client = await getOpenAIClient();

    // === CORRECCIÓN APLICADA AQUÍ ===
    // 1. Estructuramos el arreglo de mensajes según el estándar del SDK de OpenAI
    const apiMessages = [
      {
        role: 'system', // 'system' es la forma estándar de OpenAI para instrucciones iniciales
        content: developerPrompt + "\n\n" + contextText, // Enviamos el texto directo, no como un arreglo anidado
      },
      ...messages.map((m) => ({
        role: m.role,
        content: m.content.trim(), // Enviamos el texto directo
      })),
    ];

    // 2. Usamos client.chat.completions.create con las propiedades correctas
    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4o', // Modificado a un modelo estándar de OpenAI (puedes usar 'gpt-3.5-turbo' también)
      messages: apiMessages,                   // La propiedad se llama 'messages'
      max_tokens: 400,                         // La propiedad se llama 'max_tokens'
    });

    // 3. Leemos la respuesta de la estructura que devuelve OpenAI
    return res.json({
      reply:
        response.choices[0]?.message?.content?.trim() ||
        'No pude generar una respuesta en este momento.',
      stats,
    });
    // === FIN DE LA CORRECCIÓN ===

  } catch (error) {
    // Te sugiero imprimir error.message para tener más detalle si llega a fallar otra cosa
    console.error('[Assistant] Error:', error.message || error);
    return res.status(500).json({ error: 'Error al responder con IA' });
  }
});

module.exports = router;