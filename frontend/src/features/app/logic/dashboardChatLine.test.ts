import { describe, expect, it } from "vitest";
import { selectDashboardChatLine } from "./dashboardChatLine";

function createArgs(
  overrides: Partial<Parameters<typeof selectDashboardChatLine>[0]> = {}
): Parameters<typeof selectDashboardChatLine>[0] {
  return {
    apexLevel: 2,
    botMatches: 4,
    botWins: 2,
    brickfallWins: 1,
    counters: {},
    finaleChoice: null,
    inactive: false,
    previousBot: "pulse",
    pulseLevel: 3,
    roguelikeVersusMatches: 3,
    roguelikeVersusWins: 1,
    rookieLevel: 2,
    rotationSlot: 128,
    tetromazeWins: 1,
    versusMatches: 8,
    versusWins: 4,
    ...overrides,
  };
}

describe("dashboardChatLine", () => {
  it("keeps the same chat line for the same rotation slot and context", () => {
    const args = createArgs();

    expect(selectDashboardChatLine(args)).toEqual(selectDashboardChatLine(args));
  });

  it("keeps the previous bot as host when Pixel hijacks the channel", () => {
    const baseArgs = createArgs({ finaleChoice: "observe", previousBot: "pulse" });
    let pixelLine = null;

    for (let rotationSlot = 0; rotationSlot < 2048; rotationSlot += 1) {
      const candidate = selectDashboardChatLine({
        ...baseArgs,
        rotationSlot,
      });

      if (candidate.speaker === "pixel") {
        pixelLine = candidate;
        break;
      }
    }

    expect(pixelLine).not.toBeNull();
    expect(pixelLine?.bot).toBe("pulse");
  });
});
