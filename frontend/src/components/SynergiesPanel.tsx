// components/SynergiesPanel.tsx
import type { Synergy } from "../types/Synergy";

type Props = {
  synergies: Synergy[];
};

export default function SynergiesPanel({ synergies }: Props) {
  if (synergies.length === 0) return null;

  return (
    <div className="synergies-panel">
      <h3>⚡ Synergies actives</h3>

      <ul>
        {synergies.map(s => (
          <li key={s.id} className="synergy-item">
            <span className={`synergy-icon ${s.icon}`} />
            <div>
              <strong>{s.name}</strong>
              <p>{s.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
