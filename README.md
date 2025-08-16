# MQTT Broker Service

Servicio Node.js con TypeScript para enviar comandos a dispositivos IoT vía MQTT y persistir el estado usando Upstash Redis.

## 🚀 Características

- ✅ API REST para enviar comandos MQTT
- ✅ Persistencia de estado en Upstash Redis
- ✅ Monitoreo de respuestas del dispositivo
- ✅ Health check endpoint para monitoreo
- ✅ Compatible con Vercel (Serverless)
- ✅ TypeScript con tipado completo
- ✅ Documentación completa de API

## 📋 Requisitos

- Node.js 18+
- Cuenta en Upstash Redis (gratuita)
- Vercel (opcional, para deploy)

## 🛠️ Instalación Local

### 1. Clonar e instalar dependencias
```bash
git clone <tu-repo>
cd mqtt-broker-service
npm install
```

### 2. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto:

```env
KV_REST_API_URL="https://suitable-stallion-43837.upstash.io"
KV_REST_API_TOKEN="tu-token-de-upstash"
PORT=3000
```

### 3. Ejecutar en desarrollo
```bash
npm run dev
```

### 4. Compilar para producción
```bash
npm run build
npm start
```

## 🌐 Deploy en Vercel

### Método 1: Vercel CLI

1. **Instalar Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Configurar variables de entorno:**
   ```bash
   vercel env add KV_REST_API_URL
   vercel env add KV_REST_API_TOKEN
   ```

### Método 2: GitHub Integration

1. **Subir código a GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <tu-repo-url>
   git push -u origin main
   ```

2. **Conectar en Vercel:**
   - Ve a [vercel.com](https://vercel.com)
   - Import Git Repository
   - Selecciona tu repositorio

3. **Configurar variables de entorno:**
   - Project Settings → Environment Variables
   - Agregar:
     - `KV_REST_API_URL`: `https://suitable-stallion-43837.upstash.io`
     - `KV_REST_API_TOKEN`: `tu-token-de-upstash`

## 📡 Endpoints de la API

### 1. Health Check

**GET** `/health`

Verifica el estado del servicio y sus dependencias.

#### Respuesta (200):
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "services": {
    "mqtt": true,
    "redis": "connected"
  }
}
```

#### Ejemplo de uso:
```bash
curl https://tu-app.vercel.app/health
```

### 2. Enviar Comando al Dispositivo

**POST** `/device/command`

Envía un comando al dispositivo vía MQTT y actualiza el estado persistido.

#### Request Body:
```json
{
  "command": "lock"
}
```

#### Comandos válidos:
- `lock` - Bloquear dispositivo
- `unlock` - Desbloquear dispositivo  
- `disconnect` - Desconectar dispositivo
- `reconnect` - Reconectar dispositivo

#### Respuesta exitosa (200):
```json
{
  "status": "sent",
  "command": "lock"
}
```

#### Respuesta de error (400):
```json
{
  "error": "Invalid command",
  "valid_commands": ["lock", "unlock", "disconnect", "reconnect"]
}
```

#### Ejemplos de uso:
```bash
# Bloquear dispositivo
curl -X POST https://tu-app.vercel.app/device/command \
  -H "Content-Type: application/json" \
  -d '{"command": "lock"}'

# Desbloquear dispositivo
curl -X POST https://tu-app.vercel.app/device/command \
  -H "Content-Type: application/json" \
  -d '{"command": "unlock"}'

# Desconectar dispositivo
curl -X POST https://tu-app.vercel.app/device/command \
  -H "Content-Type: application/json" \
  -d '{"command": "disconnect"}'

# Reconectar dispositivo
curl -X POST https://tu-app.vercel.app/device/command \
  -H "Content-Type: application/json" \
  -d '{"command": "reconnect"}'
```

### 3. Consultar Estado del Dispositivo

**GET** `/device/status`

Obtiene el estado actual persistido del dispositivo.

#### Respuesta exitosa (200):
```json
{
  "isLocked": true,
  "hasPower": true,
  "lastUpdate": "2024-01-15T10:30:00.000Z",
  "lastCommand": "lock"
}
```

#### Respuesta de error (500):
```json
{
  "error": "Failed to get device status"
}
```

#### Ejemplos de uso:
```bash
# Consultar estado actual
curl https://tu-app.vercel.app/device/status

# Con formato JSON legible
curl -s https://tu-app.vercel.app/device/status | jq
```

## 🔄 Flujo de Funcionamiento

### 1. Envío de Comando:
1. Cliente envía POST a `/device/command`
2. Servicio valida el comando
3. Publica mensaje en topic MQTT `device/cmd`
4. Actualiza estado en Redis
5. Retorna confirmación al cliente

### 2. Recepción de Respuesta:
1. Dispositivo procesa comando
2. Dispositivo responde en topic `device/resp`
3. Servicio recibe respuesta
4. Si es JSON válido, actualiza estado en Redis
5. Si es texto plano, solo registra en logs

### 3. Consulta de Estado:
1. Cliente envía GET a `/device/status`
2. Servicio consulta Redis
3. Retorna estado actual del dispositivo

## 🏗️ Arquitectura

```
Cliente REST → Express API → MQTT Broker → Dispositivo IoT
     ↑              ↓
     └── Redis ← Estado
```

## 📊 Topics MQTT

- **Envío de comandos:** `device/cmd`
- **Respuestas del dispositivo:** `device/resp`
- **Broker:** `broker.hivemq.com`

## 🔧 Estructura del Estado

```typescript
interface DeviceState {
  isLocked: boolean;      // Estado de bloqueo
  hasPower: boolean;      // Estado de alimentación
  lastUpdate: string;     // Última actualización (ISO string)
  lastCommand?: string;   // Último comando enviado
}
```

## 🧪 Testing

### Probar localmente:
```bash
# Terminal 1: Ejecutar servicio
npm run dev

# Terminal 2: Probar endpoints
curl http://localhost:3000/health
curl http://localhost:3000/device/status
curl -X POST http://localhost:3000/device/command -H "Content-Type: application/json" -d '{"command": "lock"}'
```

### Probar en producción:
```bash
# Reemplaza con tu URL de Vercel
export API_URL="https://tu-app.vercel.app"

# Health check
curl $API_URL/health

# Consultar estado
curl $API_URL/device/status

# Enviar comando
curl -X POST $API_URL/device/command \
  -H "Content-Type: application/json" \
  -d '{"command": "unlock"}'
```

## 🐛 Troubleshooting

### Error: Variables de entorno no encontradas
- Verifica que `.env` existe y tiene las variables correctas
- En Vercel, verifica las Environment Variables en Project Settings

### Error: "No Output Directory named 'public'"
- Asegúrate de que `vercel.json` existe en la raíz del proyecto

### Error de conexión MQTT
- Verifica conectividad a internet
- El broker `broker.hivemq.com` es público y no requiere autenticación

### Error de Redis
- Verifica las credenciales de Upstash
- Asegúrate de que la base Redis está activa

## 📚 Tecnologías Utilizadas

- **Node.js** - Runtime de JavaScript
- **TypeScript** - Tipado estático
- **Express** - Framework web
- **MQTT** - Protocolo de mensajería IoT
- **Upstash Redis** - Base de datos en memoria
- **Vercel** - Plataforma de deploy serverless

## 📄 Licencia

ISC