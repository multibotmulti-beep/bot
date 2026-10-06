# Auditoría Exhaustiva y Detallada: Comando import.process

## Descripción del Comando

Procesa, valida y transforma datos crudos (`rawData`) basándose en un mapeo (`mapping`) y los delega a la infraestructura para su persistencia. Requiere parámetros `rawData` y `mapping`.

## Casos de Prueba Ejecutados

### Caso 1: Error - Falta campo obligatorio 'rawData'

- **Payload Enviado:**

```json
{
  "cmd": "import.process",
  "params": {
    "mapping": { "s": "t" }
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "Se requieren rawData (array) y mapping",
  "user_message": "Ha ocurrido un error inesperado. Por favor, intenta más tarde.",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "source": "INTERNAL"
  }
}
```

- **Comportamiento:** Valida correctamente la ausencia del campo, retorna error genérico `INTERNAL_SERVER_ERROR`.

### Caso 2: Error - Falta campo obligatorio 'mapping'

- **Payload Enviado:**

```json
{
  "cmd": "import.process",
  "params": {
    "rawData": []
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "Se requieren rawData (array) y mapping",
  "user_message": "Ha ocurrido un error inesperado. Por favor, intenta más tarde.",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "source": "INTERNAL"
  }
}
```

- **Comportamiento:** Idéntico al Caso 1.

### Caso 3: Éxito - Importación válida

- **Payload Enviado:**

```json
{
  "cmd": "import.process",
  "params": {
    "rawData": [{ "s_code": "I1", "s_price": 10 }],
    "mapping": { "s_code": "code", "s_price": "price" }
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
    "message": "Importación exitosa",
    "count": 1
  }
}
```

- **Comportamiento:** Éxito. Procesa la transformación (`s_code` -> `code`, `s_price` -> `price`) y delega la importación a la infraestructura.
