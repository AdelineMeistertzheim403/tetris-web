import { createCommunityCompletionTracker } from "../../app/logic/communityCompletionTracker";
import type { BrickfallLevel } from "../types/levels";

const STORAGE_KEY = "brickfall-solo-community-completion-v1";

function canonicalBrickfallLevel(level: BrickfallLevel) {
  return {
    id: level.id,
    name: level.name,
    width: Math.round(level.width),
    height: Math.round(level.height),
    boss: Boolean(level.boss),
    bricks: [...level.bricks]
      .map((brick) => ({
        x: Math.round(brick.x),
        y: Math.round(brick.y),
        type: brick.type,
        hp: typeof brick.hp === "number" ? Math.round(brick.hp) : null,
        drop: brick.drop ?? null,
      }))
      .sort((a, b) => a.y - b.y || a.x - b.x || a.type.localeCompare(b.type, "fr")),
  };
}

const completionTracker = createCommunityCompletionTracker<BrickfallLevel>({
  storageKey: STORAGE_KEY,
  prefix: "bf",
  getLevelId: (level) => level.id,
  canonicalize: canonicalBrickfallLevel,
});

export const fingerprintBrickfallSoloLevel = completionTracker.fingerprint;
export const markBrickfallSoloCustomLevelCompleted = completionTracker.markCompleted;
export const getBrickfallSoloCustomLevelCompletion = completionTracker.getCompletion;
export const hasCompletedCurrentBrickfallSoloLevel = completionTracker.hasCompletedCurrent;
