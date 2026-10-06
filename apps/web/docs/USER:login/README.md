# Auditoría Exhaustiva y Detallada: Comando USER:login

## Descripción del Comando

Autentica un usuario y devuelve un token de sesión. Requiere parámetros `username` y `password`.

## Casos de Prueba Ejecutados

### Caso 1: Éxito - Login correcto

- **Payload Enviado:**

```json
{
  "cmd": "USER:login",
  "params": {
    "username": "nuevo_usuario_curl",
    "password": "passwordSeguro123!"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 157,
      "username": "nuevo_usuario_curl",
      "role_name": "DUEÑO",
      "token": "0616d7cf-39c0-467d-902b-f09d2c6c2bc4"
    },
    "sessionEstablished": true
  }
}
```

- **Comportamiento:** Éxito. Autentica al usuario y retorna el token y los datos del usuario.

### Caso 2: Error - Credenciales incorrectas

- **Payload Enviado:**

```json
{
  "cmd": "USER:login",
  "params": {
    "username": "nuevo_usuario_curl",
    "password": "wrongpassword"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "An unexpected internal error occurred. Invalid username or password.",
  "user_message": "Ha ocurrido un error inesperado. Por favor, intenta más tarde.",
  "error": {
    "code": "INVALID_CREDENTIALS",
    "source": "INFRASTRUCTURE"
  }
}
```

- **Comportamiento:** Correcto. Retorna error por credenciales inválidas, pero enmascarado como error inesperado para el usuario final.

### Caso 3: Error - Falta campo obligatorio 'username'

- **Payload Enviado:**

```json
{
  "cmd": "USER:login",
  "params": {
    "password": "passwordSeguro123!"
  }
}
```

- **Respuesta Recibida:**

```json
{
  "success": false,
  "message": "Username and password are required",
  "user_message": "Datos de entrada no válidos. Causa: Uno o más campos enviados no cumplen con los requisitos obligatorios o el formato esperado. Solución: Revisa los mensajes de error en los campos del formulario y asegúrate de completar toda la información requerida.",
  "error": {
    "code": "VALIDATION_ERROR",
    "source": "INFRASTRUCTURE"
  }
}
```

- **Comportamiento:** Correcto. El mensaje de `user_message` es más específico y útil en este caso, guiando al usuario sobre el error.
