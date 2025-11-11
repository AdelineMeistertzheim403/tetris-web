import { Router } from "express";
import { register, login, getMe } from "../controllers/auth.controller";
import { AuthRequest, verifyToken } from "../middleware/auth.middleware";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../prisma/client";


const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

router.post("/register", async (req, res) => {
  const { email, password, pseudo } = req.body;

  if (!email || !password || !pseudo) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Cet email est déjà utilisé" });
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hash, pseudo },
  });

  res.status(201).json({ message: "Utilisateur créé", user });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Identifiants invalides" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Identifiants invalides" });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  // ✅ renvoyer aussi le user
  res.json({
    message: "Connexion réussie",
    user: {
      id: user.id,
      email: user.email,
      pseudo: user.pseudo,
      createdAt: user.createdAt,
    },
    token,
  });
});

router.get("/me", verifyToken, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, pseudo: true, createdAt: true },
  });
  res.json({ user });
});

router.post("/logout", (req, res) => {
  res.json({ message: "Déconnexion réussie" });
});

export default router;
