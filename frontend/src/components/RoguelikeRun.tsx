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

const MOCK_PERKS: Perk[] = [
  {
    id: 'extra-hold',
    name: '+1 HOLD',
    description: 'Stockez une pièce supplémentaire',
    rarity: 'common',
  },
  {
    id: 'slow-gravity',
    name: 'GRAVITÉ LENTE',
    description: 'La vitesse de chute est réduite',
    rarity: 'rare',
  },
  {
    id: 'bomb',
    name: 'BOMBE',
    description: 'Détruit une zone 3x3',
    rarity: 'epic',
  },
]


export default function RoguelikeRun() {
    const [selectingPerk, setSelectingPerk] = useState(true)
    const [activePerks, setActivePerks] = useState<Perk[]>([]);
    const [gravityMultiplier, setGravityMultiplier] = useState(1);
const [extraHoldSlots, setExtraHoldSlots] = useState(0);
const [addBombFn, setAddBombFn] = useState<(() => void) | null>(null);
const [perkChoices, setPerkChoices] = useState<Perk[]>([]);

 const handleSelectPerk = (perk: Perk) => {
  applyPerk(perk, {
    addHoldSlot: () => setExtraHoldSlots(v => v + 1),
    slowGravity: () => setGravityMultiplier(v => v * 1.5),
    addBomb: () => addBombFn?.(),
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
}, [selectingPerk]);
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
  gravityMultiplier={gravityMultiplier}
   extraHold={extraHoldSlots}
    onAddBomb={setAddBombFn}
/>
      </main>

      <aside className="rogue-right">
        <Hud />
        <HoldNext />
      </aside>
    </div>
  )
}
