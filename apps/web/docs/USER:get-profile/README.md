# Auditoría Exhaustiva y Detallada: Comando USER:get-profile

## Descripción del Comando

Obtiene el perfil del usuario autenticado actualmente a través del token de sesión. No requiere parámetros específicos en `params`.

## Casos de Prueba Ejecutados

### Caso 1: Éxito - Obtener perfil con token válido

- **Payload Enviado:**

```json
{
  "cmd": "USER:get-profile",
  "params": {}
}
```

- **Autorización:** `Bearer 8bbfe319-a004-4920-8459-592ce9a0bfc8`
- **Respuesta Recibida:**

```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "status": "success",
    "profile": {
      "id": 157,
      "username": "nuevo_usuario_curl",
      "cliente_id": 119,
      "role_name": "DUEÑO",
      "cliente_nombre": "Nuevo Cliente"
    }
  }
}
```

- **Comportamiento:** Éxito. Retorna el perfil del usuario autenticado (ID, username, cliente_id, rol, nombre del cliente).

### Caso 2: Error - Falta de token de sesión

- **Payload Enviado:**

```json
{
  "cmd": "USER:get-profile",
  "params": {}
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "No session token found"
}
```

- **Comportamiento:** Correcto. El middleware de autenticación deniega la solicitud por falta de token.

### Caso 3: Error - Token de sesión inválido

- **Payload Enviado:**

```json
{
  "cmd": "USER:get-profile",
  "params": {}
}
```

- **Autorización:** `Bearer token-invalido`
- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "Session expired or invalid"
}
```

- **Comportamiento:** Correcto. El middleware valida el token contra el servicio de perfiles y deniega la solicitud por ser inválido o estar expirado.
