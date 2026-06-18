import { describe, expect, it, beforeEach, afterEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app.js";
import { closeDatabase, getDatabase } from "../src/db/database.js";
import { existsSync, unlinkSync, mkdirSync } from "fs";

const TEST_DB = "data/test-dashboard.db";

async function getAuthToken(app: Express, email = "user@ejemplo.com"): Promise<string> {
  const res = await request(app).post("/auth/register").send({
    email,
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
  process.env.JWT_SECRET = "test-secret-dashboard";
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

describe("GET /u/dashboard", () => {
  it("401 sin token de autenticación", async () => {
    const app = createApp();
    const res = await request(app).get("/u/dashboard");

    expect(res.status).toBe(401);
  });

  it("200 usuario sin URLs: summary a ceros, best_url null, arrays vacíos", async () => {
    const app = createApp();
    const token = await getAuthToken(app);

    const res = await request(app)
      .get("/u/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.summary.total_urls).toBe(0);
    expect(res.body.summary.total_clicks).toBe(0);
    expect(res.body.summary.avg_clicks_per_url).toBe(0);
    expect(res.body.best_url).toBeNull();
    expect(res.body.urls_created_by_day).toEqual([]);
    expect(res.body.clicks_by_day).toEqual([]);
    expect(res.body.period_days).toBe(30);
  });

  it("200 usuario con URLs pero sin clicks: total_clicks=0, clicks_by_day vacío", async () => {
    const app = createApp();
    const token = await getAuthToken(app);

    await request(app)
      .post("/u")
      .set("Authorization", `Bearer ${token}`)
      .send({ long_url: "https://ejemplo.com" });

    const res = await request(app)
      .get("/u/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.summary.total_urls).toBe(1);
    expect(res.body.summary.total_clicks).toBe(0);
    expect(res.body.clicks_by_day).toEqual([]);
    expect(res.body.urls_created_by_day).toHaveLength(1);
  });

  it("200 los clicks se registran en clicks_by_day", async () => {
    const app = createApp();
    const token = await getAuthToken(app);

    const createRes = await request(app)
      .post("/u")
      .set("Authorization", `Bearer ${token}`)
      .send({ long_url: "https://ejemplo.com" });

    const code = createRes.body.code as string;

    await request(app).get(`/u/${code}`).redirects(0);
    await request(app).get(`/u/${code}`).redirects(0);
    await request(app).get(`/u/${code}`).redirects(0);

    const res = await request(app)
      .get("/u/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.summary.total_clicks).toBe(3);
    expect(res.body.clicks_by_day).toHaveLength(1);
    expect(res.body.clicks_by_day[0].clicks).toBe(3);
  });

  it("200 best_url es la URL con más visitas", async () => {
    const app = createApp();
    const token = await getAuthToken(app);

    const res1 = await request(app)
      .post("/u")
      .set("Authorization", `Bearer ${token}`)
      .send({ long_url: "https://poco-visitada.com" });

    const res2 = await request(app)
      .post("/u")
      .set("Authorization", `Bearer ${token}`)
      .send({ long_url: "https://mas-visitada.com" });

    const popularCode = res2.body.code as string;

    // 1 click en la primera, 5 en la segunda
    await request(app).get(`/u/${res1.body.code}`).redirects(0);
    for (let i = 0; i < 5; i++) {
      await request(app).get(`/u/${popularCode}`).redirects(0);
    }

    const dashRes = await request(app)
      .get("/u/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(dashRes.status).toBe(200);
    expect(dashRes.body.best_url).not.toBeNull();
    expect(dashRes.body.best_url.code).toBe(popularCode);
    expect(dashRes.body.best_url.visits).toBe(5);
  });

  it("200 cada usuario ve solo sus propios datos", async () => {
    const app = createApp();
    const token1 = await getAuthToken(app, "user1@ejemplo.com");
    const token2 = await getAuthToken(app, "user2@ejemplo.com");

    // Usuario 1 crea 2 URLs
    await request(app)
      .post("/u")
      .set("Authorization", `Bearer ${token1}`)
      .send({ long_url: "https://user1-a.com" });
    await request(app)
      .post("/u")
      .set("Authorization", `Bearer ${token1}`)
      .send({ long_url: "https://user1-b.com" });

    // Usuario 2 crea 1 URL
    await request(app)
      .post("/u")
      .set("Authorization", `Bearer ${token2}`)
      .send({ long_url: "https://user2-a.com" });

    const dash1 = await request(app)
      .get("/u/dashboard")
      .set("Authorization", `Bearer ${token1}`);

    const dash2 = await request(app)
      .get("/u/dashboard")
      .set("Authorization", `Bearer ${token2}`);

    expect(dash1.body.summary.total_urls).toBe(2);
    expect(dash2.body.summary.total_urls).toBe(1);
  });
});
