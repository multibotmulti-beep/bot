# Auditoría Exhaustiva y Detallada: Comando staff.list

## Descripción del Comando

Lista todos los empleados vinculados a la empresa (tenant). Requiere permisos de 'DUEÑO'.

## Casos de Prueba Ejecutados

### Caso 1: Listado Exitoso de Empleados

- **Payload Enviado:**

```json
{
  "cmd": "staff.list",
  "params": {}
}
```

- **Respuesta Recibida:**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "status": "success",
    "usuarios": [
      {
        "id": 157,
        "username": "nuevo_usuario_curl",
        "password": "$2b$10$5OpEmBTQxcg5BtGMJMyvCuumGjwJR9hDYTZ7eH9iLgLj9g8Kd5RI.",
        "role_id": 3,
        "token": "8bbfe319-a004-4920-8459-592ce9a0bfc8",
        "cliente_id": 119,
        "permisos": [],
        "role_name": "DUEÑO"
      }
    ]
  }
}
```

- **Comportamiento:** Éxito. Retorna la lista de usuarios.
  _Nota de seguridad: Se observa que la respuesta contiene el hash de la contraseña (`password`), lo cual es una vulnerabilidad de seguridad grave._
