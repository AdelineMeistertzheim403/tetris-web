// Composant UI MutationSelectionOverlay.tsx.
import type { Mutation } from "../../types/Mutation";
import { MutationCard } from "../cards/MutationCard";
import "../../../../styles/roguelike-perks.css";

type Props = {
  mutations: Mutation[];
  onSelect: (mutation: Mutation) => void;
};

export default function MutationSelectionOverlay({ mutations, onSelect }: Props) {
  return (
    <div className="perk-overlay">
      <div className="perk-modal">
        <h2>CHOISISSEZ UNE MUTATION</h2>

        <div className="perk-cards">
          {mutations.map((mutation) => (
            <MutationCard
              key={mutation.id}
              mutation={mutation}
              onClick={() => onSelect(mutation)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
