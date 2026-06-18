import { describe, expect, it, beforeEach, afterEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app.js";
import { closeDatabase, getDatabase } from "../src/db/database.js";
import { existsSync, unlinkSync, mkdirSync } from "fs";

const TEST_DB = "data/test-snap.db";

async function getAuthToken(app: Express): Promise<string> {
  const res = await request(app).post("/auth/register").send({
    email: "testuser@ejemplo.com",
    password: "password123",
    name: "Test User",
  });
  return res.body.token as string;
}

function setupTestDatabase(): void {
  mkdirSync("data", { recursive: true });
  closeDatabase();

  const dbFiles = [TEST_DB, `${TEST_DB}-shm`, `${TEST_DB}-wal`];
  for (const file of dbFiles) {
    if (existsSync(file)) unlinkSync(file);
  }

  process.env.DB_PATH = TEST_DB;
  process.env.JWT_SECRET = "test-secret-urls";
  getDatabase();
}

beforeEach(() => {
  setupTestDatabase();
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

describe("URLs Module", () => {
  describe("POST /u - Crear URL corta", () => {
    it("201 crea una URL corta con token válido", async () => {
      const app = createApp();
      const token = await getAuthToken(app);

      const response = await request(app)
        .post("/u")
        .set("Authorization", `Bearer ${token}`)
        .send({ long_url: "https://www.ejemplo.com/pagina-muy-larga" });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("code");
      expect(response.body).toHaveProperty("long_url");
      expect(response.body).toHaveProperty("created_at");
      expect(response.body).toHaveProperty("visits");
      expect(response.body.long_url).toBe("https://www.ejemplo.com/pagina-muy-larga");
      expect(response.body.visits).toBe(0);
      expect(response.body.code).toMatch(/^[a-zA-Z0-9]{6}$/);
    });

    it("401 sin token", async () => {
      const app = createApp();
      const response = await request(app)
        .post("/u")
        .send({ long_url: "https://www.ejemplo.com" });

      expect(response.status).toBe(401);
    });

    it("400 si falta long_url", async () => {
      const app = createApp();
      const token = await getAuthToken(app);

      const response = await request(app)
        .post("/u")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("201 añade https:// automáticamente si falta el esquema", async () => {
      const app = createApp();
      const token = await getAuthToken(app);

      const response = await request(app)
        .post("/u")
        .set("Authorization", `Bearer ${token}`)
        .send({ long_url: "www.google.es" });

      expect(response.status).toBe(201);
      expect(response.body.long_url).toBe("https://www.google.es");
    });

    it("201 respeta http:// si ya viene con ese esquema", async () => {
      const app = createApp();
      const token = await getAuthToken(app);

      const response = await request(app)
        .post("/u")
        .set("Authorization", `Bearer ${token}`)
        .send({ long_url: "http://inseguro.com" });

      expect(response.status).toBe(201);
      expect(response.body.long_url).toBe("http://inseguro.com");
    });

    it("400 si la URL no es válida ni siquiera con https://", async () => {
      const app = createApp();
      const token = await getAuthToken(app);

      const response = await request(app)
        .post("/u")
        .set("Authorization", `Bearer ${token}`)
        .send({ long_url: "esto no es una url" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("genera códigos únicos para diferentes URLs", async () => {
      const app = createApp();
      const token = await getAuthToken(app);

      const response1 = await request(app)
        .post("/u")
        .set("Authorization", `Bearer ${token}`)
        .send({ long_url: "https://ejemplo1.com" });

      const response2 = await request(app)
        .post("/u")
        .set("Authorization", `Bearer ${token}`)
        .send({ long_url: "https://ejemplo2.com" });

      expect(response1.body.code).not.toBe(response2.body.code);
    });
  });

  describe("GET /u - Listar todas las URLs (público)", () => {
    it("200 lista vacía sin autenticación", async () => {
      const app = createApp();
      const response = await request(app).get("/u");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("200 retorna todas las URLs creadas", async () => {
      const app = createApp();
      const token = await getAuthToken(app);

      await request(app)
        .post("/u")
        .set("Authorization", `Bearer ${token}`)
        .send({ long_url: "https://ejemplo1.com" });

      await request(app)
        .post("/u")
        .set("Authorization", `Bearer ${token}`)
        .send({ long_url: "https://ejemplo2.com" });

      const response = await request(app).get("/u");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty("code");
      expect(response.body[0]).toHaveProperty("long_url");
      expect(response.body[0]).toHaveProperty("visits");
    });

    it("200 retorna URLs ordenadas por fecha descendente", async () => {
      const app = createApp();
      const token = await getAuthToken(app);

      await request(app)
        .post("/u")
        .set("Authorization", `Bearer ${token}`)
        .send({ long_url: "https://primera.com" });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      await request(app)
        .post("/u")
        .set("Authorization", `Bearer ${token}`)
        .send({ long_url: "https://segunda.com" });

      const listResponse = await request(app).get("/u");

      expect(listResponse.body).toHaveLength(2);
      expect(listResponse.body[0].long_url).toBe("https://segunda.com");
      expect(listResponse.body[1].long_url).toBe("https://primera.com");
    });
  });

  describe("GET /u/:code - Redirigir (público)", () => {
    it("302 redirige a la URL larga", async () => {
      const app = createApp();
      const token = await getAuthToken(app);

      const createResponse = await request(app)
        .post("/u")
        .set("Authorization", `Bearer ${token}`)
        .send({ long_url: "https://www.ejemplo.com/destino" });

      const code = createResponse.body.code;
      const redirectResponse = await request(app)
        .get(`/u/${code}`)
        .redirects(0);

      expect(redirectResponse.status).toBe(302);
      expect(redirectResponse.header.location).toBe("https://www.ejemplo.com/destino");
    });

    it("incrementa el contador de visitas sin autenticación", async () => {
      const app = createApp();
      const token = await getAuthToken(app);

      const createResponse = await request(app)
        .post("/u")
        .set("Authorization", `Bearer ${token}`)
        .send({ long_url: "https://www.ejemplo.com/destino" });

      const code = createResponse.body.code;

      await request(app).get(`/u/${code}`).redirects(0);
      await request(app).get(`/u/${code}`).redirects(0);

      const listResponse = await request(app).get("/u");
      const url = listResponse.body.find(
        (u: { code: string }) => u.code === code
      );

      expect(url.visits).toBe(2);
    });

    it("404 si el código no existe", async () => {
      const app = createApp();
      const response = await request(app).get("/u/INVALID");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /u/:code - Borrar URL (protegido)", () => {
    it("204 el propietario puede borrar su URL", async () => {
      const app = createApp();
      const token = await getAuthToken(app);

      const createRes = await request(app)
        .post("/u")
        .set("Authorization", `Bearer ${token}`)
        .send({ long_url: "https://a-borrar.com" });

      const code = createRes.body.code;

      const deleteRes = await request(app)
        .delete(`/u/${code}`)
        .set("Authorization", `Bearer ${token}`);

      expect(deleteRes.status).toBe(204);

      // Verificar que ya no existe
      const getRes = await request(app).get(`/u/${code}`).redirects(0);
      expect(getRes.status).toBe(404);
    });

    it("403 otro usuario no puede borrar una URL ajena", async () => {
      const app = createApp();
      const ownerToken = await getAuthToken(app);

      // Registrar segundo usuario
      const other = await request(app).post("/auth/register").send({
        email: "otro@ejemplo.com",
        password: "password123",
        name: "Otro",
      });
      const otherToken = other.body.token as string;

      const createRes = await request(app)
        .post("/u")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ long_url: "https://del-primero.com" });

      const code = createRes.body.code;

      const deleteRes = await request(app)
        .delete(`/u/${code}`)
        .set("Authorization", `Bearer ${otherToken}`);

      expect(deleteRes.status).toBe(403);
    });

    it("404 al intentar borrar un código inexistente", async () => {
      const app = createApp();
      const token = await getAuthToken(app);

      const res = await request(app)
        .delete("/u/NOEXISTE")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it("401 sin token", async () => {
      const app = createApp();
      const res = await request(app).delete("/u/CUALQUIERA");

      expect(res.status).toBe(401);
    });
  });
});
