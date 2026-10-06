# Auditoría Exhaustiva y Detallada: Comando sales.create

## Descripción del Comando

Crea una orden de venta, registra los ítems asociados y genera un link de pago simulado.

## Casos de Prueba Ejecutados

### Caso 1: Creación de Orden Exitosa

- **Payload Enviado:**

```json
{
  "cmd": "sales.create",
  "params": {
    "items": [{ "code": "PROD001", "quantity": 1, "price": 10.5 }],
    "total": 10.5
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": true,
  "message": "Sale created successfully.",
  "data": {
    "payment_link": "https://api.payments.com/pay/ORD-1784412076670",
    "sale_id": "ORD-1784412076670"
  }
}
```

- **Comportamiento:** Éxito. Crea un ID de orden (`ORD-<timestamp>`), registra la orden y los ítems, y genera un link de pago.

### Caso 2: Error - Falta campo obligatorio 'items'

- **Payload Enviado:**

```json
{
  "cmd": "sales.create",
  "params": {
    "total": 10.5
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": true,
  "message": "Sale created successfully.",
  "data": {
    "payment_link": "https://api.payments.com/pay/ORD-1784412079675",
    "sale_id": "ORD-1784412079675"
  }
}
```

- **Comportamiento:** **INCONSISTENTE**. A pesar de no enviar `items`, el sistema crea la orden y genera un link de pago. Debería haber validado la existencia de `items`.

### Caso 3: Idempotencia (client_request_id)

- **Payload Enviado (primera vez):**

```json
{
  "cmd": "sales.create",
  "params": {
    "items": [{ "code": "PROD001", "quantity": 1, "price": 10.5 }],
    "total": 10.5,
    "client_request_id": "REQ-123"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": true,
  "message": "Sale created successfully.",
  "data": {
    "payment_link": "https://api.payments.com/pay/ORD-1784412082709",
    "sale_id": "ORD-1784412082709"
  }
}
```

- **Payload Enviado (segunda vez):**

```json
{
  "cmd": "sales.create",
  "params": {
    "items": [{ "code": "PROD001", "quantity": 1, "price": 10.5 }],
    "total": 10.5,
    "client_request_id": "REQ-123"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": true,
  "message": "Sale created successfully.",
  "data": {
    "payment_link": "https://api.payments.com/pay/ORD-1784412086211",
    "sale_id": "ORD-1784412086211"
  }
}
```

- **Comportamiento:** **FALLA**. La idempotencia no funciona. Se crea una nueva orden cada vez que se envía el mismo `client_request_id`.
