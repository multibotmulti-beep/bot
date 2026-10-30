# Plan Arquitectónico: Sistema de WebSockets en Tiempo Real para Chat, Paneles y Estudio de Bots

## 1. Objetivo y Visión General
Diseñar e implementar una arquitectura de WebSockets robusta, modular y escalable para todo el monorepo (Backend Fastify y Frontend Next.js). Esta infraestructura permitirá gestionar de forma síncrona y en tiempo real:
- Mensajería de chat en vivo para múltiples paneles de usuario.
- Sincronización instantánea de la edición de nodos, flujos y menús en el `Chat Studio`.
- Eventos del motor del bot (`BotEngine`) propagados a la interfaz sin necesidad de polling ni recargas manuales.

---

## 2. Estructura de Canales y Protocolo de Eventos (Event-Driven)

Para garantizar mantenibilidad y crecimiento, todos los mensajes WebSocket seguirán un contrato tipado estrictamente:

```ts
export interface WSMessagePayload {
  event: 'CHAT_MESSAGE_NEW' | 'BOT_FLOW_UPDATED' | 'NODE_CREATED' | 'NODE_DELETED' | 'BOT_STATUS_CHANGED';
  room: string; // Ej: "chat:+54911...", "bot:bot_123"
  data: any;
  timestamp: string;
}
```

---

## 3. Arquitectura del Backend (Fastify + @fastify/websocket + Redis Pub/Sub)

### 📂 Estructura de Archivos Propuesta (Backend)
```text
apps/api/src/
├── websocket/
│   ├── ws.gateway.ts        # Servidor principal y registro de conexiones
│   ├── ws.rooms.ts          # Gestión de salas (Rooms & Subscriptions)
│   ├── ws.handlers.ts       # Enrutadores de eventos entrantes
│   └── redis.pubsub.ts      # Adaptador Redis Pub/Sub para escalabilidad multi-instancia
```

### ⚙️ Componentes Clave:
1. **`ws.gateway.ts`**: Configura `@fastify/websocket` en el servidor HTTP principal.
2. **`ws.rooms.ts`**: Mantiene un mapa en memoria (respaldado por Redis) de qué sockets están suscritos a qué salas (`chat:+549...`, `bot:id...`).
3. **`redis.pubsub.ts`**: Permite publicar eventos desde cualquier servicio de dominio (`BotProfileService`, `ChatService`) hacia el clúster de WebSockets.

---

## 4. Arquitectura del Frontend (React Context + Custom Hooks)

### 📂 Estructura de Archivos Propuesta (Frontend)
```text
apps/web/src/
├── context/
│   └── WebSocketContext.tsx   # Proveedor global de conexión WS con reconexión automática
├── hooks/
│   ├── useRealtimeChat.ts     # Hook especializado para chat en vivo
│   └── useBotStudioSync.ts    # Hook especializado para sincronización del estudio de bots
```

### ⚙️ Componentes Clave:
1. **`WebSocketContext.tsx`**: Maneja el ciclo de vida del socket (`connect`, `disconnect`, `reconnect` con exponential backoff) y provee métodos de suscripción a salas.
2. **`useBotStudioSync.ts`**: Escucha eventos de actualización de nodos y actualiza el estado local de React al instante (**Optimistic UI + WS Sync**), eliminando demoras al guardar.

---

## 5. Fases de Implementación

### Fase 1: Configuración Base del Servidor WS en Fastify
- Instalar y configurar `@fastify/websocket` en `apps/api`.
- Definir el esquema de eventos y el sistema de salas básicas.

### Fase 2: Integración en los Servicios de Dominio
- Modificar `profile.service.ts` y `chat.service.ts` para emitir eventos WebSocket tras cada mutación exitosa en base de datos.

### Fase 3: Cliente WS y Provider en Next.js
- Crear el proveedor `WebSocketContext` en `apps/web` con gestión resiliente de desconexiones.

### Fase 4: Conexión con Componentes UI (Chat Studio & Simulador)
- Conectar `ChatStudioContainer` y `BotChatSimulatorPanel` a los hooks en tiempo real para reflejar creaciones y ediciones de manera instantánea.
