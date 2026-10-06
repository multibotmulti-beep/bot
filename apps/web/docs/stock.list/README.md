# Auditoría Exhaustiva: Comando stock.list

## Resumen de hallazgos

El comando `stock.list` devuelve la totalidad de la lista de productos. Muestra una tolerancia completa a parámetros de entrada (ignorando objetos, parámetros mal formados o incluso `null`), lo cual, si bien garantiza que el comando nunca falle, oculta la falta de capacidad para filtrar resultados, lo que obliga al consumidor a filtrar la información en el cliente.

## Casos de Prueba Auditados

### Caso 1: Listado Estándar

- **Payload Enviado:**

```json
{
  "cmd": "stock.list",
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
      "qty": 100,
      "code": "PROD001",
      "name": "Producto de Prueba",
      "price": 10.5,
      "category": "General",
      "metadata": {}
    },
    {
      "qty": 99,
      "code": "OK1",
      "name": "Prod Duplicado",
      "price": 99,
      "category": "C",
      "metadata": {}
    }
    // ...resto de productos
  ]
}
```

- **Comportamiento:** Éxito. Devuelve el array completo del inventario.

### Caso 2: Parámetros Inesperados (Filtro)

- **Payload Enviado:**

```json
{
  "cmd": "stock.list",
  "params": { "filtro": "invalido" }
}
```

- **Respuesta Recibida:**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": [
    // ...mismo contenido que el Caso 1
  ]
}
```

- **Comportamiento:** Ignora el parámetro de filtro y devuelve el listado completo sin errores.

### Caso 3: Params Nulos

- **Payload Enviado:**

```json
{
  "cmd": "stock.list",
  "params": null
}
```

- **Respuesta Recibida:**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": [
    // ...mismo contenido que el Caso 1
  ]
}
```

- **Comportamiento:** El sistema gestiona el valor `null` sin lanzar errores, comportándose igual que si no se enviaran parámetros.
