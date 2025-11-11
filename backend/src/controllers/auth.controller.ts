import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../prisma/client";

const JWT_SECRET = process.env.JWT_SECRET as string;

export const register = async (req: Request, res: Response) => {
  try {
    const { pseudo, email, password } = req.body;

    if (!pseudo || !email || !password) {
      return res.status(400).json({ error: "Champs manquants" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { pseudo, email, password: hashedPassword },
    });

    res.status(201).json({ message: "Utilisateur créé", user });
  } catch (err: any) {
    console.error("❌ Erreur Prisma:", err);
    res.status(400).json({ error: "Erreur lors de l'inscription" , details: err.message});
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ error: "Utilisateur non trouvé" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: "Mot de passe incorrect" });

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ token, user });
};

export const getMe = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  res.json(user);
};
