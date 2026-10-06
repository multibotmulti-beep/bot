# Auditoría Exhaustiva y Detallada: Comando staff.get_pending_tasks

## Descripción del Comando

Obtiene las tareas pendientes (`status: 'pending'`) asignadas al usuario actual (`context.userId`).

## Casos de Prueba Ejecutados

### Caso 1: Obtención de tareas (Usuario sin tareas)

- **Payload Enviado:**

```json
{
  "cmd": "staff.get_pending_tasks",
  "params": {}
}
```

- **Respuesta Recibida:**

```json
{
  "success": true,
  "message": "Tareas obtenidas",
  "data": {
    "status": "success",
    "results": []
  }
}
```

- **Comportamiento:** Éxito. Retorna una lista vacía, ya que el usuario actual no tiene tareas asignadas.

### Caso 2: Uso con parámetros inesperados

- **Payload Enviado:**

```json
{
  "cmd": "staff.get_pending_tasks",
  "params": {
    "filtro": "algo"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": true,
  "message": "Tareas obtenidas",
  "data": {
    "status": "success",
    "results": []
  }
}
```

- **Comportamiento:** Éxito. Al igual que otros comandos de lectura, ignora los parámetros enviados en `params` y ejecuta la consulta basada en el contexto del usuario (`userId` del token).
