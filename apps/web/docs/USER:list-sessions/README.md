# Auditoría Exhaustiva y Detallada: Comando USER:list-sessions

## Descripción del Comando

Lista todas las sesiones activas del usuario autenticado. Requiere rol 'DUEÑO'.

## Casos de Prueba Ejecutados

### Caso 1: Éxito - Listado de sesiones activas

- **Payload Enviado:**

```json
{
  "cmd": "USER:list-sessions",
  "params": {}
}
```

- **Autorización:** `Bearer 8bbfe319-a004-4920-8459-592ce9a0bfc8`
- **Respuesta Recibida:**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "status": "success",
    "sessions": [
      {
        "token": "8bbfe319-a004-4920-8459-592ce9a0bfc8",
        "createdAt": {}
      }
    ]
  }
}
```

- **Comportamiento:** Éxito. Retorna un array con las sesiones activas del usuario, incluyendo el token asociado.
  _Nota: El campo `createdAt` está vacío en la respuesta, lo cual parece ser un bug de implementación._
