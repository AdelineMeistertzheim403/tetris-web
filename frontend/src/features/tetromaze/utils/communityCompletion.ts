import { createCommunityCompletionTracker } from "../../app/logic/communityCompletionTracker";
import type { TetromazeLevel } from "../types";

const STORAGE_KEY = "tetromaze-community-completion-v1";

function canonicalTetromazeLevel(level: TetromazeLevel) {
  return {
    id: level.id,
    name: level.name ?? "",
    grid: [...level.grid],
    playerSpawn: {
      x: Math.round(level.playerSpawn.x),
      y: Math.round(level.playerSpawn.y),
    },
    botSpawns: [...level.botSpawns]
      .map((spawn) => ({
        x: Math.round(spawn.x),
        y: Math.round(spawn.y),
      }))
      .sort((a, b) => a.y - b.y || a.x - b.x),
    botKinds: [...(level.botKinds ?? ["rookie", "balanced", "apex"])],
    botHome: level.botHome
      ? {
          x: Math.round(level.botHome.x),
          y: Math.round(level.botHome.y),
          width: Math.round(level.botHome.width),
          height: Math.round(level.botHome.height),
          gate: level.botHome.gate
            ? {
                x: Math.round(level.botHome.gate.x),
                y: Math.round(level.botHome.gate.y),
                width: Math.round(level.botHome.gate.width),
              }
            : null,
        }
      : null,
    powerOrbs: [...level.powerOrbs]
      .map((orb) => ({
        x: Math.round(orb.x),
        y: Math.round(orb.y),
        type: orb.type,
      }))
      .sort((a, b) => a.y - b.y || a.x - b.x || a.type.localeCompare(b.type, "fr")),
    loopPairs: [...(level.loopPairs ?? [])]
      .map((pair) => ({
        a: {
          x: Math.round(pair.a.x),
          y: Math.round(pair.a.y),
        },
        b: {
          x: Math.round(pair.b.x),
          y: Math.round(pair.b.y),
        },
      }))
      .sort((a, b) => a.a.y - b.a.y || a.a.x - b.a.x || a.b.y - b.b.y || a.b.x - b.b.x),
  };
}

const completionTracker = createCommunityCompletionTracker<TetromazeLevel>({
  storageKey: STORAGE_KEY,
  prefix: "tmz",
  getLevelId: (level) => level.id,
  canonicalize: canonicalTetromazeLevel,
});

export const fingerprintTetromazeLevel = completionTracker.fingerprint;
export const markTetromazeCustomLevelCompleted = completionTracker.markCompleted;
export const getTetromazeCustomLevelCompletion = completionTracker.getCompletion;
export const hasCompletedCurrentTetromazeLevel = completionTracker.hasCompletedCurrent;
