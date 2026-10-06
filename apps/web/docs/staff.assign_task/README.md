# Auditoría Exhaustiva y Detallada: Comando staff.assign_task

## Descripción del Comando

Asigna una tarea definida a un empleado específico. Requiere parámetros `employeeId` y `taskKey`.

## Casos de Prueba Ejecutados

### Caso 1: Error - Falta campo obligatorio 'employeeId'

- **Payload Enviado:**

```json
{
  "cmd": "staff.assign_task",
  "params": {
    "taskKey": "TASK_TEST"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "employeeId y taskKey son requeridos",
  "user_message": "Ha ocurrido un error inesperado. Por favor, intenta más tarde.",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "source": "INTERNAL"
  }
}
```

- **Comportamiento:** Valida correctamente la ausencia del campo, pero retorna un error genérico `INTERNAL_SERVER_ERROR`.

### Caso 2: Error - Falta campo obligatorio 'taskKey'

- **Payload Enviado:**

```json
{
  "cmd": "staff.assign_task",
  "params": {
    "employeeId": "157"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "employeeId y taskKey son requeridos",
  "user_message": "Ha ocurrido un error inesperado. Por favor, intenta más tarde.",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "source": "INTERNAL"
  }
}
```

- **Comportamiento:** Idéntico al Caso 1.

### Caso 3: Éxito - Asignación válida

- **Payload Enviado:**

```json
{
  "cmd": "staff.assign_task",
  "params": {
    "employeeId": "157",
    "taskKey": "TASK_TEST",
    "deadline": "2026-12-31"
  }
}
```

- **Respuesta Recibida (Resumida para legibilidad, el campo updatedData contiene el estado completo):**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "status": "success",
    "updatedData": {
      "tasks": [
        {
          "id": "TASK-1784412675533",
          "status": "pending",
          "taskKey": "TASK_TEST",
          "deadline": "2026-12-31",
          "tenantId": 119,
          "assignedAt": "2026-07-18T22:11:15.533Z",
          "employeeId": "157"
        }
      ]
      // ... (resto de datos de infraestructura)
    }
  }
}
```

- **Comportamiento:** Éxito. Crea la tarea con status `pending`, genera un ID único `TASK-<timestamp>`, y asocia la tarea al empleado indicado.
