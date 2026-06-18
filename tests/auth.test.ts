import { describe, expect, it, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";
import { register, login, AuthError } from "../src/modules/auth/index.js";
import { closeDatabase, getDatabase } from "../src/db/database.js";
import { existsSync, unlinkSync, mkdirSync } from "fs";

const TEST_DB = "data/test-auth.db";

beforeEach(() => {
  mkdirSync("data", { recursive: true });
  closeDatabase();
  const dbFiles = [TEST_DB, `${TEST_DB}-shm`, `${TEST_DB}-wal`];
  for (const file of dbFiles) {
    if (existsSync(file)) unlinkSync(file);
  }
  process.env.DB_PATH = TEST_DB;
  process.env.JWT_SECRET = "test-secret";
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

describe("Auth Service", () => {
  describe("register", () => {
    it("registro exitoso: devuelve token y datos del usuario", async () => {
      const result = await register({
        email: "usuario@ejemplo.com",
        password: "password123",
        name: "Usuario Test",
      });

      expect(result).toHaveProperty("token");
      expect(result.user.email).toBe("usuario@ejemplo.com");
      expect(result.user.name).toBe("Usuario Test");
      expect(result.user).toHaveProperty("id");
      expect(result.user).not.toHaveProperty("password_hash");
    });

    it("registro exitoso: el token es un JWT válido con sub y email", async () => {
      const result = await register({
        email: "usuario@ejemplo.com",
        password: "password123",
        name: "Usuario Test",
      });

      const decoded = jwt.verify(result.token, "test-secret") as jwt.JwtPayload;
      expect(decoded.email).toBe("usuario@ejemplo.com");
      expect(decoded.sub).toBe(result.user.id);
    });

    it("registro exitoso: el token expira en 24h", async () => {
      const result = await register({
        email: "usuario@ejemplo.com",
        password: "password123",
        name: "Usuario Test",
      });

      const decoded = jwt.verify(result.token, "test-secret") as jwt.JwtPayload;
      const expiresIn = decoded.exp! - decoded.iat!;
      expect(expiresIn).toBe(60 * 60 * 24);
    });

    it("registro con email duplicado: lanza AuthError 409", async () => {
      await register({
        email: "duplicado@ejemplo.com",
        password: "password123",
        name: "Primero",
      });

      await expect(
        register({
          email: "duplicado@ejemplo.com",
          password: "otrapass",
          name: "Segundo",
        })
      ).rejects.toThrow(AuthError);

      await expect(
        register({
          email: "duplicado@ejemplo.com",
          password: "otrapass",
          name: "Segundo",
        })
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it("registro normaliza el email a minúsculas", async () => {
      const result = await register({
        email: "USUARIO@EJEMPLO.COM",
        password: "password123",
        name: "Usuario Test",
      });

      expect(result.user.email).toBe("usuario@ejemplo.com");
    });
  });

  describe("login", () => {
    beforeEach(async () => {
      await register({
        email: "login@ejemplo.com",
        password: "mipassword",
        name: "Login User",
      });
    });

    it("login exitoso: devuelve token y datos del usuario", async () => {
      const result = await login({
        email: "login@ejemplo.com",
        password: "mipassword",
      });

      expect(result).toHaveProperty("token");
      expect(result.user.email).toBe("login@ejemplo.com");
      expect(result.user.name).toBe("Login User");
    });

    it("login exitoso: el token es un JWT válido", async () => {
      const result = await login({
        email: "login@ejemplo.com",
        password: "mipassword",
      });

      const decoded = jwt.verify(result.token, "test-secret") as jwt.JwtPayload;
      expect(decoded.email).toBe("login@ejemplo.com");
    });

    it("login con password incorrecto: lanza AuthError 401", async () => {
      await expect(
        login({ email: "login@ejemplo.com", password: "wrongpassword" })
      ).rejects.toThrow(AuthError);

      await expect(
        login({ email: "login@ejemplo.com", password: "wrongpassword" })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it("login con email inexistente: lanza AuthError 401", async () => {
      await expect(
        login({ email: "noexiste@ejemplo.com", password: "mipassword" })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it("login con email en mayúsculas: funciona correctamente", async () => {
      const result = await login({
        email: "LOGIN@EJEMPLO.COM",
        password: "mipassword",
      });

      expect(result.user.email).toBe("login@ejemplo.com");
      expect(result).toHaveProperty("token");
    });
  });
});
