# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
npm run dev        # Servidor en modo desarrollo con recarga automática (tsx watch)
npm run build      # Compila TypeScript a dist/
npm start          # Ejecuta el build compilado
npm test           # Ejecuta tests una vez (vitest run)
npm run test:watch # Ejecuta tests en modo watch
```

Para ejecutar un solo test:
```bash
npx vitest run tests/health.test.ts
```

## Variables de entorno

| Variable     | Por defecto                        | Descripción              |
|--------------|------------------------------------|--------------------------|
| `PORT`       | `3000`                             | Puerto del servidor      |
| `DB_PATH`    | `data/snap.db`                     | Ruta de la base de datos |
| `JWT_SECRET` | `dev-secret-change-in-production`  | Clave para firmar JWTs   |

## Arquitectura

**Snap** es un acortador de URLs con analíticas. Stack: Express + TypeScript + better-sqlite3 (SQLite, WAL mode). Sin ORM.

### Estructura de módulos

```
src/
  app.ts               # Crea la app Express (factory function, sin efectos secundarios)
  server.ts            # Punto de entrada: inicializa DB y arranca el servidor
  config/env.ts        # Configuración vía variables de entorno
  db/database.ts       # Singleton de conexión SQLite; crea el schema al arrancar
  middleware/
    authenticate.ts    # authenticate (requiere JWT) y optionalAuthenticate (JWT opcional)
  modules/
    auth/              # Registro/login con bcrypt + JWT
    urls/              # Acortado de URLs, redirección y dashboard
```

### Rutas de la API

| Método   | Ruta             | Auth         | Descripción                                 |
|----------|------------------|--------------|---------------------------------------------|
| GET      | `/health`        | No           | Healthcheck                                 |
| POST     | `/auth/register` | No           | Registra usuario                            |
| POST     | `/auth/login`    | No           | Login; devuelve JWT (expira en 24h)         |
| GET      | `/u/`            | Opcional     | Lista todas las URLs (`is_owner` en cada una) |
| POST     | `/u/`            | Requerida    | Crea URL corta                              |
| GET      | `/u/dashboard`   | Requerida    | Analíticas del usuario (últimos 30 días)    |
| GET      | `/u/:code`       | No           | Redirige a la URL larga (registra el click) |
| DELETE   | `/u/:code`       | Requerida    | Borra URL propia                            |

**Importante:** en `createURLsRouter`, `/dashboard` se registra antes de `/:code` para evitar que "dashboard" sea tratado como un código.

### Capa de datos

- `db/database.ts` exporta `getDatabase()` (singleton con reconexión si cambia `DB_PATH`).
- Cada módulo tiene su propio `repository.ts` que llama a `getDatabase()` directamente; no hay capa de abstracción adicional.
- Los clics se registran en `click_events` dentro de una transacción junto con el incremento de `urls.visits`.
- `getUserDashboard` corre 4 queries SQL separadas y las ensambla en un `DashboardResponse`.

### Patrones clave

- Cada módulo expone un `index.ts` que re-exporta la factory del router.
- `createApp()` en `app.ts` es una función pura (sin efectos secundarios) para facilitar los tests con `supertest`.
- Los tests usan `createApp()` directamente sin levantar el servidor; la DB en tests usa la ruta de `DB_PATH` (por defecto `data/snap.db`).
- El código corto de 6 caracteres se genera aleatoriamente con reintentos (máx. 10) ante colisiones de UNIQUE.
