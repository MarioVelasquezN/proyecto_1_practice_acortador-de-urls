# Snap API

Base URL: `http://localhost:3000`

Endpoints protegidos requieren el header:
```
Authorization: Bearer <token>
```

---

## Health

### `GET /health`

Comprueba que el servidor está en funcionamiento.

**Respuesta 200**
```json
{ "status": "ok" }
```

---

## Auth

### `POST /auth/register`

Registra un nuevo usuario y devuelve un token JWT.

**Body**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "minimo8chars",
  "name": "Nombre Apellido"
}
```

**Respuesta 201**
```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "email": "usuario@ejemplo.com",
    "name": "Nombre Apellido"
  }
}
```

**Errores**

| Código | Motivo |
|---|---|
| 400 | Campo faltante, email inválido o password < 8 caracteres |
| 409 | El email ya está registrado |

---

### `POST /auth/login`

Autentica un usuario existente.

**Body**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "minimo8chars"
}
```

**Respuesta 200**
```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "email": "usuario@ejemplo.com",
    "name": "Nombre Apellido"
  }
}
```

**Errores**

| Código | Motivo |
|---|---|
| 400 | Campo faltante o email inválido |
| 401 | Credenciales incorrectas |

---

## URLs

### `GET /u`

Lista todas las URLs acortadas, ordenadas por fecha de creación descendente. Público.

**Respuesta 200**
```json
[
  {
    "code": "xK9mPq",
    "long_url": "https://ejemplo.com/pagina-larga",
    "created_at": "2026-06-18T10:00:00",
    "visits": 42
  }
]
```

---

### `POST /u` — _protegido_

Crea una nueva URL acortada. Si `long_url` no incluye esquema, se añade `https://` automáticamente.

**Body**
```json
{ "long_url": "https://ejemplo.com/pagina-muy-larga" }
```

**Respuesta 201**
```json
{
  "code": "xK9mPq",
  "long_url": "https://ejemplo.com/pagina-muy-larga",
  "created_at": "2026-06-18T10:00:00",
  "visits": 0
}
```

**Errores**

| Código | Motivo |
|---|---|
| 400 | `long_url` ausente o no es una URL válida |
| 401 | Token ausente o inválido |

---

### `GET /u/:code`

Redirige a la URL larga correspondiente al código. Registra el click. Público.

**Respuesta 302** — header `Location: <long_url>`

**Errores**

| Código | Motivo |
|---|---|
| 404 | Código no encontrado |

---

### `DELETE /u/:code` — _protegido_

Elimina una URL acortada. Solo el propietario puede borrarla.

**Respuesta 204** — sin cuerpo

**Errores**

| Código | Motivo |
|---|---|
| 401 | Token ausente o inválido |
| 403 | La URL pertenece a otro usuario |
| 404 | Código no encontrado |

---

### `GET /u/dashboard` — _protegido_

Devuelve una vista de rendimiento de todas las URLs del usuario autenticado: totales globales, la URL con más visitas y tendencias de los últimos 30 días.

Los clicks se contabilizan en tiempo real: cada redirección (`GET /u/:code`) registra un evento con timestamp, lo que permite el desglose diario.

**Respuesta 200**
```json
{
  "summary": {
    "total_urls": 12,
    "total_clicks": 347,
    "avg_clicks_per_url": 28.9
  },
  "best_url": {
    "code": "xK9mPq",
    "long_url": "https://ejemplo.com/pagina-larga",
    "created_at": "2026-06-10T14:23:00",
    "visits": 120
  },
  "urls_created_by_day": [
    { "date": "2026-06-18", "count": 3 },
    { "date": "2026-06-15", "count": 1 }
  ],
  "clicks_by_day": [
    { "date": "2026-06-18", "clicks": 45 },
    { "date": "2026-06-17", "clicks": 23 }
  ],
  "period_days": 30
}
```

Cuando el usuario no tiene URLs, `summary` devuelve ceros, `best_url` es `null` y los arrays de tendencias están vacíos.

**Errores**

| Código | Motivo |
|---|---|
| 401 | Token ausente o inválido |
