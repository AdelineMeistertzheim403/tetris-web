import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../prisma/client";
import { registerSchema, loginSchema } from "../utils/validation";
import { AuthRequest } from "../middleware/auth.middleware";
import { env } from "../config";
import { logger } from "../logger";

const JWT_SECRET = env.jwtSecret;
const JWT_EXPIRES_IN = "24h";

export const register = async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Donnees invalides",
        details: parsed.error.flatten(),
      });
    }

    const { pseudo, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email deja utilise" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { pseudo, email, password: hashedPassword },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, pseudo: user.pseudo },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const { password: _ignored, ...safeUser } = user;

    res.status(201).json({
      message: "Utilisateur cree",
      token,
      user: safeUser,
    });
  } catch (err: any) {
    logger.error({ err }, "Erreur register");
    res
      .status(500)
      .json({ error: "Erreur lors de l'inscription", details: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Donnees invalides",
        details: parsed.error.flatten(),
      });
    }

    const { email, password } = parsed.data;
    const invalidMessage = "Identifiants invalides";

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: invalidMessage });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: invalidMessage });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, pseudo: user.pseudo },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const { password: _ignored, ...safeUser } = user;

    res.json({ token, user: safeUser });
  } catch (err: any) {
    logger.error({ err }, "Erreur login");
    res.status(500).json({ error: "Erreur lors de la connexion" });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, pseudo: true, email: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    res.json(user);
  } catch (err: any) {
    logger.error({ err }, "Erreur getMe");
    res.status(500).json({ error: "Erreur lors de la recuperation du profil" });
  }
};
