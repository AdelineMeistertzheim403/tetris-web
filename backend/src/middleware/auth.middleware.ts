import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  throw new Error("❌ JWT_SECRET manquant dans les variables d'environnement");
}

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
  const token =  authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUserPayload;
    if (!decoded?.id) {
      return res.status(401).json({ error: "Token invalide (payload incomplet)" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ Erreur verifyToken:", err);
    return res.status(403).json({ error: "Token invalide ou expiré" });
  }
};
