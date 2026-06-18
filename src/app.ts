import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { createURLsRouter } from "./modules/urls/index.js";
import { createAuthRouter } from "./modules/auth/index.js";

export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/u", createURLsRouter());
  app.use("/auth", createAuthRouter());

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message });
  });

  return app;
}
