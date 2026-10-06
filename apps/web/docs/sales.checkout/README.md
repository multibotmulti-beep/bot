# Auditoría Exhaustiva y Detallada: Comando sales.checkout

## Descripción del Comando

Procesa una venta: valida el stock disponible, descuenta la cantidad vendida y actualiza el inventario de forma quirúrgica.

## Casos de Prueba Ejecutados

### Caso 1: Venta Exitosa (reintento con stock disponible)

_Nota: El test anterior falló por stock insuficiente, ajustando para testear éxito._

- **Payload Enviado:**

```json
{
  "cmd": "sales.checkout",
  "params": {
    "items": [{ "code": "OK1", "qty": 1 }],
    "customerId": "CUST-123"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": true,
  "message": "Venta procesada y stock actualizado correctamente."
}
```

- **Comportamiento:** Éxito. Actualiza el stock del producto `OK1` restando 1 unidad.

### Caso 2: Error - Producto inexistente

- **Payload Enviado:**

```json
{
  "cmd": "sales.checkout",
  "params": {
    "items": [{ "code": "NOEXISTE", "qty": 1 }]
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "Producto NOEXISTE no encontrado",
  "user_message": "Ha ocurrido un error inesperado. Por favor, intenta más tarde.",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "source": "INTERNAL"
  }
}
```

- **Comportamiento:** Correctamente detecta que el producto no existe, pero retorna un error técnico genérico (`INTERNAL_SERVER_ERROR`) al usuario final.

### Caso 3: Error - Stock insuficiente

- **Payload Enviado:**

```json
{
  "cmd": "sales.checkout",
  "params": {
    "items": [{ "code": "OK1", "qty": 9999 }]
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "Stock insuficiente para Producto OK",
  "user_message": "Ha ocurrido un error inesperado. Por favor, intenta más tarde.",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "source": "INTERNAL"
  }
}
```

- **Comportamiento:** Detecta la falta de stock, pero nuevamente retorna `INTERNAL_SERVER_ERROR`.

### Caso 4: Error - Items malformados

- **Payload Enviado:**

```json
{
  "cmd": "sales.checkout",
  "params": {
    "items": "no-es-array"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "La lista de items es requerida",
  "user_message": "Ha ocurrido un error inesperado. Por favor, intenta más tarde.",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "source": "INTERNAL"
  }
}
```

- **Comportamiento:** Valida correctamente el tipo de datos, pero retorna un error genérico.
