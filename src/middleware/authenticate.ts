import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getConfig } from "../config/env.js";

export interface AuthenticatedUser {
  id: number;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token de autenticación requerido" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, getConfig().jwtSecret) as jwt.JwtPayload;
    req.user = {
      id: Number(payload.sub),
      email: payload.email as string,
    };
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}

// Igual que authenticate pero nunca rechaza: si no hay token (o es inválido)
// simplemente deja req.user como undefined y continúa. Útil para endpoints
// públicos que quieren enriquecer la respuesta cuando hay sesión activa.
export function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, getConfig().jwtSecret) as jwt.JwtPayload;
      req.user = {
        id: Number(payload.sub),
        email: payload.email as string,
      };
    } catch {
      // Token inválido o expirado → continúa como anónimo, sin rechazar
    }
  }
  next();
}
