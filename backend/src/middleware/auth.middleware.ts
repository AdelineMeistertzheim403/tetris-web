import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config";
import { logger } from "../logger";

const JWT_SECRET = env.jwtSecret;

export interface JwtUserPayload {
  id: number;
  email?: string;
  pseudo?: string;
}

export interface AuthRequest extends Request {
  user?: JwtUserPayload;
}

export const verifyToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant ou invalide" });
  }
  const token = authHeader.split(" ")[1];

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
