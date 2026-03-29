import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AchievementStats } from "../../achievements/types/achievementStats";
import TetrobotRelationsPanel from "./TetrobotRelationsPanel";

const { navigateMock, useAchievementsMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useAchievementsMock: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../../achievements/hooks/useAchievements", () => ({
  useAchievements: () => useAchievementsMock(),
}));

function createBehaviorByMode() {
  return {
    CLASSIQUE: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
    SPRINT: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
    VERSUS: { sessions: 1, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
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
  };
}

function createModeProfiles() {
  const profile = {
    recentRuns: 0,
    recentWinRate: 0,
    recentMistakeRate: 0,
    averageDurationMs: 0,
    resilienceScore: 0,
    pressureIndex: 0,
    averagePressureScore: 0,
    averageBoardHeight: 0,
    resourceStability: 0,
    executionPeak: 0,
    averageStageIndex: 0,
    volatilityIndex: 0,
    recoveryScore: 0,
    improvementTrend: "stable" as const,
    dominantMistakes: [],
  };

  return {
    CLASSIQUE: { ...profile },
    SPRINT: { ...profile },
    VERSUS: { ...profile },
    BRICKFALL_SOLO: { ...profile },
    ROGUELIKE: { ...profile },
    ROGUELIKE_VERSUS: { ...profile },
    PUZZLE: { ...profile },
    TETROMAZE: { ...profile },
    PIXEL_INVASION: { ...profile },
    PIXEL_PROTOCOL: { ...profile },
  };
}

function createContextualMistakePatterns() {
  return {
    CLASSIQUE: [],
    SPRINT: [],
    VERSUS: [],
    BRICKFALL_SOLO: [],
    ROGUELIKE: [],
    ROGUELIKE_VERSUS: [],
    PUZZLE: [],
    TETROMAZE: [],
    PIXEL_INVASION: [],
    PIXEL_PROTOCOL: [],
  };
}

function createStats() {
  return {
    playerBehaviorByMode: createBehaviorByMode(),
    versusMatches: 4,
    versusWins: 1,
    roguelikeVersusMatches: 0,
    roguelikeVersusWins: 0,
    lowestWinrateMode: "VERSUS",
    lastPlayedMode: "VERSUS",
    tetrobotProgression: {
      rookie: {
        level: 1,
        xp: 0,
        affinity: 12,
        mood: "neutral",
        lastTip: "Reste calme.",
      },
      pulse: {
        level: 1,
        xp: 0,
        affinity: 8,
        mood: "neutral",
        lastTip: "Observe tes habitudes.",
      },
      apex: {
        level: 4,
        xp: 410,
        affinity: -70,
        mood: "glitch",
        lastTip: "Retourne sur Versus.",
      },
    },
    tetrobotMemories: {
      rookie: [],
      pulse: [],
      apex: [
        {
          id: "apex-refusal",
          bot: "apex",
          type: "trust_break",
          text: "Apex a coupe le signal.",
          importance: 5,
          createdAt: 1,
        },
      ],
    },
    playerLongTermMemory: {
      recurringMistakes: [],
      avoidedModes: { VERSUS: 3 },
      strongestModes: {},
      weakestModes: { VERSUS: 1 },
      rageQuitCount: 0,
      comebackCount: 0,
      consistencyScore: 22,
      courageScore: 18,
      disciplineScore: 12,
      regularityScore: 35,
      strategyScore: 30,
      weakestModeFocus: "VERSUS",
      strongestModeFocus: null,
      lingeringResentment: {
        rookie: 0,
        pulse: 0,
        apex: 0,
      },
      activeRecommendations: {
        rookie: null,
        pulse: null,
        apex: null,
      },
      activeConflict: null,
      activeExclusiveAlignment: null,
      recentRunsByMode: {
        CLASSIQUE: [],
        SPRINT: [],
        VERSUS: [],
        BRICKFALL_SOLO: [],
        ROGUELIKE: [],
        ROGUELIKE_VERSUS: [],
        PUZZLE: [],
        TETROMAZE: [],
        PIXEL_INVASION: [],
        PIXEL_PROTOCOL: [],
      },
      modeProfiles: createModeProfiles(),
      contextualMistakePatterns: createContextualMistakePatterns(),
    },
    activeTetrobotChallenge: {
      id: "apex-reconciliation-versus",
      bot: "apex",
      kind: "apex_reconciliation",
      status: "offered",
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
      acceptedAt: null,
      resolvedAt: null,
    },
    counters: {
      apex_refusal_count: 1,
      apex_challenge_accepted_count: 0,
      apex_trust_restored_count: 0,
      tips_read: 2,
    },
  } as unknown as AchievementStats;
}

describe("TetrobotRelationsPanel integration", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useAchievementsMock.mockReset();
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the live Apex challenge progress and accepts the duel CTA", () => {
    const acceptActiveTetrobotChallenge = vi.fn();
    const chooseActiveTetrobotConflict = vi.fn();
    const syncTetrobotProgression = vi.fn();

    useAchievementsMock.mockReturnValue({
      stats: createStats(),
      chooseActiveTetrobotConflict,
      acceptActiveTetrobotChallenge,
      syncTetrobotProgression,
    });

    render(
      <MemoryRouter>
        <TetrobotRelationsPanel activeBot="apex" />
      </MemoryRouter>
    );

    expect(syncTetrobotProgression).toHaveBeenCalledOnce();
    expect(screen.getByText("Apex verrouille le canal")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Joue 3 sessions utiles sur VERSUS sans rage quit pour rouvrir completement le canal."
      ).length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/3\/3/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Accepter et choisir le duel Versus" }));

    expect(acceptActiveTetrobotChallenge).toHaveBeenCalledOnce();
    expect(navigateMock).toHaveBeenCalledWith("/versus");
    expect(chooseActiveTetrobotConflict).not.toHaveBeenCalled();
  });
});
