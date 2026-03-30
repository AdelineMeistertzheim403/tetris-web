import { describe, expect, it } from "vitest";
import {
  createDefaultModeKeyBindings,
  getControlActionOrder,
  getModeKeyBindings,
  normalizeModeKeyBindings,
} from "./controls";

describe("controls utils", () => {
  it("cree des profils par defaut pour tous les modes", () => {
    const defaults = createDefaultModeKeyBindings();

    expect(defaults.CLASSIQUE.harddrop).toBe("Space");
    expect(defaults.ROGUELIKE.freeze).toBe("F");
    expect(defaults.BRICKFALL_SOLO.launch).toBe("Space");
    expect(defaults.TETROMAZE.up).toBe("ArrowUp");
    expect(defaults.PIXEL_INVASION.shoot).toBe("Space");
    expect(defaults.PIXEL_PROTOCOL.jump).toBe("Space");
  });

  it("propage les anciens bindings tetris sur les profils tetris manquants", () => {
    const normalized = normalizeModeKeyBindings(undefined, {
      left: "q",
      right: "d",
      down: "s",
      rotate: "z",
      harddrop: " ",
      hold: "c",
      bomb: "b",
      freeze: "f",
    });

    expect(normalized.CLASSIQUE.left).toBe("Q");
    expect(normalized.SPRINT.rotate).toBe("Z");
    expect(normalized.VERSUS.harddrop).toBe("Space");
    expect(normalized.BRICKFALL_SOLO.launch).toBe("Space");
  });

  it("renvoie les bindings specifiques au mode demande", () => {
    const bindings = getModeKeyBindings(
      {
        keyBindings: {
          left: "ArrowLeft",
          right: "ArrowRight",
          down: "ArrowDown",
          rotate: "ArrowUp",
          harddrop: "Space",
          hold: "Shift",
          bomb: "B",
          freeze: "F",
        },
        modeKeyBindings: {
          PIXEL_INVASION: {
            left: "A",
            right: "D",
            shoot: "Space",
            dash: "Shift",
            bomb: "X",
          },
        },
      },
      "PIXEL_INVASION"
    );

    expect(bindings.left).toBe("A");
    expect(bindings.bomb).toBe("X");
  });

  it("masque bombe et time freeze hors des modes roguelike", () => {
    expect(getControlActionOrder("CLASSIQUE")).not.toContain("bomb");
    expect(getControlActionOrder("CLASSIQUE")).not.toContain("freeze");
    expect(getControlActionOrder("PUZZLE")).not.toContain("bomb");
    expect(getControlActionOrder("ROGUELIKE")).toContain("bomb");
    expect(getControlActionOrder("ROGUELIKE_VERSUS")).toContain("freeze");
  });
});
