import { Router } from "express";
import { register, login, getMe } from "../controllers/auth.controller";
import { verifyToken} from "../middleware/auth.middleware";

const router = Router();

// ✅ Routes principales
router.post("/register", register);
router.post("/login", login);
router.get("/me", verifyToken, getMe);

// ✅ Déconnexion (facultative)
router.post("/logout", (req, res) => {
  res.json({ message: "Déconnexion réussie" });
});

export default router;
