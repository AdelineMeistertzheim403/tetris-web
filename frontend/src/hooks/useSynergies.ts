import { useEffect, useRef } from "react";
import { SYNERGIES } from "../data/synergies";
import type { Synergy } from "../types/Synergy";
import type { SynergyContext } from "../types/SynergyContext";

export function useSynergies(
  activePerkIds: string[],
  ctx: SynergyContext,
  onActivate?: (synergy: Synergy) => void
) {
  const activated = useRef<Set<string>>(new Set());

  useEffect(() => {
    SYNERGIES.forEach((synergy) => {
      const count = synergy.requiredPerks.filter(p =>
        activePerkIds.includes(p)
      ).length;

      const min = synergy.minCount ?? synergy.requiredPerks.length;
      const canActivate = count >= min;

      if (
        canActivate &&
        (!synergy.unique || !activated.current.has(synergy.id))
      ) {
        synergy.apply(ctx);
        activated.current.add(synergy.id);
        onActivate?.(synergy);
      }
    });
  }, [activePerkIds, ctx, onActivate]);
}
