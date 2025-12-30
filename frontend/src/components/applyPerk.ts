import type { Perk } from "../types/Perk";


type ApplyPerkContext = {
  addHoldSlot?: () => void;
  slowGravity?: () => void;
  addBomb?: () => void;
};

export function applyPerk(perk: Perk, ctx: ApplyPerkContext) {
  switch (perk.id) {
    case "extra-hold":
      ctx.addHoldSlot?.();
      break;

    case "slow-gravity":
      ctx.slowGravity?.();
      break;

    case "bomb":
      ctx.addBomb?.();
      break;
  }
}
