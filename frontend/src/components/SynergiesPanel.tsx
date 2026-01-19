// components/SynergiesPanel.tsx
import { useMemo, useState } from "react";
import type { Synergy } from "../types/Synergy";

type Props = {
  synergies: Synergy[];
};

const COLLAPSE_LIMIT = 3;

export default function SynergiesPanel({ synergies }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { visible, hiddenCount } = useMemo(() => {
    if (expanded) return { visible: synergies, hiddenCount: 0 };
    const slice = synergies.slice(0, COLLAPSE_LIMIT);
    return { visible: slice, hiddenCount: Math.max(0, synergies.length - slice.length) };
  }, [expanded, synergies]);

  if (synergies.length === 0) return null;

  return (
    <div className="synergies-panel">
      <div className="panel-header">
        <h3>⚡ Synergies ({synergies.length})</h3>
        {synergies.length > COLLAPSE_LIMIT && (
          <button
            className="panel-toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? "Tout plier" : `Voir tout (+${hiddenCount})`}
          </button>
        )}
      </div>

      <div className="synergies-grid">
        {visible.map((s) => (
          <div
            key={s.id}
            className="synergy-chip"
            title={`${s.name} — ${s.description}`}
          >
            <span className={`synergy-icon ${s.icon}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
