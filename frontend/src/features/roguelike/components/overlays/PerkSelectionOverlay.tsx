import type { Perk } from "../../types/Perk"
import { PerkCard } from "../cards/PerkCard"
import "../../../../styles/roguelike-perks.css"


type Props = {
  perks: Perk[]
  onSelect: (perk: Perk) => void
}

export default function PerkSelectionOverlay({ perks, onSelect }: Props) {
  return (
    <div className="perk-overlay">
      <div className="perk-modal">
        <h2>CHOISISSEZ UN PERK</h2>

        <div className="perk-cards">
          {perks.map(perk => (
            <PerkCard
              key={perk.id}
              perk={perk}
              onClick={() => onSelect(perk)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
