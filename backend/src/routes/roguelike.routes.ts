import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware";
import {
  startRoguelikeRun,
  getCurrentRoguelikeRun,
  checkpointRoguelikeRun,
  endRoguelikeRun,
  getRoguelikeLeaderboard,
} from "../controllers/roguelike.controller";

const router = Router();

router.post("/run/start", verifyToken, startRoguelikeRun);
router.get("/run/current", verifyToken, getCurrentRoguelikeRun);
router.post("/run/:id/checkpoint", verifyToken, checkpointRoguelikeRun);
router.post("/run/:id/end", verifyToken, endRoguelikeRun);
router.get("/leaderboard", getRoguelikeLeaderboard);


export default router;
