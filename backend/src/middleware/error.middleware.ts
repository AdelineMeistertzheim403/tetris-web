import { Request, Response, NextFunction } from "express";
import { logger } from "../logger";

/**
 * Middleware d'erreur terminal.
 * Masque les détails internes pour les erreurs 5xx.
 */
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = typeof err?.status === "number" ? err.status : 500;
  const message =
    status >= 500 ? "Erreur serveur" : err?.message ?? "Erreur inattendue";
  logger.error({ err, status }, "Unhandled error");
  res.status(status).json({ error: message });
}
