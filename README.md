# 🚗 ParkIQ — Sistema de Estacionamiento Inteligente

Sistema full-stack para gestión de estacionamiento en tiempo real con sensores físicos.

## 🏗️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express |
| ORM | Prisma + PostgreSQL |
| Tiempo real | Socket.io |
| Sensores | MQTT + HTTP POST |
| Auth | JWT |
| Frontend | React 18 + Vite |
| UI | Tailwind CSS |
| Gráficas | Recharts |

---

## ⚡ Inicio Rápido

### 1. Prerrequisitos
- Node.js 18+
- PostgreSQL corriendo
- (Opcional) Broker MQTT como Mosquitto

### 2. Backend

```bash
cd backend
npm install

# Copiar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL

# Crear tablas y datos iniciales
npm run db:push
npm run db:seed

# Iniciar servidor
npm run dev
```

El servidor corre en: `http://localhost:4000`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

La app corre en: `http://localhost:3000`

### 4. Credenciales de prueba
| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin | admin@parking.mx | admin123 |
| Conductor | conductor@parking.mx | user123 |

---

## 📡 Integración de Sensores

### Opción A: HTTP POST (más sencillo)

Envía una petición al endpoint desde tu microcontrolador (ESP32, Arduino, Raspberry Pi):

```bash
# Cajón se ocupa
curl -X POST http://localhost:4000/api/sensors/update \
  -H "Content-Type: application/json" \
  -d '{"sensorId": "SENSOR_A01", "status": 1}'

# Cajón se libera
curl -X POST http://localhost:4000/api/sensors/update \
  -H "Content-Type: application/json" \
  -d '{"sensorId": "SENSOR_A01", "status": 0}'
```

### Opción B: MQTT

1. Instalar Mosquitto: `brew install mosquitto` o `apt install mosquitto`
2. Agregar en `.env`: `MQTT_BROKER_URL=mqtt://localhost:1883`
3. Reiniciar backend
4. Publicar mensajes:

```bash
# Desde tu sensor físico o para pruebas:
mosquitto_pub -t "parking/sensor/SENSOR_A01" -m '{"status": 1}'
mosquitto_pub -t "parking/sensor/SENSOR_A01" -m '{"status": 0}'
```

### Código de ejemplo para ESP32 (HTTP)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "TU_WIFI";
const char* password = "TU_PASSWORD";
const char* serverUrl = "http://192.168.1.X:4000/api/sensors/update";
const char* sensorId = "SENSOR_A01";

const int SENSOR_PIN = 5; // Pin del sensor infrarrojo/ultrasonico

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println("WiFi conectado");
  pinMode(SENSOR_PIN, INPUT);
}

void enviarEstado(int status) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"sensorId\":\"" + String(sensorId) + "\",\"status\":" + status + "}";
    int code = http.POST(payload);

    Serial.printf("Sensor: %d, HTTP: %d\n", status, code);
    http.end();
  }
}

int lastStatus = -1;
void loop() {
  int currentStatus = digitalRead(SENSOR_PIN) == LOW ? 1 : 0; // Ajustar según sensor
  if (currentStatus != lastStatus) {
    enviarEstado(currentStatus);
    lastStatus = currentStatus;
    delay(500); // Debounce
  }
  delay(100);
}
```

---

## 📁 Estructura del Proyecto

```
parking-system/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Modelos de BD (User, ParkingSpace, Session, Payment)
│   │   └── seed.js            # Datos iniciales
│   └── src/
│       ├── server.js          # Entry point + Socket.io
│       ├── middleware/
│       │   └── auth.js        # Middleware JWT
│       ├── routes/
│       │   ├── auth.js        # Login/Register/Me
│       │   ├── spaces.js      # Cajones de estacionamiento
│       │   ├── sessions.js    # Sesiones de usuario
│       │   ├── admin.js       # Panel admin (stats, reportes)
│       │   └── sensors.js     # Endpoint HTTP para sensores
│       └── services/
│           ├── sensorService.js  # Lógica de negocio (tarifas, sesiones)
│           └── mqttService.js    # Integración MQTT
│
└── frontend/
    └── src/
        ├── context/
        │   └── AuthContext.jsx   # Estado global de autenticación
        ├── hooks/
        │   └── useSocket.js      # Hook para Socket.io
        ├── components/
        │   ├── ParkingGrid.jsx   # Mapa interactivo en tiempo real
        │   ├── DriverPanel.jsx   # Panel del conductor (sesión activa)
        │   └── AdminPanel.jsx    # Dashboard admin + gráficas
        └── pages/
            ├── LoginPage.jsx     # Login/Registro
            └── DashboardPage.jsx # Dashboard principal
```

---

## 🔌 API Endpoints

### Auth
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro de usuario |
| POST | `/api/auth/login` | Inicio de sesión |
| GET | `/api/auth/me` | Usuario actual |

### Sensores
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/sensors/update` | Recibir dato de sensor |
| GET | `/api/sensors` | Listar sensores |

### Cajones
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/spaces` | Todos los cajones con estado |
| GET | `/api/spaces/stats` | Estadísticas de ocupación |

### Sesiones (requiere auth)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/sessions/active` | Sesión activa del usuario |
| GET | `/api/sessions/history` | Historial de sesiones |
| POST | `/api/sessions/:id/pay` | Registrar pago |

### Admin (requiere auth + rol ADMIN)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/stats` | Estadísticas generales |
| GET | `/api/admin/revenue/daily` | Ingresos de últimos 7 días |
| GET | `/api/admin/sessions` | Todas las sesiones |
| POST | `/api/admin/spaces` | Crear cajón |

---

## 🔄 Flujo de datos en tiempo real

```
Sensor físico (ESP32/Arduino)
        ↓ HTTP POST o MQTT
    Backend (Node.js)
        ↓ Actualiza PostgreSQL
        ↓ Calcula tarifa (si aplica)
        ↓ Emite evento Socket.io "spaceUpdate"
    Frontend (React)
        ↓ Recibe evento en tiempo real
        ↓ Actualiza color del cajón (Verde/Rojo)
        ↓ Muestra costo acumulado
```

---

## 🎨 Paleta de colores

| Estado | Color | Hex |
|--------|-------|-----|
| Libre | Verde neón | `#00E5A0` |
| Ocupado | Rojo | `#FF3B5C` |
| Acento | Violeta | `#6C63FF` |
| Dinero | Dorado | `#FFD166` |

---

## 📦 Variables de Entorno

```env
# Backend (.env)
DATABASE_URL="postgresql://user:pass@localhost:5432/parking_db"
JWT_SECRET="clave_secreta_muy_larga"
PORT=4000
MQTT_BROKER_URL="mqtt://localhost:1883"  # Opcional
TARIFA_POR_HORA=20                        # MXN por hora
```
