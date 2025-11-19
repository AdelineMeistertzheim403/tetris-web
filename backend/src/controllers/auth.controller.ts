import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../prisma/client";
import { registerSchema, loginSchema } from "../utils/validation";
import { AuthRequest } from "../middleware/auth.middleware";

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = "24h";

export const register = async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Données invalides",
        details: parsed.error.flatten(),
      });
    }

    const { pseudo, email, password } = parsed.data;

    // Vérifier si l'email existe déjà
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email déjà utilisé" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { pseudo, email, password: hashedPassword },
    });

    // Générer un token dès l'inscription
    const token = jwt.sign(
      { id: user.id, email: user.email, pseudo: user.pseudo },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const { password: _ignored, ...safeUser } = user;

    res.status(201).json({
      message: "Utilisateur créé",
      token,
      user: safeUser,
    });
  } catch (err: any) {
    console.error("❌ Erreur register:", err);
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
        error: "Données invalides",
        details: parsed.error.flatten(),
      });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "Utilisateur non trouvé" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: "Mot de passe incorrect" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, pseudo: user.pseudo },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const { password: _ignored, ...safeUser } = user;

    res.json({ token, user: safeUser });
  } catch (err: any) {
    console.error("❌ Erreur login:", err);
    res.status(500).json({ error: "Erreur lors de la connexion" });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, pseudo: true, email: true, createdAt: true }, // pas de password
    });

    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    res.json(user);
  } catch (err: any) {
    console.error("❌ Erreur getMe:", err);
    res.status(500).json({ error: "Erreur lors de la récupération du profil" });
  }
};
