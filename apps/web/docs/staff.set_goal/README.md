# Auditoría Exhaustiva y Detallada: Comando staff.set_goal

## Descripción del Comando

Asigna una meta de rendimiento a un empleado. Requiere parámetros `employeeId`, `goalType` y `target`.

## Casos de Prueba Ejecutados

### Caso 1: Error - Falta campo obligatorio 'employeeId'

- **Payload Enviado:**

```json
{
  "cmd": "staff.set_goal",
  "params": {
    "goalType": "VENTAS",
    "target": 100
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "employeeId, goalType y target son requeridos",
  "user_message": "Ha ocurrido un error inesperado. Por favor, intenta más tarde.",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "source": "INTERNAL"
  }
}
```

- **Comportamiento:** Valida correctamente la ausencia del campo, retorna un error genérico `INTERNAL_SERVER_ERROR`.

### Caso 2: Error - Empleado inexistente

- **Payload Enviado:**

```json
{
  "cmd": "staff.set_goal",
  "params": {
    "employeeId": "NOEXISTE",
    "goalType": "VENTAS",
    "target": 100
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "Empleado no encontrado",
  "user_message": "Ha ocurrido un error inesperado. Por favor, intenta más tarde.",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "source": "INTERNAL"
  }
}
```

- **Comportamiento:** Detecta que el empleado no existe, retorna el error de negocio, pero nuevamente enmascarado como `INTERNAL_SERVER_ERROR`.

### Caso 3: Error - Empleado existente no encontrado en 'employees'

- **Payload Enviado:**

```json
{
  "cmd": "staff.set_goal",
  "params": {
    "employeeId": "nuevo_usuario_curl",
    "goalType": "VENTAS",
    "target": 500,
    "startDate": "2026-01-01",
    "endDate": "2026-12-31"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "Empleado no encontrado",
  "user_message": "Ha ocurrido un error inesperado. Por favor, intenta más tarde.",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "source": "INTERNAL"
  }
}
```

- **Comportamiento:** **FALLA FUNCIONAL**. Aunque el usuario `nuevo_usuario_curl` existe en el sistema (verificado en `staff.list`), el comando busca al empleado en la ruta `employees` de la base de datos, la cual parece estar desincronizada o vacía, haciendo que el comando sea inoperante para asignar metas.
