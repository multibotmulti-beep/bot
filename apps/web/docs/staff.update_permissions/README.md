# Auditoría Exhaustiva y Detallada: Comando staff.update_permissions

## Descripción del Comando

Actualiza los permisos granulares asignados a un usuario específico. Requiere parámetros `userId` y `permissions` (debe ser un array).

## Casos de Prueba Ejecutados

### Caso 1: Error - Falta campo obligatorio 'userId'

- **Payload Enviado:**

```json
{
  "cmd": "staff.update_permissions",
  "params": {
    "permissions": ["read"]
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "userId y un array de permissions son requeridos",
  "user_message": "Ha ocurrido un error inesperado. Por favor, intenta más tarde.",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "source": "INTERNAL"
  }
}
```

- **Comportamiento:** Valida correctamente la ausencia del campo, retorna error genérico `INTERNAL_SERVER_ERROR`.

### Caso 2: Error - Falta campo obligatorio 'permissions'

- **Payload Enviado:**

```json
{
  "cmd": "staff.update_permissions",
  "params": {
    "userId": "157"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "userId y un array de permissions son requeridos",
  "user_message": "Ha ocurrido un error inesperado. Por favor, intenta más tarde.",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "source": "INTERNAL"
  }
}
```

- **Comportamiento:** Validación de negocio correcta. Devuelve `success: false` con mensaje claro, pero `user_message` genérico.

### Caso 3: Éxito - Actualización de permisos

- **Payload Enviado:**

```json
{
  "cmd": "staff.update_permissions",
  "params": {
    "userId": "157",
    "permissions": ["read", "write"]
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "status": "success",
    "newPermissions": ["read", "write"]
  }
}
```

- **Comportamiento:** Éxito. Actualiza los permisos del usuario `157` al array proporcionado.
