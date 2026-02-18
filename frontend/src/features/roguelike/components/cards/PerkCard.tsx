// Composant UI PerkCard.tsx.
import type { Perk } from "../../types/Perk"


export function PerkCard({
  perk,
  onClick,
}: {
  perk: Perk
  onClick: () => void
}) {
  return (
    <div className={`perk-card ${perk.rarity ?? 'common'}`} onClick={onClick}>
      <h3>{perk.name}</h3>
      <p>{perk.description}</p>
      <span className="perk-rarity">{perk.rarity ?? 'COMMON'}</span>
    </div>
  )
}
