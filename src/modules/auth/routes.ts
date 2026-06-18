import { Router } from "express";
import { registerHandler, loginHandler } from "./controller.js";

export function createAuthRouter(): Router {
  const router = Router();

  router.post("/register", registerHandler);
  router.post("/login", loginHandler);

  return router;
}
