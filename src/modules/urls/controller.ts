import type { Request, Response } from "express";
import {
  createURL,
  getURLByCode,
  getAllURLs,
  getURLByCodeAndUserId,
  deleteURL,
  findURLByCode,
  getUserDashboard,
} from "./repository.js";
import type { CreateURLRequest, URLResponse } from "./types.js";

function normalizeURL(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function createShortURL(req: Request, res: Response): void {
  try {
    const { long_url } = req.body as CreateURLRequest;

    if (!long_url) {
      res.status(400).json({ error: "long_url es requerido" });
      return;
    }

    const normalized = normalizeURL(long_url);

    if (!isValidURL(normalized)) {
      res.status(400).json({ error: "La URL proporcionada no es válida" });
      return;
    }

    // req.user garantizado por el middleware authenticate
    const url = createURL(normalized, req.user!.id);
    const response: URLResponse = {
      code: url.code,
      long_url: url.long_url,
      created_at: url.created_at,
      visits: url.visits,
      is_owner: true,
    };

    res.status(201).json(response);
  } catch {
    res.status(500).json({ error: "Error al crear la URL corta" });
  }
}

export function redirectToLongURL(req: Request, res: Response): void {
  try {
    const { code } = req.params;
    const url = getURLByCode(code);

    if (!url) {
      res.status(404).json({ error: "Código no encontrado" });
      return;
    }

    res.redirect(url.long_url);
  } catch {
    res.status(500).json({ error: "Error al redirigir" });
  }
}

export function listAllURLs(req: Request, res: Response): void {
  try {
    const urls = getAllURLs();
    const userId = req.user?.id ?? null;

    const response: URLResponse[] = urls.map((url) => ({
      code: url.code,
      long_url: url.long_url,
      created_at: url.created_at,
      visits: url.visits,
      is_owner: userId !== null && url.user_id === userId,
    }));

    res.status(200).json(response);
  } catch {
    res.status(500).json({ error: "Error al listar las URLs" });
  }
}

export function getDashboard(req: Request, res: Response): void {
  try {
    const data = getUserDashboard(req.user!.id, 30);
    res.status(200).json(data);
  } catch {
    res.status(500).json({ error: "Error al obtener el dashboard" });
  }
}

export function deleteShortURL(req: Request, res: Response): void {
  try {
    const { code } = req.params;

    const exists = findURLByCode(code);
    if (!exists) {
      res.status(404).json({ error: "Código no encontrado" });
      return;
    }

    const owned = getURLByCodeAndUserId(code, req.user!.id);
    if (!owned) {
      res.status(403).json({ error: "No tienes permiso para borrar esta URL" });
      return;
    }

    deleteURL(code);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Error al borrar la URL" });
  }
}
