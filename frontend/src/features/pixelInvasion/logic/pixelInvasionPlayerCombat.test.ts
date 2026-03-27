import { describe, expect, it } from "vitest";
import { ENEMY_COLORS } from "../model";
import { createInitialState } from "./pixelInvasionWaves";
import { resolvePlayerHits } from "./pixelInvasionPlayerCombat";

describe("resolvePlayerHits", () => {
  it("places the player-shot impact inside the actual overlap with the enemy", () => {
    const state = createInitialState();
    const enemy = {
      id: 9001,
      kind: "I" as const,
      x: 300,
      y: 84,
      width: 72,
      height: 18,
      hp: 1,
      maxHp: 1,
      points: 150,
      color: ENEMY_COLORS.I,
      shootBias: 1.5,
    };

    state.enemies = [enemy];
    state.playerBullets = [
      {
        id: 9002,
        x: enemy.x + enemy.width / 2 - 4,
        y: enemy.y + enemy.height - 4,
        vx: 0,
        vy: -620,
        width: 8,
        height: 20,
        damage: 1,
        age: 0,
        sourceKind: "PLAYER",
        remainingHits: 0,
        visualType: "standard",
      },
    ];
    state.impacts = [];
    state.waveTransition = 0;

    resolvePlayerHits(state);

    const shotImpact = state.impacts.find((impact) => impact.type === "player-standard");
    expect(shotImpact).toBeDefined();
    expect(shotImpact!.y).toBeGreaterThanOrEqual(enemy.y);
    expect(shotImpact!.y).toBeLessThanOrEqual(enemy.y + enemy.height);
  });
});
