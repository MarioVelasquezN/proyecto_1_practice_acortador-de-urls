import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../../middleware/authenticate.js";
import {
  createShortURL,
  redirectToLongURL,
  listAllURLs,
  deleteShortURL,
  getDashboard,
} from "./controller.js";

export function createURLsRouter(): Router {
  const router = Router();

  // Público con auth opcional: si hay token válido, is_owner se calcula por URL
  router.get("/", optionalAuthenticate, listAllURLs);

  // Rutas protegidas — /dashboard debe ir antes de /:code para evitar match como código
  router.get("/dashboard", authenticate, getDashboard);
  router.get("/:code", redirectToLongURL);

  router.post("/", authenticate, createShortURL);
  router.delete("/:code", authenticate, deleteShortURL);

  return router;
}
