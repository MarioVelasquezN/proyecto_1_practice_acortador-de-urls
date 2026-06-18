import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getConfig } from "../../config/env.js";
import { findUserByEmail, insertUser } from "./repository.js";
import type { RegisterInput, LoginInput, AuthResult } from "./types.js";

const SALT_ROUNDS = 10;
const JWT_EXPIRY = "24h";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function signToken(userId: number, email: string): string {
  return jwt.sign(
    { sub: userId, email },
    getConfig().jwtSecret,
    { expiresIn: JWT_EXPIRY }
  );
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const email = input.email.toLowerCase();

  const existing = findUserByEmail(email);
  if (existing) {
    throw new AuthError("El email ya está registrado", 409);
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = insertUser(email, passwordHash, input.name);
  const token = signToken(user.id, user.email);

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const email = input.email.toLowerCase();

  const user = findUserByEmail(email);
  if (!user) {
    throw new AuthError("Credenciales inválidas", 401);
  }

  const passwordValid = await bcrypt.compare(input.password, user.password_hash);
  if (!passwordValid) {
    throw new AuthError("Credenciales inválidas", 401);
  }

  const token = signToken(user.id, user.email);

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name },
  };
}
