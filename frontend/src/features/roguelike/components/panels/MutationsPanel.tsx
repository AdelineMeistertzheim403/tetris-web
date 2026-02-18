// Composant UI MutationsPanel.tsx.
import { useMemo, useState } from "react";
import MutationIcon from "../icons/MutationIcon";
import type { ActiveMutationRuntime } from "../run/RoguelikeRun";

type Props = {
  mutations: ActiveMutationRuntime[];
};

const COLLAPSE_LIMIT = 4;

export default function MutationsPanel({ mutations }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { visible, hiddenCount } = useMemo(() => {
    if (expanded) return { visible: mutations, hiddenCount: 0 };
    const slice = mutations.slice(0, COLLAPSE_LIMIT);
    return { visible: slice, hiddenCount: Math.max(0, mutations.length - slice.length) };
  }, [expanded, mutations]);

  return (
    <div className="perks-panel">
      <div className="panel-header">
        <h3 className="perks-title">MUTATIONS ({mutations.length})</h3>
        {mutations.length > COLLAPSE_LIMIT && (
          <button
            className="panel-toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? "Tout plier" : `Voir tout (+${hiddenCount})`}
          </button>
        )}
      </div>

      {mutations.length === 0 && <p className="perks-empty">Aucune mutation</p>}

      <div className="mutations-grid">
        {visible.map((mutation) => (
          <div
            key={mutation.id}
            className="mutation-chip"
            title={`${mutation.name}${mutation.stacks > 1 ? ` x${mutation.stacks}` : ""} — ${mutation.description}`}
          >
            <MutationIcon mutation={mutation} />
            {mutation.stacks > 1 && (
              <span className="mutation-chip__stack">x{mutation.stacks}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
