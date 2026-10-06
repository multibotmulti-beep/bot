# Guía Técnica: staff.get_employee_activity

El comando `staff.get_employee_activity` es una herramienta de auditoría delegada. Su propósito es permitir que un usuario con rol DUEÑO consulte el historial de eventos (logs) registrados por un usuario específico (userId) en el sistema.

## 1. Requisitos de Autenticación y Seguridad

Para que cualquier petición a `/execute` sea aceptada, el desarrollador debe cumplir con tres requisitos estrictos:

1.  **Sesión Activa:** El usuario que realiza la petición debe estar logueado como DUEÑO y tener un token de sesión válido (session_token en cookies o Authorization: Bearer <token>).
2.  **Protección CSRF:** Obligatorio. Todas las peticiones POST a `/execute` requieren el encabezado:
    - `X-Requested-With: XMLHttpRequest`
    - Si este header falta, el servidor devolverá un error `403 Forbidden: CSRF protection`.
3.  **Permisos:** El usuario autenticado debe tener explícitamente el rol DUEÑO.

## 2. Especificación de la Petición

- **Endpoint:** POST `/execute`
- **Payload JSON:**

```json
{
  "cmd": "staff.get_employee_activity",
  "params": {
    "userId": 123
  }
}
```

## 3. Estructura de la Respuesta

El backend responde con una estructura `ServiceResponse`. Si `success` es `true`, el historial se encontrará dentro de la clave `data`.

### Ejemplo de respuesta exitosa

```json
{
  "success": true,
  "message": "Operation successful",
  "data": [
    {
      "id": 1024,
      "tenant_id": 1,
      "user_id": 123,
      "command": "stock.list",
      "status": "SUCCESS",
      "created_at": "2026-07-20T14:30:00Z",
      "payload": { ... }
    }
  ]
}
```

## 4. Troubleshooting

Si los desarrolladores reportan que el comando "no funciona" o da error, verifica los siguientes puntos en orden:

- **Error 401 Unauthorized o Session expired or invalid:**
  - Causa: El token de sesión no se envió correctamente o ha expirado.
  - Solución: Asegurar que la cookie `session_token` está presente en la petición o que el header `Authorization` está correctamente formado.
- **Error 403 Forbidden: CSRF protection:**
  - Causa: Falta el header `X-Requested-With: XMLHttpRequest`.
  - Solución: Añadir este header obligatorio en todas las llamadas `fetch` o `axios` que apunten a `/execute`.
- **Error 400 / 500 con mensaje `userId es requerido`:**
  - Causa: El JSON de `params` está mal formado.
  - Solución: Verificar que el payload JSON incluye `"params": { "userId": 123 }` exactamente.
- **La respuesta es `success: true` pero `data` está vacío:**
  - Causa: No es un error. Simplemente significa que el empleado (`userId`) no ha realizado ninguna acción registrada en el sistema de eventos (`system_events`) dentro del rango de tiempo o los filtros aplicados.

## 5. Ejemplo de Implementación (Client-Side / Axios)

```javascript
// Ejemplo de llamada segura usando Axios
async function getEmployeeActivity(userId) {
  try {
    const response = await axios.post(
      '/execute',
      {
        cmd: 'staff.get_employee_activity',
        params: { userId: userId },
      },
      {
        headers: {
          'X-Requested-With': 'XMLHttpRequest', // OBLIGATORIO PARA CSRF
        },
        withCredentials: true, // Necesario para enviar cookies de sesión
      }
    );
    return response.data.data;
  } catch (error) {
    console.error('Error al obtener actividad:', error.response?.data?.message);
  }
}
```
