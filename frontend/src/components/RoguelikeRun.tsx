import { useEffect, useState } from "react";
import HoldNext from "./HoldNext";
import Hud from "./Hud";
import PerksPanel from "./PerksPanel";
import RunInfo from "./RunInfo";
import TetrisBoard from "./TetrisBoard";
import PerkSelectionOverlay from "./PerkSelectionOverlay";
import type { Perk } from "../types/Perk";
import { applyPerk } from "./applyPerk";
import { generatePerkChoices } from "../utils/perkRng";
import { ALL_PERKS } from "../data/perks";

export default function RoguelikeRun() {
    const [selectingPerk, setSelectingPerk] = useState(true)
    const [activePerks, setActivePerks] = useState<Perk[]>([]);
    const [gravityMultiplier, setGravityMultiplier] = useState(1);
const [extraHoldSlots, setExtraHoldSlots] = useState(0);
const [addBombFn, setAddBombFn] = useState<(() => void) | null>(null);
const [perkChoices, setPerkChoices] = useState<Perk[]>([]);
const [scoreMultiplier, setScoreMultiplier] = useState(1);
const [secondChance, setSecondChance] = useState(false);

 const handleSelectPerk = (perk: Perk) => {
  applyPerk(perk, {
    addHoldSlot: () => setExtraHoldSlots(v => v + 1),
    slowGravity: (factor = 1.5) =>
  setGravityMultiplier(v => v * factor),
    addBomb: (count = 1) => {
  for (let i = 0; i < count; i++) {
    addBombFn?.();
  }
},
 addScoreBoost: (value = 0.5) =>
    setScoreMultiplier(v => v + value),
 grantSecondChance: () => setSecondChance(true),

  });

  
  setActivePerks(prev => [...prev, perk]);
  setSelectingPerk(false);
};

useEffect(() => {
  if (selectingPerk) {
    setPerkChoices(
      generatePerkChoices(
        ALL_PERKS,        // liste complète
        3,                // nombre proposé
        activePerks.map(p => p.id) // éviter doublons déjà pris
      )
    );
  }
}, [selectingPerk, activePerks]);
  return (
    <div className="rogue-run">
         {selectingPerk && (
        <PerkSelectionOverlay
          perks={perkChoices}
          onSelect={handleSelectPerk}
        />
      )}
      <aside className="rogue-left">
        <RunInfo />
        <PerksPanel perks={activePerks} />
      </aside>

      <main className="rogue-center">
        <TetrisBoard
  mode="ROGUELIKE"
  autoStart={!selectingPerk}
  gravityMultiplier={gravityMultiplier}
   extraHold={extraHoldSlots}
    onAddBomb={setAddBombFn}
    scoreMultiplier={scoreMultiplier}
    secondChance={secondChance}
    onConsumeSecondChance={() => setSecondChance(false)}
/>
      </main>

      <aside className="rogue-right">
        <Hud />
        <HoldNext />
      </aside>
    </div>
  )
}
