import { useMemo, useState } from "react";
import type { Perk } from "../../types/Perk";
import PerkIcon from "../icons/PerkIcon";

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

const COLLAPSE_LIMIT = 5;

export default function PerksPanel({ perks }: Props) {
  const [expanded, setExpanded] = useState(false);

  const { visible, hiddenCount } = useMemo(() => {
    if (expanded) return { visible: perks, hiddenCount: 0 };
    const slice = perks.slice(0, COLLAPSE_LIMIT);
    return { visible: slice, hiddenCount: Math.max(0, perks.length - slice.length) };
  }, [expanded, perks]);

  return (
    <div className="perks-panel">
      <div className="panel-header">
        <h3 className="perks-title">PERKS ({perks.length})</h3>
        {perks.length > COLLAPSE_LIMIT && (
          <button
            className="panel-toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? "Tout plier" : `Voir tout (+${hiddenCount})`}
          </button>
        )}
      </div>

      {perks.length === 0 && <p className="perks-empty">Aucun perk actif</p>}

      <div className="perks-grid">
        {visible.map((perk) => (
          <div
            key={perk.id}
            className="perk-chip"
            title={`${perk.name} — ${perk.description}`}
            style={{ borderColor: rarityColors[perk.rarity] }}
          >
            <PerkIcon perk={perk} />
          </div>
        ))}
      </div>
    </div>
  );
}
