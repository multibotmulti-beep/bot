# Auditoría Exhaustiva y Detallada: Comando staff.define_term

## Descripción del Comando

Define un término personalizado (tipo: permission, goal_type, task) en la configuración del negocio. Requiere parámetros `def_type`, `def_key` y `def_label`.

## Casos de Prueba Ejecutados

### Caso 1: Error - Tipo de término inválido

- **Payload Enviado:**

```json
{
  "cmd": "staff.define_term",
  "params": {
    "def_type": "invalid_type",
    "def_key": "KEY1",
    "def_label": "Label 1"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "Tipo inválido. Debe ser 'permission', 'goal_type' o 'task'.",
  "user_message": "Ha ocurrido un error inesperado. Por favor, intenta más tarde.",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "source": "INTERNAL"
  }
}
```

- **Comportamiento:** Valida correctamente el tipo de término, pero retorna un error genérico `INTERNAL_SERVER_ERROR`.

### Caso 2: Éxito - Definición de nuevo permiso

- **Payload Enviado:**

```json
{
  "cmd": "staff.define_term",
  "params": {
    "def_type": "permission",
    "def_key": "perm_test",
    "def_label": "Permiso Test"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "status": "success"
    // ...datos de infraestructura confirmando la inserción
  }
}
```

- **Comportamiento:** Éxito. Inserta el nuevo término en la configuración de permisos.

### Caso 3: Éxito - Definición de nueva tarea

- **Payload Enviado:**

```json
{
  "cmd": "staff.define_term",
  "params": {
    "def_type": "task",
    "def_key": "task_test",
    "def_label": "Tarea Test"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "status": "success"
    // ...datos de infraestructura confirmando la inserción
  }
}
```

- **Comportamiento:** Éxito. Inserta el nuevo término en la configuración de tareas.
