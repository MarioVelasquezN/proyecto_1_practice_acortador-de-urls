import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  createShortURL,
  redirectToLongURL,
  listAllURLs,
  deleteShortURL,
  getDashboard,
} from "./controller.js";

export function createURLsRouter(): Router {
  const router = Router();

  // Rutas públicas
  router.get("/", listAllURLs);

  // Rutas protegidas — /dashboard debe ir antes de /:code para evitar match como código
  router.get("/dashboard", authenticate, getDashboard);
  router.get("/:code", redirectToLongURL);

  router.post("/", authenticate, createShortURL);
  router.delete("/:code", authenticate, deleteShortURL);

  return router;
}
