import { describe, expect, it } from "vitest";
import { estimateRageQuitFromBehaviorEvent } from "./playerBehaviorEventLogic";

describe("playerBehaviorEventLogic", () => {
  it("does not treat a short Versus loss as a rage quit", () => {
    expect(
      estimateRageQuitFromBehaviorEvent({
        mode: "VERSUS",
        won: false,
        durationMs: 45_000,
      })
    ).toBe(false);
  });

  it("keeps treating a short solo loss as a rage quit estimate", () => {
    expect(
      estimateRageQuitFromBehaviorEvent({
        mode: "CLASSIQUE",
        won: false,
        durationMs: 45_000,
      })
    ).toBe(true);
  });
});
