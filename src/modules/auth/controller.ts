import type { Request, Response } from "express";
import { register, login, AuthError } from "./service.js";
import type { RegisterInput, LoginInput } from "./types.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function validateRegisterBody(
  body: Partial<RegisterInput>
): string | null {
  if (!body.email || !body.password || !body.name) {
    return "email, password y name son requeridos";
  }
  if (!EMAIL_REGEX.test(body.email)) {
    return "El formato del email no es válido";
  }
  if (body.password.length < MIN_PASSWORD_LENGTH) {
    return `El password debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  if (body.name.trim().length === 0) {
    return "El nombre no puede estar vacío";
  }
  return null;
}

function validateLoginBody(body: Partial<LoginInput>): string | null {
  if (!body.email || !body.password) {
    return "email y password son requeridos";
  }
  if (!EMAIL_REGEX.test(body.email)) {
    return "El formato del email no es válido";
  }
  return null;
}

export async function registerHandler(req: Request, res: Response): Promise<void> {
  const validationError = validateRegisterBody(req.body as Partial<RegisterInput>);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    const { email, password, name } = req.body as RegisterInput;
    const result = await register({ email, password, name });
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const validationError = validateLoginBody(req.body as Partial<LoginInput>);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    const { email, password } = req.body as LoginInput;
    const result = await login({ email, password });
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Error interno del servidor" });
  }
}
