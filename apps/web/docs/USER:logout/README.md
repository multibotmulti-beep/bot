# Auditoría Exhaustiva y Detallada: Comando USER:logout

## Descripción del Comando

Cierra la sesión actual del usuario. Requiere un token de sesión válido.

## Casos de Prueba Ejecutados

### Caso 1: Éxito - Logout correcto

- **Payload Enviado:**

```json
{
  "cmd": "USER:logout",
  "params": {}
}
```

- **Autorización:** `Bearer 0616d7cf-39c0-467d-902b-f09d2c6c2bc4`
- **Respuesta Recibida:**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "status": "success",
    "message": "Session invalidated successfully."
  }
}
```

- **Comportamiento:** Éxito. Invalida la sesión actual del usuario.

### Caso 2: Error - Logout sin token

- **Payload Enviado:**

```json
{
  "cmd": "USER:logout",
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

- **Comportamiento:** Correcto. El middleware de autenticación deniega la solicitud por falta de token de sesión.
