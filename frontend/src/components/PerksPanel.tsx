import type { Perk } from "../types/Perk";
import PerkIcon from "./PerkIcon";

export type ActivePerkRuntime = Perk & {
  startedAt?: number;
  expiresAt?: number;
};

type Props = {
  perks: ActivePerkRuntime[];
};

const rarityColors: Record<string, string> = {
  common: "#9ca3af",
  rare: "#3b82f6",
  epic: "#a855f7",
};

export default function PerksPanel({ perks }: Props) {
  return (
    <div className="perks-panel">
      <h3 className="perks-title">PERKS ACTIFS</h3>

      {perks.length === 0 && (
        <p className="perks-empty">Aucun perk actif</p>
      )}

      <ul className="perks-list">
        {perks.map(perk => (
          <li
  key={perk.id}
  className="perk-item"
  style={{
    borderLeft: `4px solid ${rarityColors[perk.rarity]}`,
  }}
>
  <PerkIcon perk={perk} />

  <div className="perk-content">
    <div className="perk-name">{perk.name}</div>
    <div className="perk-desc">{perk.description}</div>
  </div>
</li>
        ))}
      </ul>
    </div>
  );
}
