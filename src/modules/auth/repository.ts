import { getDatabase } from "../../db/database.js";
import type { User } from "./types.js";

export function findUserByEmail(email: string): User | undefined {
  const db = getDatabase();
  return db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email) as User | undefined;
}

export function insertUser(
  email: string,
  passwordHash: string,
  name: string
): User {
  const db = getDatabase();
  const result = db
    .prepare("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)")
    .run(email, passwordHash, name);

  return db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(result.lastInsertRowid) as User;
}
