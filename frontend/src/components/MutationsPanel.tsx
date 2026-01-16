import MutationIcon from "./MutationIcon";
import type { ActiveMutationRuntime } from "./RoguelikeRun";

type Props = {
  mutations: ActiveMutationRuntime[];
};

export default function MutationsPanel({ mutations }: Props) {
  return (
    <div className="perks-panel">
      <h3 className="perks-title">MUTATIONS ACTIVES</h3>

      {mutations.length === 0 && <p className="perks-empty">Aucune mutation</p>}

      <ul className="perks-list">
        {mutations.map((mutation) => (
          <li key={mutation.id} className="perk-item">
            <MutationIcon mutation={mutation} />

            <div className="perk-content">
              <div className="perk-name">
                {mutation.name}
                {mutation.stacks > 1 ? ` x${mutation.stacks}` : ""}
              </div>
              <div className="perk-desc">{mutation.description}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
