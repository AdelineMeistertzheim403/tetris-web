import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, getMe, getSettings, saveSettings } from "../controllers/auth.controller";
import { verifyToken } from "../middleware/auth.middleware";
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from "../utils/authCookie";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives, veuillez patienter quelques minutes." },
});

// Routes principales
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/me", verifyToken, getMe);
router.get("/settings", verifyToken, getSettings);
router.put("/settings", verifyToken, saveSettings);

// Deconnexion (facultative)
router.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions());
  res.json({ message: "Deconnexion reussie" });
});

export default router;
