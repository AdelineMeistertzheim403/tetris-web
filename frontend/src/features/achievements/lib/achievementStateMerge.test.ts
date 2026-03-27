import { describe, expect, it } from "vitest";
import {
  mergeModeBehaviorStats,
  mergeTetrobotChallengeState,
} from "./achievementStateMerge";
import type {
  ModeBehaviorStats,
  PlayerBehaviorMode,
  TetrobotChallengeState,
} from "../types/tetrobots";

const PLAYER_BEHAVIOR_MODES: PlayerBehaviorMode[] = [
  "CLASSIQUE",
  "SPRINT",
  "VERSUS",
  "BRICKFALL_SOLO",
  "ROGUELIKE",
  "ROGUELIKE_VERSUS",
  "PUZZLE",
  "TETROMAZE",
  "PIXEL_INVASION",
  "PIXEL_PROTOCOL",
];

function createBehaviorByMode() {
  return Object.fromEntries(
    PLAYER_BEHAVIOR_MODES.map((mode) => [
      mode,
      {
        sessions: 0,
        wins: 0,
        losses: 0,
        totalDurationMs: 0,
        lastPlayedAt: null,
      } satisfies ModeBehaviorStats,
    ])
  ) as Record<PlayerBehaviorMode, ModeBehaviorStats>;
}

describe("achievementStateMerge", () => {
  it("keeps the highest local Versus progression when remote stats are stale", () => {
    const local = createBehaviorByMode();
    const remote = createBehaviorByMode();

    local.VERSUS = {
      sessions: 4,
      wins: 2,
      losses: 2,
      totalDurationMs: 120_000,
      lastPlayedAt: 400,
    };
    remote.VERSUS = {
      sessions: 1,
      wins: 1,
      losses: 0,
      totalDurationMs: 30_000,
      lastPlayedAt: 100,
    };

    const merged = mergeModeBehaviorStats(local, remote);

    expect(merged.VERSUS.sessions).toBe(4);
    expect(merged.VERSUS.wins).toBe(2);
    expect(merged.VERSUS.losses).toBe(2);
    expect(merged.VERSUS.totalDurationMs).toBe(120_000);
    expect(merged.VERSUS.lastPlayedAt).toBe(400);
  });

  it("keeps the furthest challenge progress for the same Apex challenge id", () => {
    const local: TetrobotChallengeState = {
      id: "apex-reconciliation-versus",
      bot: "apex",
      kind: "apex_reconciliation",
      status: "active",
      title: "Defi d'Apex",
      description: "Joue 3 sessions utiles sur VERSUS sans rage quit.",
      targetMode: "VERSUS",
      targetCount: 3,
      progress: 2,
      rewardAffinity: 41,
      rewardXp: 30,
      startSessions: 1,
      startRageQuitCount: 0,
      createdAt: 10,
      acceptedAt: 20,
      resolvedAt: null,
    };
    const remote: TetrobotChallengeState = {
      ...local,
      progress: 1,
      rewardAffinity: 24,
      acceptedAt: null,
    };

    const merged = mergeTetrobotChallengeState(local, remote);

    expect(merged?.progress).toBe(2);
    expect(merged?.rewardAffinity).toBe(41);
    expect(merged?.acceptedAt).toBe(20);
    expect(merged?.status).toBe("active");
  });
});
