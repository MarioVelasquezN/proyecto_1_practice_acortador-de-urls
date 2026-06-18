import { describe, expect, it, beforeEach, afterEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { closeDatabase, getDatabase } from "../src/db/database.js";
import { existsSync, unlinkSync, mkdirSync } from "fs";

const TEST_DB = "data/test-auth-http.db";

beforeEach(() => {
  mkdirSync("data", { recursive: true });
  closeDatabase();
  const dbFiles = [TEST_DB, `${TEST_DB}-shm`, `${TEST_DB}-wal`];
  for (const file of dbFiles) {
    if (existsSync(file)) unlinkSync(file);
  }
  process.env.DB_PATH = TEST_DB;
  process.env.JWT_SECRET = "test-secret-http";
  getDatabase();
});

afterEach(() => {
  closeDatabase();
  const dbFiles = [TEST_DB, `${TEST_DB}-shm`, `${TEST_DB}-wal`];
  for (const file of dbFiles) {
    if (existsSync(file)) unlinkSync(file);
  }
  delete process.env.DB_PATH;
  delete process.env.JWT_SECRET;
});

// ─── POST /auth/register ──────────────────────────────────────────────────────

describe("POST /auth/register", () => {
  it("201 con token y usuario al registrar correctamente", async () => {
    const app = createApp();
    const res = await request(app).post("/auth/register").send({
      email: "nuevo@ejemplo.com",
      password: "password123",
      name: "Nuevo Usuario",
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe("nuevo@ejemplo.com");
    expect(res.body.user.name).toBe("Nuevo Usuario");
    expect(res.body.user).toHaveProperty("id");
    expect(res.body.user).not.toHaveProperty("password_hash");
  });

  it("201 normaliza el email a minúsculas en la respuesta", async () => {
    const app = createApp();
    const res = await request(app).post("/auth/register").send({
      email: "MAYUSCULAS@EJEMPLO.COM",
      password: "password123",
      name: "Test",
    });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("mayusculas@ejemplo.com");
  });

  it("201 devuelve un JWT verificable con los datos del usuario", async () => {
    const app = createApp();
    const res = await request(app).post("/auth/register").send({
      email: "jwt@ejemplo.com",
      password: "password123",
      name: "JWT User",
    });

    const decoded = jwt.verify(
      res.body.token,
      "test-secret-http"
    ) as JwtPayload;
    expect(decoded.email).toBe("jwt@ejemplo.com");
    expect(decoded.sub).toBe(res.body.user.id);
    expect(decoded.exp! - decoded.iat!).toBe(86400);
  });

  it("400 si falta el email", async () => {
    const app = createApp();
    const res = await request(app).post("/auth/register").send({
      password: "password123",
      name: "Sin Email",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("400 si falta el password", async () => {
    const app = createApp();
    const res = await request(app).post("/auth/register").send({
      email: "test@ejemplo.com",
      name: "Sin Password",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("400 si falta el nombre", async () => {
    const app = createApp();
    const res = await request(app).post("/auth/register").send({
      email: "test@ejemplo.com",
      password: "password123",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("400 si el email tiene formato inválido", async () => {
    const app = createApp();
    const res = await request(app).post("/auth/register").send({
      email: "no-es-un-email",
      password: "password123",
      name: "Test",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it("400 si el password tiene menos de 8 caracteres", async () => {
    const app = createApp();
    const res = await request(app).post("/auth/register").send({
      email: "test@ejemplo.com",
      password: "corto",
      name: "Test",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8/);
  });

  it("409 si el email ya está registrado", async () => {
    const app = createApp();
    await request(app).post("/auth/register").send({
      email: "duplicado@ejemplo.com",
      password: "password123",
      name: "Primero",
    });

    const res = await request(app).post("/auth/register").send({
      email: "duplicado@ejemplo.com",
      password: "otrapassword",
      name: "Segundo",
    });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("error");
  });

  it("409 detecta duplicado aunque el segundo use mayúsculas", async () => {
    const app = createApp();
    await request(app).post("/auth/register").send({
      email: "duplicado@ejemplo.com",
      password: "password123",
      name: "Primero",
    });

    const res = await request(app).post("/auth/register").send({
      email: "DUPLICADO@EJEMPLO.COM",
      password: "otrapassword",
      name: "Segundo",
    });

    expect(res.status).toBe(409);
  });
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────

describe("POST /auth/login", () => {
  beforeEach(async () => {
    const app = createApp();
    await request(app).post("/auth/register").send({
      email: "existente@ejemplo.com",
      password: "mipassword123",
      name: "Usuario Existente",
    });
  });

  it("200 con token y usuario al hacer login correctamente", async () => {
    const app = createApp();
    const res = await request(app).post("/auth/login").send({
      email: "existente@ejemplo.com",
      password: "mipassword123",
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe("existente@ejemplo.com");
    expect(res.body.user).not.toHaveProperty("password_hash");
  });

  it("200 funciona con email en mayúsculas", async () => {
    const app = createApp();
    const res = await request(app).post("/auth/login").send({
      email: "EXISTENTE@EJEMPLO.COM",
      password: "mipassword123",
    });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("existente@ejemplo.com");
  });

  it("200 devuelve un JWT verificable", async () => {
    const app = createApp();
    const res = await request(app).post("/auth/login").send({
      email: "existente@ejemplo.com",
      password: "mipassword123",
    });

    const decoded = jwt.verify(
      res.body.token,
      "test-secret-http"
    ) as JwtPayload;
    expect(decoded.email).toBe("existente@ejemplo.com");
  });

  it("400 si falta el email", async () => {
    const app = createApp();
    const res = await request(app).post("/auth/login").send({
      password: "mipassword123",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("400 si falta el password", async () => {
    const app = createApp();
    const res = await request(app).post("/auth/login").send({
      email: "existente@ejemplo.com",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("400 si el email tiene formato inválido", async () => {
    const app = createApp();
    const res = await request(app).post("/auth/login").send({
      email: "no-es-email",
      password: "mipassword123",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it("401 con password incorrecto", async () => {
    const app = createApp();
    const res = await request(app).post("/auth/login").send({
      email: "existente@ejemplo.com",
      password: "passwordincorrecto",
    });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("401 con email inexistente", async () => {
    const app = createApp();
    const res = await request(app).post("/auth/login").send({
      email: "noexiste@ejemplo.com",
      password: "mipassword123",
    });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("401 usa el mismo mensaje para email inexistente y password incorrecto", async () => {
    const app = createApp();

    const resEmailInexistente = await request(app).post("/auth/login").send({
      email: "noexiste@ejemplo.com",
      password: "mipassword123",
    });

    const resPasswordMal = await request(app).post("/auth/login").send({
      email: "existente@ejemplo.com",
      password: "passwordincorrecto",
    });

    expect(resEmailInexistente.body.error).toBe(resPasswordMal.body.error);
  });
});
