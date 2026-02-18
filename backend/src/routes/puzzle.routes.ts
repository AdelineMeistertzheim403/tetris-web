import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware";
import {
  getPuzzle,
  listPuzzles,
  listMyPuzzleCompletions,
  submitPuzzleAttempt,
  submitPuzzleSolution,
} from "../controllers/puzzle.controller";

// Routes publiques/privées du mode Puzzle.
const router = Router();

router.get("/", listPuzzles);
router.get("/me/completions", verifyToken, listMyPuzzleCompletions);
router.get("/:id", getPuzzle);
router.post("/:id/attempt", verifyToken, submitPuzzleAttempt);
router.post("/:id/solution", verifyToken, submitPuzzleSolution);

export default router;
