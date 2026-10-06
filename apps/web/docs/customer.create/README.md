# Auditoría Exhaustiva y Detallada: Comando customer.create

## Descripción del Comando

Este comando permite registrar un nuevo cliente en el sistema. Los parámetros obligatorios son `name` y `phone`. Los parámetros opcionales son `email` y `address`.

## Casos de Prueba Ejecutados

### Caso 1: Creación de Cliente Exitoso con todos los campos

- **Payload Enviado:**

```json
{
  "cmd": "customer.create",
  "params": {
    "name": "Juan Perez",
    "phone": "123456789",
    "email": "juan@example.com",
    "address": "Calle Falsa 123"
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
    "updatedData": {
      "stock": [
        {
          "qty": 100,
          "code": "PROD001",
          "name": "Producto de Prueba",
          "price": 10.5,
          "category": "General",
          "metadata": {}
        }
        // ... (resto del stock)
      ],
      "customers": [
        {
          "id": "CUST-1784411650759",
          "name": "Juan Perez",
          "email": "juan@example.com",
          "phone": "123456789",
          "address": "Calle Falsa 123",
          "tenantId": 119,
          "createdAt": "2026-07-18T21:54:10.759Z"
        }
      ],
      "employees": [],
      "categorias": []
    }
  }
}
```

- **Comportamiento:** El sistema registra el cliente, genera un ID único con formato `CUST-<timestamp>` y añade el campo `tenantId` y `createdAt` automáticamente.

### Caso 2: Error - Falta campo obligatorio 'name'

- **Payload Enviado:**

```json
{
  "cmd": "customer.create",
  "params": {
    "phone": "123456789"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "Nombre y teléfono son requeridos",
  "user_message": "Ha ocurrido un error inesperado. Por favor, intenta más tarde.",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "source": "INTERNAL"
  }
}
```

- **Comportamiento:** El comando detecta la falta de `name`. Devuelve `success: false` y el mensaje de error de negocio correcto, pero es importante notar que el `user_message` que llega al frontend es un mensaje genérico de error de sistema, no un mensaje específico de validación, lo cual dificulta la corrección del usuario.

### Caso 3: Error - Falta campo obligatorio 'phone'

- **Payload Enviado:**

```json
{
  "cmd": "customer.create",
  "params": {
    "name": "Juan Perez"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "Nombre y teléfono son requeridos",
  "user_message": "Ha ocurrido un error inesperado. Por favor, intenta más tarde.",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "source": "INTERNAL"
  }
}
```

- **Comportamiento:** Similar al Caso 2. El sistema valida correctamente, pero el mensaje devuelto al frontend es confuso y poco útil para el usuario final.

### Caso 4: Creación de Cliente Exitoso con campos opcionales omitidos

- **Payload Enviado:**

```json
{
  "cmd": "customer.create",
  "params": {
    "name": "Maria",
    "phone": "987654321"
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
    "updatedData": {
      "stock": [
        // ... (resto del stock)
      ],
      "customers": [
        // ... (cliente del Caso 1),
        {
          "id": "CUST-1784411655373",
          "name": "Maria",
          "phone": "987654321",
          "tenantId": 119,
          "createdAt": "2026-07-18T21:54:15.373Z"
        }
      ],
      "employees": [],
      "categorias": []
    }
  }
}
```

- **Comportamiento:** El sistema crea el cliente satisfactoriamente omitiendo los campos `email` y `address`, los cuales no se incluyen en el objeto cliente resultante.
