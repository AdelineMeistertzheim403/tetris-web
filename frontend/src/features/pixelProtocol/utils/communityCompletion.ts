import { createCommunityCompletionTracker } from "../../app/logic/communityCompletionTracker";
import type { LevelDef } from "../types";

const STORAGE_KEY = "pixel-protocol-community-completion-v1";

function canonicalGameplayLevel(level: LevelDef) {
  return {
    id: level.id,
    world: level.world,
    worldWidth: Math.round(level.worldWidth),
    worldHeight:
      typeof level.worldHeight === "number" ? Math.round(level.worldHeight) : null,
    worldTopPadding:
      typeof level.worldTopPadding === "number" ? Math.round(level.worldTopPadding) : 0,
    requiredOrbs: Math.round(level.requiredOrbs),
    spawn: {
      x: Math.round(level.spawn.x),
      y: Math.round(level.spawn.y),
    },
    portal: {
      x: Math.round(level.portal.x),
      y: Math.round(level.portal.y),
    },
    platforms: [...level.platforms]
      .map((platform) => ({
        id: platform.id,
        tetromino: platform.tetromino,
        x: Math.round(platform.x),
        y: Math.round(platform.y),
        rotation: platform.rotation ?? 0,
        type: platform.type,
        rotateEveryMs:
          typeof platform.rotateEveryMs === "number"
            ? Math.round(platform.rotateEveryMs)
            : null,
        moveAxis: platform.moveAxis ?? null,
        movePattern: platform.movePattern ?? null,
        moveRangeTiles:
          typeof platform.moveRangeTiles === "number"
            ? Math.round(platform.moveRangeTiles)
            : null,
        moveSpeed:
          typeof platform.moveSpeed === "number"
            ? Math.round(platform.moveSpeed)
            : null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id, "fr")),
    checkpoints: [...level.checkpoints]
      .map((checkpoint) => ({
        id: checkpoint.id,
        x: Math.round(checkpoint.x),
        y: Math.round(checkpoint.y),
        spawnX: Math.round(checkpoint.spawnX),
        spawnY: Math.round(checkpoint.spawnY),
      }))
      .sort((a, b) => a.id.localeCompare(b.id, "fr")),
    orbs: [...level.orbs]
      .map((orb) => ({
        id: orb.id,
        x: Math.round(orb.x),
        y: Math.round(orb.y),
        affinity: orb.affinity ?? "standard",
        grantsSkill: orb.grantsSkill ?? null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id, "fr")),
    enemies: [...level.enemies]
      .map((enemy) => ({
        id: enemy.id,
        kind: enemy.kind,
        x: Math.round(enemy.x),
        y: Math.round(enemy.y),
        vx: Math.round(enemy.vx),
        minX: Math.round(enemy.minX),
        maxX: Math.round(enemy.maxX),
      }))
      .sort((a, b) => a.id.localeCompare(b.id, "fr")),
  };
}

const completionTracker = createCommunityCompletionTracker<LevelDef>({
  storageKey: STORAGE_KEY,
  prefix: "pp",
  getLevelId: (level) => level.id,
  canonicalize: canonicalGameplayLevel,
});

export const fingerprintPixelProtocolLevel = completionTracker.fingerprint;
export const markPixelProtocolCustomLevelCompleted = completionTracker.markCompleted;
export const getPixelProtocolCustomLevelCompletion = completionTracker.getCompletion;
export const hasCompletedCurrentPixelProtocolLevel = completionTracker.hasCompletedCurrent;
