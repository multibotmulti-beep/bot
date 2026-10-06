# Auditoría Exhaustiva y Detallada: Comando business.define_term

## Descripción del Comando

Define un término de negocio personalizado (tipo: `permission`, `goal_type`, `task`). Requiere los parámetros `def_type`, `def_key` y `def_label`.

## Casos de Prueba Ejecutados

### Caso 1: Error - Tipo de término inválido

- **Payload Enviado:**

```json
{
  "cmd": "business.define_term",
  "params": {
    "def_type": "invalid",
    "def_key": "K1",
    "def_label": "L1"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "Tipo inválido. Debe ser uno de: permission, goal_type, task",
  "user_message": "Ha ocurrido un error inesperado. Por favor, intenta más tarde.",
  "error": {
    "code": "INVALID_TYPE",
    "source": "INFRASTRUCTURE"
  }
}
```

- **Comportamiento:** Valida correctamente el tipo de término y retorna el error de negocio, aunque nuevamente enmascarado con un `user_message` genérico.

### Caso 2: Error - Falta campo obligatorio 'def_key'

- **Payload Enviado:**

```json
{
  "cmd": "business.define_term",
  "params": {
    "def_type": "permission",
    "def_label": "L1"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "def_key y def_label son requeridos",
  "user_message": "Ha ocurrido un error inesperado. Por favor, intenta más tarde.",
  "error": {
    "code": "MISSING_PARAMS",
    "source": "INFRASTRUCTURE"
  }
}
```

- **Comportamiento:** Valida correctamente la ausencia del campo y retorna error de negocio, enmascarado con `user_message` genérico.

### Caso 3: Éxito - Definición de término válido

- **Payload Enviado:**

```json
{
  "cmd": "business.define_term",
  "params": {
    "def_type": "permission",
    "def_key": "P1",
    "def_label": "PLabel"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": true,
  "message": "Término PLabel (permission) definido exitosamente."
}
```

- **Comportamiento:** Éxito. Define el nuevo término de negocio correctamente.
