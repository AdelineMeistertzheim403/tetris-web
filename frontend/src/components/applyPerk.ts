import type { Perk } from "../types/Perk";

type ApplyPerkContext = {
  addHoldSlot?: () => void;

  // gravité
  slowGravity?: (factor?: number) => void;

  // score
  addScoreBoost?: (value?: number) => void;

  // bombes
  addBomb?: (count?: number) => void;
  setBombRadius?: (radius: number) => void;

  // états spéciaux
  grantSecondChance?: () => void;
  enableFastHoldReset?: () => void;
  enableChaosMode?: () => void;
  enableLastStand?: () => void;

  // time based
  freezeTime?: (durationMs: number) => void;
};

export function applyPerk(perk: Perk, ctx: ApplyPerkContext) {
  switch (perk.id) {
    /* ───────────── COMMON ───────────── */

    case "extra-hold":
      ctx.addHoldSlot?.();
      break;

    case "soft-gravity":
      ctx.slowGravity?.(1.2);
      break;

    case "score-boost":
      ctx.addScoreBoost?.(0.5);
      break;

    case "bomb":
      ctx.addBomb?.(1);
      break;

    /* ───────────── RARE ───────────── */

    case "slow-gravity":
      ctx.slowGravity?.(1.6);
      break;

    case "double-bomb":
      ctx.addBomb?.(2);
      break;

    case "second-chance":
      ctx.grantSecondChance?.();
      break;

    case "fast-hold-reset":
      ctx.enableFastHoldReset?.();
      break;

    /* ───────────── EPIC ───────────── */

    case "mega-bomb":
      ctx.setBombRadius?.(2); // 5x5
      break;

    case "time-freeze":
      ctx.freezeTime?.(5000); // 5 secondes
      break;

    case "chaos-mode":
      ctx.enableChaosMode?.();
      break;

    case "last-stand":
      ctx.enableLastStand?.();
      break;

    /* ───────────── FALLBACK ───────────── */

    default:
      console.warn("Perk non implémenté :", perk.id);
  }
}
