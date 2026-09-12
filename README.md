# ParkIQ — prototipo de gestión de estacionamiento

[English](README.en.md)

Aplicación web para explorar la administración de cajones, estancias, tarifas y saldo de conductores. Incluye un frontend React y una API Express con PostgreSQL.

**Estado:** prototipo para evaluación local. Las pantallas de pago simulan la captura de tarjeta; la integración de cobro está incompleta y requiere correcciones de autorización y confirmación.

## Alcance implementado

- Registro e inicio de sesión con JWT y vistas de conductor y administrador.
- Gestión de cajones y tarifas; consulta de estancias y reportes.
- Actualizaciones de ocupación mediante Socket.IO.
- Recepción de estados de sensores por HTTP y, opcionalmente, MQTT.
- Generación de tokens QR y rutas de entrada/salida.
- Modelos y rutas de pagos, billetera y recargas.
- Ruta de asistente que consulta tarifas y disponibilidad con un servicio externo configurable.

Que existan rutas y pantallas no implica que todas las integraciones estén completas o verificadas con hardware y proveedores reales.

## Tecnologías

React 18, Vite 5, Tailwind CSS 3, Axios, React Router, Recharts, Node.js, Express, Prisma 5, PostgreSQL, Socket.IO y MQTT. El backend declara SDK de Stripe y OpenAI para las integraciones opcionales.

## Instalación local

Necesitas Git, Node.js y npm, y una instancia PostgreSQL de desarrollo. Prepara una base **vacía y dedicada**, por ejemplo `parkiq_demo`, con un usuario local autorizado. La versión exacta de PostgreSQL no está fijada en el repositorio.

```bash
git clone https://github.com/fabrizzio2901/Estacionamiento.git
cd Estacionamiento/backend
npm ci
```

Crea `backend/.env` con tus valores locales. Este ejemplo es ficticio:

```dotenv
DATABASE_URL="postgresql://demo_user:REEMPLAZAR@localhost:5432/parkiq_demo?schema=public"
JWT_SECRET="REEMPLAZAR_POR_UN_SECRETO_LOCAL_ALEATORIO"
QR_SECRET="REEMPLAZAR_POR_OTRO_SECRETO_LOCAL_ALEATORIO"
PORT=4000
FRONTEND_URL="http://localhost:3000"
TARIFA_POR_HORA=20
```

Genera valores distintos para los dos secretos; por ejemplo, ejecuta dos veces:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

No subas `.env` al repositorio. Con la conexión apuntando a la base vacía de demostración:

```bash
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

**El seed elimina pagos y sesiones previos.** Úsalo solo en la base de demostración; contiene cuentas de prueba cuyas credenciales muestra al terminar. Esas cuentas no son apropiadas para un despliegue público.

El backend usa `http://localhost:4000`. En otra terminal, desde la raíz del repositorio:

```bash
cd frontend
npm ci
npm run dev
```

Abre `http://localhost:3000`. El proxy de Vite dirige `/api` y `/socket.io` al backend.

## Ejemplo de comprobación

Con el backend iniciado:

```powershell
Invoke-RestMethod http://localhost:4000/api/health
```

O con curl:

```bash
curl http://localhost:4000/api/health
```

La respuesta esperada contiene `status: "ok"`. Esta ruta no comprueba por sí sola la conexión con PostgreSQL. Después entra con una cuenta de prueba del seed y revisa los cajones.

## Integraciones opcionales

| Integración | Variables del backend |
|---|---|
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; para recargas, `STRIPE_WALLET_WEBHOOK_SECRET` o el secreto de webhook general |
| MQTT | `MQTT_BROKER_URL`; opcionales `MQTT_USERNAME`, `MQTT_PASSWORD`, `MQTT_TOPIC_PREFIX` |
| Asistente | `OPENAI_API_KEY`, `AI_MODEL` |
| Caducidad JWT | `JWT_EXPIRES_IN` |

Déjalas sin configurar si no vas a probar esas funciones. Stripe debe evaluarse exclusivamente con datos de prueba. La interfaz actual no ejecuta la confirmación de tarjeta mediante Stripe Elements; no introduzcas tarjetas reales. El asistente requiere un servicio externo y puede generar consumo.

## Estructura

- `frontend/src/pages/`: acceso, dashboard, pagos y billetera.
- `frontend/src/components/`: paneles de administración, ocupación y QR.
- `backend/src/routes/`: rutas de la API.
- `backend/src/services/`: sensores y MQTT.
- `backend/prisma/schema.prisma`: modelos.
- `backend/prisma/seed.js`: datos de demostración.

## Verificación y límites

El frontend se instaló desde el lockfile y compiló durante la revisión del 11 de septiembre de 2026. La compilación emitió avisos de configuración y tamaño de bundle. No se ejecutaron la base de datos, el seed, el backend completo, cobros, hardware ni el asistente.

Antes de considerar un despliegue público se deben corregir:

- La asignación de rol administrador desde el registro público.
- La protección de rutas de sensores y entrada/salida.
- Las confirmaciones de pago que dependen de condiciones incompletas.
- La integración real del formulario con el proveedor de pagos.
- Las pruebas de autorización, concurrencia, saldos y tarifas.

No se dispone de métricas de operación ni una demostración pública verificada.

