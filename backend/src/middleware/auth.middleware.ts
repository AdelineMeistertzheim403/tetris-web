import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config";
import { logger } from "../logger";
import { AUTH_COOKIE_NAME } from "../utils/authCookie";

const JWT_SECRET = env.jwtSecret;

export interface JwtUserPayload {
  id: number;
  email?: string;
  pseudo?: string;
}

export interface AuthRequest extends Request {
  user?: JwtUserPayload;
}

/**
 * Vérifie le JWT depuis `Authorization: Bearer` ou cookie HTTP-only.
 * En cas de succès, attache `req.user` pour les handlers protégés.
 */
export const verifyToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME] ?? null;
  const token = headerToken ?? cookieToken;
  if (!token) {
    return res.status(401).json({ error: "Token manquant ou invalide" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUserPayload;
    if (!decoded?.id) {
      return res
        .status(401)
        .json({ error: "Token invalide (payload incomplet)" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    logger.warn({ err }, "Erreur verifyToken");
    return res.status(403).json({ error: "Token invalide ou expire" });
  }
};
