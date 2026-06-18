export function getConfig() {
  return {
    port: Number(process.env.PORT ?? 3000),
    dbPath: process.env.DB_PATH ?? "data/snap.db",
    jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
  };
}

export const config = getConfig();
