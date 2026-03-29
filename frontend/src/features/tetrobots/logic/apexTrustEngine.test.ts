import { describe, expect, it } from "vitest";
import {
  getApexChallengeProgress,
  getApexChallengeActionLabel,
  getApexChallengeActionTarget,
  getApexRequirement,
  getApexTrackedModeSessions,
  getApexTrackedModeWins,
} from "./apexTrustEngine";
import type {
  PlayerBehaviorMode,
  PlayerLongTermMemory,
  TetrobotChallengeState,
} from "../../achievements/types/tetrobots";

function createBehaviorByMode() {
  return {
    CLASSIQUE: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
    SPRINT: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
    VERSUS: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
    BRICKFALL_SOLO: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
    ROGUELIKE: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
    ROGUELIKE_VERSUS: {
      sessions: 0,
      wins: 0,
      losses: 0,
      totalDurationMs: 0,
      lastPlayedAt: null,
    },
    PUZZLE: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
    TETROMAZE: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
    PIXEL_INVASION: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
    PIXEL_PROTOCOL: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
  } as Record<
    PlayerBehaviorMode,
    { sessions: number; wins: number; losses: number; totalDurationMs: number; lastPlayedAt: number | null }
  >;
}

describe("apexTrustEngine", () => {
  it("prioritizes the active Apex challenge description over generic refusal text", () => {
    const memory = {
      avoidedModes: { ROGUELIKE: 8 },
      rageQuitCount: 4,
    } as unknown as PlayerLongTermMemory;
    const challenge = {
      bot: "apex",
      status: "offered",
      description: "Joue 3 sessions utiles sur VERSUS sans rage quit pour rouvrir completement le canal.",
      targetMode: "VERSUS",
    } as unknown as TetrobotChallengeState;

    expect(getApexRequirement(memory, "refusing", challenge)).toBe(challenge.description);
  });

  it("builds the right CTA for an offered Apex challenge", () => {
    const challenge = {
      bot: "apex",
      status: "offered",
      targetMode: "ROGUELIKE",
    } as unknown as TetrobotChallengeState;

    expect(getApexChallengeActionLabel(challenge)).toBe("Accepter et jouer Roguelike");
    expect(getApexChallengeActionTarget(challenge)).toBe("/roguelike");
  });

  it("uses a duel-choice CTA for Versus challenges", () => {
    const challenge = {
      bot: "apex",
      status: "offered",
      targetMode: "VERSUS",
    } as unknown as TetrobotChallengeState;

    expect(getApexChallengeActionLabel(challenge)).toBe("Accepter et choisir le duel Versus");
    expect(getApexChallengeActionTarget(challenge)).toBe("/versus");
  });

  it("derives Apex Versus progress from legacy session counters when behavior stats lag behind", () => {
    const challenge = {
      id: "apex-reconciliation-versus",
      bot: "apex",
      kind: "apex_reconciliation",
      status: "active",
      title: "Defi d'Apex",
      description: "Joue 3 sessions utiles sur VERSUS sans rage quit pour rouvrir completement le canal.",
      targetMode: "VERSUS",
      targetCount: 3,
      progress: 1,
      rewardAffinity: 24,
      rewardXp: 30,
      startSessions: 1,
      startRageQuitCount: 0,
      createdAt: 10,
      acceptedAt: 20,
      resolvedAt: null,
    } as const satisfies TetrobotChallengeState;
    const playerBehaviorByMode = createBehaviorByMode();
    playerBehaviorByMode.VERSUS = {
      sessions: 1,
      wins: 0,
      losses: 0,
      totalDurationMs: 0,
      lastPlayedAt: null,
    };
    const stats = {
      playerBehaviorByMode,
      versusMatches: 4,
      versusWins: 1,
      roguelikeVersusMatches: 0,
      roguelikeVersusWins: 0,
    };

    expect(getApexTrackedModeSessions("VERSUS", stats)).toBe(4);
    expect(getApexTrackedModeWins("VERSUS", stats)).toBe(1);
    expect(getApexChallengeProgress(challenge, stats)).toBe(3);
  });
});
