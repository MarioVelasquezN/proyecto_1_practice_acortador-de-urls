import { getDatabase } from "../../db/database.js";
import type { URL, DashboardResponse, DailyCount, DailyClicks } from "./types.js";

function generateRandomCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function createURL(longUrl: string, userId: number): URL {
  const db = getDatabase();
  let code = generateRandomCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    try {
      db.prepare(
        "INSERT INTO urls (code, long_url, user_id) VALUES (?, ?, ?)"
      ).run(code, longUrl, userId);
      break;
    } catch {
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error("No se pudo generar un código único");
      }
      code = generateRandomCode();
    }
  }

  return db.prepare("SELECT * FROM urls WHERE code = ?").get(code) as URL;
}

export function getURLByCode(code: string): URL | undefined {
  const db = getDatabase();
  const url = db
    .prepare("SELECT * FROM urls WHERE code = ?")
    .get(code) as URL | undefined;

  if (url) {
    db.transaction(() => {
      db.prepare("UPDATE urls SET visits = visits + 1 WHERE code = ?").run(code);
      db.prepare("INSERT INTO click_events (url_id) VALUES (?)").run(url.id);
    })();
  }

  return url;
}

export function getAllURLs(): URL[] {
  const db = getDatabase();
  return db
    .prepare("SELECT * FROM urls ORDER BY created_at DESC")
    .all() as URL[];
}

export function findURLByCode(code: string): URL | undefined {
  const db = getDatabase();
  return db
    .prepare("SELECT * FROM urls WHERE code = ?")
    .get(code) as URL | undefined;
}

export function getURLByCodeAndUserId(
  code: string,
  userId: number
): URL | undefined {
  const db = getDatabase();
  return db
    .prepare("SELECT * FROM urls WHERE code = ? AND user_id = ?")
    .get(code, userId) as URL | undefined;
}

export function deleteURL(code: string): void {
  const db = getDatabase();
  db.prepare("DELETE FROM urls WHERE code = ?").run(code);
}

export function getUserDashboard(userId: number, periodDays: number): DashboardResponse {
  const db = getDatabase();

  const summary = db.prepare(`
    SELECT
      COUNT(*)                 AS total_urls,
      COALESCE(SUM(visits), 0) AS total_clicks,
      COALESCE(AVG(visits), 0) AS avg_clicks_per_url
    FROM urls
    WHERE user_id = ?
  `).get(userId) as { total_urls: number; total_clicks: number; avg_clicks_per_url: number };

  const bestRow = db.prepare(`
    SELECT code, long_url, visits, created_at
    FROM urls
    WHERE user_id = ?
    ORDER BY visits DESC
    LIMIT 1
  `).get(userId) as { code: string; long_url: string; visits: number; created_at: string } | undefined;

  const best_url = bestRow
    ? { code: bestRow.code, long_url: bestRow.long_url, visits: bestRow.visits, created_at: bestRow.created_at }
    : null;

  const urls_created_by_day = db.prepare(`
    SELECT DATE(created_at) AS date, COUNT(*) AS count
    FROM urls
    WHERE user_id = ?
      AND created_at >= DATE('now', '-' || ? || ' days')
    GROUP BY date
    ORDER BY date DESC
  `).all(userId, periodDays) as DailyCount[];

  const clicks_by_day = db.prepare(`
    SELECT DATE(ce.clicked_at) AS date, COUNT(*) AS clicks
    FROM click_events ce
    JOIN urls u ON u.id = ce.url_id
    WHERE u.user_id = ?
      AND ce.clicked_at >= DATE('now', '-' || ? || ' days')
    GROUP BY date
    ORDER BY date DESC
  `).all(userId, periodDays) as DailyClicks[];

  return {
    summary: {
      total_urls: summary.total_urls,
      total_clicks: summary.total_clicks,
      avg_clicks_per_url: Math.round(summary.avg_clicks_per_url * 10) / 10,
    },
    best_url,
    urls_created_by_day,
    clicks_by_day,
    period_days: periodDays,
  };
}
