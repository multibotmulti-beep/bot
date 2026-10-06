# Registro de Auditoría Detallado: Endpoint /register

## Casos de Prueba

### Caso: Registro Exitoso

- **Payload Enviado:**

```json
{
  "username": "user_ok",
  "password": "password123",
  "nombreCliente": "Cliente OK"
}
```

- **Respuesta Obtenida:**

```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "status": "success",
    "message": "Registration successful",
    "cliente": { "id": 116, "nombre": "Cliente OK" },
    "user": {
      "id": 151,
      "username": "user_ok",
      "token": "3e280bac-a23d-4830-a6c3-9e6670c977e9"
    }
  }
}
```

### Caso: Falta Campos Obligatorios

- **Payload Enviado:**

```json
{ "password": "password123", "nombreCliente": "Cliente Error" }
```

- **Respuesta Obtenida:**

```json
{
  "success": false,
  "message": "username, password and nombreCliente are required"
}
```

### Caso: Usuario Duplicado

- **Payload Enviado:**

```json
{
  "username": "user_ok",
  "password": "password123",
  "nombreCliente": "Cliente Duplicado"
}
```

- **Respuesta Obtenida:**

```json
{
  "success": false,
  "message": "A user with this username already exists. The username 'user_ok' is already taken.",
  "error": {
    "code": "USER_EXISTS",
    "message": "Request failed with status code 400"
  }
}
```

### Caso: Campos Vacíos

- **Payload Enviado:**

```json
{ "username": "", "password": "", "nombreCliente": "" }
```

- **Respuesta Obtenida:**

```json
{
  "success": false,
  "message": "username, password and nombreCliente are required"
}
```

### Caso: Contraseña Corta

- **Payload Enviado:**

```json
{ "username": "user_short", "password": "1", "nombreCliente": "Cliente Short" }
```

- **Respuesta Obtenida:**

```json
{
  "success": false,
  "message": "The request payload for command 'APP:self-register' is incorrect. El campo 'password' es demasiado corto (mínimo 6 caracteres).",
  "error": {
    "code": "INVALID_PAYLOAD",
    "message": "Request failed with status code 400"
  }
}
```

### Caso: Contraseña Compleja

- **Payload Enviado:**

```json
{
  "username": "user_special",
  "password": "pass!@#$%^&*()_+ñéáíóú",
  "nombreCliente": "Cliente Special"
}
```

- **Respuesta Obtenida:**

```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "status": "success",
    "message": "Registration successful",
    "cliente": { "id": 117, "nombre": "Cliente Special" },
    "user": {
      "id": 152,
      "username": "user_special",
      "token": "35dc92a2-a229-4362-a85f-426c2d6d15c3"
    }
  }
}
```
