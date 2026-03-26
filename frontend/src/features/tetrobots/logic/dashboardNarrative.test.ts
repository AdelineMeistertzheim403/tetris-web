import { describe, expect, it } from "vitest";
import {
  getBotTip,
  getBotTipSelectionKey,
  type DashboardPlayerContext,
} from "./dashboardNarrative";

const BASE_CONTEXT: DashboardPlayerContext = {
  favoriteMode: "SPRINT",
  weakestMode: "ROGUELIKE",
  lastPlayedMode: "CLASSIQUE",
  winRate: 62,
  mistakes: ["holes"],
  regularityScore: 58,
  strategyScore: 64,
};

describe("dashboardNarrative", () => {
  it("keeps the same tip for the same dashboard context", () => {
    const firstTip = getBotTip("pulse", 3, "friendly", BASE_CONTEXT);
    const secondTip = getBotTip("pulse", 3, "friendly", { ...BASE_CONTEXT });

    expect(secondTip).toBe(firstTip);
  });

  it("ignores volatile recommendation timing fields in the tip selection key", () => {
    const firstKey = getBotTipSelectionKey("pulse", 3, "friendly", {
      ...BASE_CONTEXT,
      recommendation: {
        bot: "pulse",
        kind: "reduce_mistakes",
        targetMode: "SPRINT",
        reason: "first",
        issuedAt: 10,
        lastEvaluatedAt: 20,
        totalSessionsAtIssue: 4,
        targetModeSessionsAtIssue: 2,
        ignoredSessions: 0,
        ignoreThreshold: 4,
        ignoredMs: 1500,
        ignoreThresholdMs: 3000,
        penaltyCount: 0,
      },
      pulseRecommendation: {
        bot: "pulse",
        kind: "reduce_mistakes",
        targetMode: "SPRINT",
        reason: "second",
        issuedAt: 99,
        lastEvaluatedAt: 199,
        totalSessionsAtIssue: 8,
        targetModeSessionsAtIssue: 5,
        ignoredSessions: 3,
        ignoreThreshold: 4,
        ignoredMs: 9999,
        ignoreThresholdMs: 3000,
        penaltyCount: 2,
      },
    });
    const secondKey = getBotTipSelectionKey("pulse", 3, "friendly", {
      ...BASE_CONTEXT,
      recommendation: {
        bot: "pulse",
        kind: "reduce_mistakes",
        targetMode: "SPRINT",
        reason: "updated",
        issuedAt: 999,
        lastEvaluatedAt: 1999,
        totalSessionsAtIssue: 20,
        targetModeSessionsAtIssue: 10,
        ignoredSessions: 12,
        ignoreThreshold: 4,
        ignoredMs: 25000,
        ignoreThresholdMs: 3000,
        penaltyCount: 5,
      },
      pulseRecommendation: {
        bot: "pulse",
        kind: "reduce_mistakes",
        targetMode: "SPRINT",
        reason: "updated again",
        issuedAt: 1000,
        lastEvaluatedAt: 2000,
        totalSessionsAtIssue: 21,
        targetModeSessionsAtIssue: 11,
        ignoredSessions: 13,
        ignoreThreshold: 4,
        ignoredMs: 26000,
        ignoreThresholdMs: 3000,
        penaltyCount: 6,
      },
    });

    expect(secondKey).toBe(firstKey);
  });
});
