import { describe, expect, it } from "vitest";
import {
  getApexChallengeActionLabel,
  getApexChallengeActionTarget,
  getApexRequirement,
} from "./apexTrustEngine";
import type {
  PlayerLongTermMemory,
  TetrobotChallengeState,
} from "../../achievements/types/tetrobots";

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
});
