# Auditoría Exhaustiva y Detallada: Comando customer.list

## Descripción del Comando

Obtiene la lista completa de clientes registrados en el negocio. No requiere parámetros obligatorios.

## Casos de Prueba Ejecutados

### Caso 1: Listado Exitoso

- **Payload Enviado:**

```json
{
  "cmd": "customer.list",
  "params": {}
}
```

- **Respuesta Recibida:**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": [
    {
      "id": "CUST-1784411650759",
      "name": "Juan Perez",
      "email": "juan@example.com",
      "phone": "123456789",
      "address": "Calle Falsa 123",
      "tenantId": 119,
      "createdAt": "2026-07-18T21:54:10.759Z"
    },
    {
      "id": "CUST-1784411655373",
      "name": "Maria",
      "phone": "987654321",
      "tenantId": 119,
      "createdAt": "2026-07-18T21:54:15.373Z"
    }
  ]
}
```

- **Comportamiento:** Éxito. Retorna el array completo de clientes asociados al `tenantId` del usuario autenticado.

### Caso 2: Uso con parámetros inesperados

- **Payload Enviado:**

```json
{
  "cmd": "customer.list",
  "params": {
    "filtro": "invalido"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": [
    {
      "id": "CUST-1784411650759",
      "name": "Juan Perez",
      "email": "juan@example.com",
      "phone": "123456789",
      "address": "Calle Falsa 123",
      "tenantId": 119,
      "createdAt": "2026-07-18T21:54:10.759Z"
    },
    {
      "id": "CUST-1784411655373",
      "name": "Maria",
      "phone": "987654321",
      "tenantId": 119,
      "createdAt": "2026-07-18T21:54:15.373Z"
    }
  ]
}
```

- **Comportamiento:** Éxito. Al igual que otros comandos de lectura, ignora los parámetros enviados en `params` y retorna la lista completa sin errores.
