# Auditoría Exhaustiva y Detallada: Comando staff.create

## Descripción del Comando

Crea un nuevo empleado (humano o bot) vinculado a la empresa. Requiere permisos de 'DUEÑO'.

## Casos de Prueba Ejecutados

### Caso 1: Error - Intento de creación con usuario existente

_Nota: El usuario de prueba ya fue creado en una ejecución previa._

- **Payload Enviado:**

```json
{
  "cmd": "staff.create",
  "params": {
    "nombre": "Empleado Prueba",
    "role": "EMPLEADO"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "A user with this username already exists.",
  "user_message": "Ha ocurrido un error inesperado. Por favor, intenta más tarde.",
  "error": {
    "code": "USER_EXISTS",
    "source": "INFRASTRUCTURE"
  }
}
```

- **Comportamiento:** Detecta correctamente que el nombre de usuario (generado automáticamente) ya existe y retorna un error claro desde la infraestructura, aunque de nuevo se enmascara con un `user_message` genérico.

### Caso 2: Error - Falta campo obligatorio 'nombre'

- **Payload Enviado:**

```json
{
  "cmd": "staff.create",
  "params": {
    "role": "EMPLEADO"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "Faltan datos obligatorios: nombre y role",
  "user_message": "Ha ocurrido un error inesperado. Por favor, intenta más tarde.",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "source": "INTERNAL"
  }
}
```

- **Comportamiento:** Validación de negocio correcta. Devuelve `success: false` y un mensaje explícito de qué campos faltan, pero el `user_message` sigue siendo genérico.

### Caso 3: Error - Falta campo obligatorio 'role'

- **Payload Enviado:**

```json
{
  "cmd": "staff.create",
  "params": {
    "nombre": "Empleado Prueba"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "Faltan datos obligatorios: nombre y role",
  "user_message": "Ha ocurrido un error inesperado. Por favor, intenta más tarde.",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "source": "INTERNAL"
  }
}
```

- **Comportamiento:** Validación de negocio correcta. Igual que el caso anterior, el mensaje de error de negocio es claro, pero el `user_message` es genérico.
