import { describe, expect, it, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import { authenticate } from "../src/middleware/authenticate.js";

const SECRET = "test-secret-middleware";

function buildApp() {
  const app = express();
  app.use(express.json());

  app.get("/protected", authenticate, (req, res) => {
    res.status(200).json({ user: req.user });
  });

  return app;
}

function makeToken(
  payload: object,
  secret = SECRET,
  options: jwt.SignOptions = { expiresIn: "1h" }
) {
  return jwt.sign(payload, secret, options);
}

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.JWT_SECRET;
});

describe("middleware authenticate", () => {
  describe("token válido", () => {
    it("pasa la request y adjunta el usuario en req.user", async () => {
      const token = makeToken({ sub: 42, email: "user@ejemplo.com" });
      const res = await request(buildApp())
        .get("/protected")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({ id: 42, email: "user@ejemplo.com" });
    });

    it("req.user.id es un número aunque sub venga como string en el JWT", async () => {
      const token = makeToken({ sub: "7", email: "user@ejemplo.com" });
      const res = await request(buildApp())
        .get("/protected")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(typeof res.body.user.id).toBe("number");
      expect(res.body.user.id).toBe(7);
    });
  });

  describe("sin token", () => {
    it("401 si no hay header Authorization", async () => {
      const res = await request(buildApp()).get("/protected");

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
    });

    it("401 si el header Authorization existe pero no tiene prefijo Bearer", async () => {
      const token = makeToken({ sub: 1, email: "u@e.com" });
      const res = await request(buildApp())
        .get("/protected")
        .set("Authorization", token);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
    });

    it("401 si el header Authorization es solo la palabra Bearer sin token", async () => {
      const res = await request(buildApp())
        .get("/protected")
        .set("Authorization", "Bearer ");

      expect(res.status).toBe(401);
    });
  });

  describe("token inválido o expirado", () => {
    it("401 con token malformado (cadena aleatoria)", async () => {
      const res = await request(buildApp())
        .get("/protected")
        .set("Authorization", "Bearer esto.no.es.un.jwt");

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
    });

    it("401 con token firmado con un secret diferente", async () => {
      const token = makeToken({ sub: 1, email: "u@e.com" }, "otro-secret");
      const res = await request(buildApp())
        .get("/protected")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(401);
    });

    it("401 con token expirado", async () => {
      const token = makeToken(
        { sub: 1, email: "u@e.com" },
        SECRET,
        { expiresIn: "0s" }
      );

      await new Promise((r) => setTimeout(r, 10));

      const res = await request(buildApp())
        .get("/protected")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
    });
  });
});
