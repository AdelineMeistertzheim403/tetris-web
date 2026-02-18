// Composant UI SelectionOverlays.tsx.
import type { Perk } from "../../../types/Perk";
import type { Mutation } from "../../../types/Mutation";
import PerkSelectionOverlay from "../../overlays/PerkSelectionOverlay";
import MutationSelectionOverlay from "../../overlays/MutationSelectionOverlay";

type Props = {
  selectingPerk: boolean;
  selectionType: "perk" | "mutation";
  autoSeededMode: boolean;
  perkChoices: Perk[];
  mutationChoices: Mutation[];
  onSelectPerk: (perk: Perk) => void;
  onSelectMutation: (mutation: Mutation) => void;
};

export default function SelectionOverlays({
  selectingPerk,
  selectionType,
  autoSeededMode,
  perkChoices,
  mutationChoices,
  onSelectPerk,
  onSelectMutation,
}: Props) {
  if (!selectingPerk || autoSeededMode) return null;

  return (
    <>
      {selectionType === "perk" && (
        <PerkSelectionOverlay perks={perkChoices} onSelect={onSelectPerk} />
      )}
      {selectionType === "mutation" && (
        <MutationSelectionOverlay mutations={mutationChoices} onSelect={onSelectMutation} />
      )}
    </>
  );
}
