import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware";
import {
  getMyRoguelikeRuns,
  startRoguelikeRun,
  getCurrentRoguelikeRun,
  checkpointRoguelikeRun,
  endRoguelikeRun,
  getRoguelikeLeaderboard,
} from "../controllers/roguelike.controller";

// Endpoints Roguelike (run state + leaderboard).
const router = Router();

router.post("/run/start", verifyToken, startRoguelikeRun);
router.get("/run/current", verifyToken, getCurrentRoguelikeRun);
router.post("/run/:id/checkpoint", verifyToken, checkpointRoguelikeRun);
router.post("/run/:id/end", verifyToken, endRoguelikeRun);
router.get("/leaderboard", getRoguelikeLeaderboard);
router.get("/runs/me", verifyToken, getMyRoguelikeRuns);


export default router;
