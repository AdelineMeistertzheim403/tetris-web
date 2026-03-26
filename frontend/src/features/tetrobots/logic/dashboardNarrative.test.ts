import { describe, expect, it } from "vitest";
import { getBotTip, type DashboardPlayerContext } from "./dashboardNarrative";

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
});
