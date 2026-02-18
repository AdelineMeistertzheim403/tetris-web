// Composant UI SidebarLeft.tsx.
import type { ActiveMutationRuntime, ActivePerkRuntime } from "../RoguelikeRun";
import type { Synergy } from "../../../types/Synergy";
import RunInfo from "../RunInfo";
import PerksPanel from "../../panels/PerksPanel";
import MutationsPanel from "../../panels/MutationsPanel";
import SynergiesPanel from "../../panels/SynergiesPanel";
import StatusBadges from "./StatusBadges";
import type { StatusBadge } from "../../../utils/runCalculations";

type Props = {
  linesUntilNextChoice: number;
  perkProgress: number;
  selectionType: "perk" | "mutation";
  statusBadges: StatusBadge[];
  activePerks: ActivePerkRuntime[];
  activeMutations: ActiveMutationRuntime[];
  activeSynergies: Synergy[];
  selectingPerk: boolean;
};

export default function SidebarLeft({
  linesUntilNextChoice,
  perkProgress,
  selectionType,
  statusBadges,
  activePerks,
  activeMutations,
  activeSynergies,
  selectingPerk,
}: Props) {
  return (
    <aside className="rogue-left">
      <RunInfo
        linesUntilNextPerk={selectingPerk ? 0 : linesUntilNextChoice}
        perkProgress={perkProgress}
        mode={selectionType}
      />
      <StatusBadges badges={statusBadges} />
      <div className="perks-wrapper">
        <PerksPanel perks={activePerks} />
        <MutationsPanel mutations={activeMutations} />
        <SynergiesPanel synergies={activeSynergies} />
      </div>
    </aside>
  );
}
