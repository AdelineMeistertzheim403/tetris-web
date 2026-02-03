import { useEffect } from "react";
import type { Perk } from "../types/Perk";
import type { Mutation } from "../types/Mutation";
import { generatePerkChoices } from "../utils/perkRng";
import { generateMutationChoices } from "../utils/mutationRng";
import { ALL_PERKS } from "../data/perks";
import { MUTATIONS } from "../data/mutations";
import type { ActiveMutationRuntime, ActivePerkRuntime } from "../components/run/RoguelikeRun";

type Params = {
  selectingPerk: boolean;
  selectionType: "perk" | "mutation";
  activePerks: ActivePerkRuntime[];
  activeMutations: ActiveMutationRuntime[];
  autoSeededMode: boolean;
  rngRef: React.MutableRefObject<(() => number) | null>;
  perkChoices: Perk[];
  mutationChoices: Mutation[];
  setPerkChoices: React.Dispatch<React.SetStateAction<Perk[]>>;
  setMutationChoices: React.Dispatch<React.SetStateAction<Mutation[]>>;
  setSelectingPerk: React.Dispatch<React.SetStateAction<boolean>>;
  onSelectPerk: (perk: Perk) => void;
  onSelectMutation: (mutation: Mutation) => void;
};

export function useRoguelikeSelection({
  selectingPerk,
  selectionType,
  activePerks,
  activeMutations,
  autoSeededMode,
  rngRef,
  perkChoices,
  mutationChoices,
  setPerkChoices,
  setMutationChoices,
  setSelectingPerk,
  onSelectPerk,
  onSelectMutation,
}: Params) {
  useEffect(() => {
    if (!selectingPerk) return;

    const rng = rngRef.current ?? Math.random;

    if (selectionType === "mutation") {
      if (mutationChoices.length > 0) return;
      const choices = generateMutationChoices(MUTATIONS, 3, activeMutations, rng);
      if (choices.length === 0) {
        setSelectingPerk(false);
        return;
      }
      if (autoSeededMode) {
        onSelectMutation(choices[0]);
        return;
      }
      setMutationChoices(choices);
      return;
    }

    if (perkChoices.length > 0) return;
    const choices = generatePerkChoices(
      ALL_PERKS,
      3,
      activePerks.map((p) => p.id),
      rng
    );
    if (choices.length === 0) {
      setSelectingPerk(false);
      return;
    }
    if (autoSeededMode) {
      onSelectPerk(choices[0]);
      return;
    }
    setPerkChoices(choices);
  }, [
    selectingPerk,
    selectionType,
    activePerks,
    activeMutations,
    autoSeededMode,
    rngRef,
    perkChoices,
    mutationChoices,
    setPerkChoices,
    setMutationChoices,
    setSelectingPerk,
    onSelectPerk,
    onSelectMutation,
  ]);
}
