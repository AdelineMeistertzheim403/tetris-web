import type { Synergy } from "../../../types/Synergy";

type Props = {
  synergy: Synergy | null;
};

export default function SynergyToast({ synergy }: Props) {
  if (!synergy) return null;
  return (
    <div className="synergy-toast">
      <p className="eyebrow">Synergie activée</p>
      <p className="synergy-name">{synergy.name}</p>
      <p className="muted small">{synergy.description}</p>
    </div>
  );
}
