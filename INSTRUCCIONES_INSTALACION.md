# 🚗 ParkIQ — Guía de instalación completa desde cero
# Windows 10/11 — Sin conocimientos previos

=====================================================
## ANTES DE EMPEZAR — Instala estos programas
=====================================================

### 1. Node.js
- Ve a: https://nodejs.org
- Descarga el botón verde "LTS"
- Instala con todo por defecto (Next → Next → Install → Finish)

✅ Verificar: abre CMD (Windows+R → escribe cmd → Enter) y escribe:
   node --version
   Debes ver algo como: v20.11.0

---

### 2. PostgreSQL (base de datos)
- Ve a: https://www.postgresql.org/download/windows/
- Clic en "Download the installer" → descarga la versión más reciente (x86-64)
- Durante la instalación:
  → Cuando pida contraseña escribe:  admin1234  (¡APÚNTALA!)
  → Puerto: deja 5432
  → Todo lo demás: Next → Next → Install
- Al final DESMARCA "Stack Builder" y clic Finish

✅ Verificar: cierra y abre CMD de nuevo, escribe:
   psql --version
   Debes ver: psql (PostgreSQL) 16.x

=====================================================
## PASO 1 — Colocar los archivos en tu computadora
=====================================================

1. Descarga el archivo parking-completo.zip
2. Haz clic derecho sobre él → "Extraer todo..."
3. Extráelo en:  C:\
4. Debe quedar así:
   C:\parking-completo\
       backend\
       frontend\
       README.md

=====================================================
## PASO 2 — Crear la base de datos
=====================================================

1. Abre CMD (Windows+R → cmd → Enter)
2. Escribe y presiona Enter:
   psql -U postgres

3. Te pedirá contraseña → escribe:  admin1234
   (No verás los caracteres mientras escribes, es normal)

4. Escribe esto y presiona Enter:
   CREATE DATABASE parking_db;

5. Debes ver:  CREATE DATABASE  ← significa que funcionó

6. Escribe:  \q  y Enter para salir

=====================================================
## PASO 3 — Configurar el backend
=====================================================

En el CMD escribe estos comandos uno por uno:

   cd C:\parking-completo\backend

   copy .env.example .env

   notepad .env

Se abre el Bloc de notas. Busca la línea DATABASE_URL y
déjala exactamente así (ya viene correcta si usaste admin1234):

   DATABASE_URL="postgresql://postgres:admin1234@localhost:5432/parking_db"

Si pusiste una contraseña diferente al instalar PostgreSQL,
cámbiala en esa línea.

Guarda con Ctrl+S y cierra el Bloc de notas.

=====================================================
## PASO 4 — Instalar librerías del backend
=====================================================

Sigue en el mismo CMD (dentro de C:\parking-completo\backend):

   npm install

(Espera 1-3 minutos, verás texto corriendo — es normal)

   npx prisma db push

(Crea las tablas en la base de datos)

   npm run db:seed

Debes ver al final:
   ✅ Usuarios creados
   ✅ 20 cajones creados
   ✅ Tarifa inicial creada: $20 MXN/hora
   🚗 Seed v2 completado!

=====================================================
## PASO 5 — Instalar librerías del frontend
=====================================================

Abre UNA SEGUNDA VENTANA de CMD (no cierres la primera).
Escribe:

   cd C:\parking-completo\frontend

   npm install

(Espera 1-2 minutos)

=====================================================
## PASO 6 — ¡Encender el sistema!
=====================================================

Necesitas DOS ventanas de CMD abiertas al mismo tiempo:

── VENTANA 1 (backend) ──────────────────────────────
   cd C:\parking-completo\backend
   npm run dev

Debes ver:
   🚗 Servidor ParkIQ v2 en http://localhost:4000
   📡 Socket.io listo

── VENTANA 2 (frontend) ─────────────────────────────
   cd C:\parking-completo\frontend
   npm run dev

Debes ver:
   ➜  Local:   http://localhost:3000/

=====================================================
## PASO 7 — Abrir la aplicación
=====================================================

1. Abre Chrome o Edge
2. Ve a:  http://localhost:3000
3. Verás la pantalla de login de ParkIQ

Credenciales de prueba:
┌─────────────────────────────────────────┐
│ ADMIN:     admin@parking.mx / admin123  │
│ CONDUCTOR: conductor@parking.mx / user123│
└─────────────────────────────────────────┘

=====================================================
## PASO 8 — Configurar Stripe (pagos con tarjeta)
=====================================================

Stripe es el servicio que procesa pagos con tarjeta.
Sin configurarlo, todo funciona EXCEPTO los pagos reales.

1. Ve a: https://dashboard.stripe.com
2. Crea una cuenta gratuita (usa tu email)
3. Una vez dentro, ve a:
   Menú izquierdo → "Developers" → "API keys"
4. Copia la clave que dice "Secret key" (empieza con sk_test_...)
5. Abre el archivo:  C:\parking-completo\backend\.env
   con el Bloc de notas
6. Busca la línea STRIPE_SECRET_KEY y pega tu clave:
   STRIPE_SECRET_KEY="sk_test_TU_CLAVE_AQUI"
7. Guarda (Ctrl+S)
8. Reinicia el backend: ve a la ventana CMD del backend,
   presiona Ctrl+C, luego escribe:  npm run dev

=====================================================
## CÓMO USAR EL SISTEMA
=====================================================

Como ADMINISTRADOR (admin@parking.mx):
──────────────────────────────────────
• Pestaña "Mapa"     → Ver todos los cajones en tiempo real
• Pestaña "Admin"    → 5 secciones:
  - Resumen   : estadísticas del día
  - Cajones   : crear, editar, deshabilitar cajones
  - Usuarios  : gestionar conductores y admins
  - Tarifas   : configurar precio por hora o por rangos
  - Reportes  : gráficas de ingresos, exportar Excel

Como CONDUCTOR (conductor@parking.mx):
───────────────────────────────────────
• Pestaña "Mapa"       → Ver qué cajones están libres (verde) u ocupados (rojo)
• Pestaña "Mi Estancia"→ Ver cuánto tiempo llevas y el costo acumulado
• Pestaña "Pagos"      → Pagar tu estancia con tarjeta

=====================================================
## SI ALGO FALLA — Soluciones rápidas
=====================================================

❌ Error "Cannot find module" en el backend:
   → Ejecuta: npm install  (dentro de la carpeta backend)

❌ Error de base de datos / tablas:
   → Ejecuta estos comandos dentro de backend\:
      npx prisma db push --force-reset
      npm run db:seed

❌ "Credenciales incorrectas" al hacer login:
   → Ejecuta:  npm run db:seed  (dentro de backend\)

❌ La página no carga en localhost:3000:
   → Verifica que AMBAS ventanas de CMD estén corriendo
   → Backend debe mostrar "Servidor corriendo en http://localhost:4000"
   → Frontend debe mostrar "Local: http://localhost:3000"

❌ psql no se reconoce como comando:
   → Cierra CMD y ábrelo de nuevo
   → Si sigue fallando, reinicia la computadora

=====================================================
## CADA VEZ QUE QUIERAS USAR EL SISTEMA
=====================================================

Solo necesitas repetir el PASO 6:

1. Abrir CMD → cd C:\parking-completo\backend → npm run dev
2. Abrir otro CMD → cd C:\parking-completo\frontend → npm run dev
3. Abrir http://localhost:3000 en el navegador

¡Listo! 🚗
