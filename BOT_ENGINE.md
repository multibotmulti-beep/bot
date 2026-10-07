# 🤖 Guía y Especificación del Motor de Bot Dinámico (Bot Engine)

Este documento describe la arquitectura, responsabilidades, configuración y reglas de uso del **Motor de Bot Dinámico**, diseñado estrictamente como un motor autónomo sin respuestas hardcodeadas en código, administrado 100% mediante base de datos y un sistema de funciones desacoplado.

---

## 1. Arquitectura y Separación de Responsabilidades

- **El Bot (Motor Independiente):**
  - **No** contiene código de respuestas fijas (`hardcode`).
  - Procesa mensajes entrantes evaluando reglas (`BotRule`) y flujos de menús (`BotFlow`) almacenados en la base de datos.
  - Posee su propio sistema de gestión de sesiones (`BotSession`) y verificación de números de teléfono / tokens de acceso.
  - Ejecuta acciones de negocio delegando en un registro de funciones dinámico (`BotFunctionRegistry` / `CapabilityRegistry`).

- **El Backend y la Página Web (Clientes del Bot):**
  - El backend (API) y la interfaz web (Frontend) **no son el bot**.
  - Consumen los servicios del bot (ej. `BotProfileService`, `BotFunctionRegistry`, `handleIncomingWebhook`) o exponen endpoints REST para administrar perfiles, reglas, flujos y credenciales que alimentan al motor.

---

## 2. Archivo de Configuración del Motor (`bot.config.ts`)

Ubicado en `packages/domain/src/bot.config.ts`, define los parámetros operativos del motor:

```typescript
export const BotConfig = {
  defaultBotId: process.env.DEFAULT_BOT_ID || 'admin',
  sessionTtlMinutes: 15,
  defaultMatchType: 'default',
  graphApiVersion: 'v17.0',
  defaultPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '880275461842101',
  enableDatabaseFallback: true,
  strictDynamicMode: true, // Forzar uso exclusivo de base de datos para respuestas y menús
};
```

---

## 3. Registro de Funciones y Menús (`bot.functions.ts`)

Ubicado en `packages/domain/src/bot.functions.ts`, vincula las opciones de menú y reglas almacenadas en la base de datos (mediante la propiedad `actionKey`) con funciones ejecutables de dominio (ej. `auth.login`, `bot.list_my_bots`, `bot.list_all`, `support.human`).

### Cómo se asigna en la Base de Datos:
- Cada `BotFlow` (menú) o `BotRule` (regla) en Prisma incluye el campo opcional `actionKey`.
- Cuando el usuario selecciona una opción numérica o envía una palabra clave cuyo flujo/regla tiene un `actionKey`, el motor invoca automáticamente la función correspondiente en el `BotFunctionRegistry`.

---

## 4. Verificador de Sesión Propio del Bot

El motor gestiona su propio ciclo de vida de sesión por cada número de remitente (`senderPhone`):
1. **Identificación de Sesión:** Cada mensaje entrante busca o crea una sesión activa en la tabla `bot_sessions`, recordando qué perfil de bot (`activeBotId`) y qué nivel de menú (`currentParentFlowId`) está utilizando el usuario.
2. **Reinicio de Sesión:** Si el usuario envía `0`, `volver`, `atras` o `menu`, el motor restablece automáticamente la sesión al bot predeterminado (`admin`) o al nivel superior del menú.
3. **Verificación de Identidad / Token:** El bot valida tokens de autenticación o códigos de verificación directamente contra la base de datos de sesiones, manteniendo el estado seguro y persistente sin depender del backend web.

---

## 5. Reglas de Uso y Extensión para Desarrolladores

1. **Cero Hardcoding en Respuestas:**
   - **Prohibido** escribir cadenas de texto de respuesta directamente en el código TypeScript del motor.
   - Toda respuesta a mostrar al usuario debe provenir de `BotFlow.responseMessage`, `BotRule.responseMessage`, o del resultado dinámico devuelto por una función registrada en `BotFunctionRegistry`.

2. **Administración vía API / Base de datos:**
   - Para cambiar las respuestas del bot, el administrador debe actualizar los registros en las tablas `bot_rules` o `bot_flows` mediante la API o la base de datos.
   - Para agregar nuevas funcionalidades, regístrelas en `BotFunctionRegistry` dentro de `bot.functions.ts` y asígneles un `actionKey` en el flujo o regla correspondiente de la base de datos.
