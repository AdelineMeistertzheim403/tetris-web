import type { Mutation } from "../types/Mutation";

type Props = {
  mutation: Mutation;
  onClick: () => void;
};

export function MutationCard({ mutation, onClick }: Props) {
  return (
    <div className="perk-card mutation-card" onClick={onClick}>
      <h3>{mutation.name}</h3>
      <p>{mutation.description}</p>
      <div className="perk-rarity">MUTATION</div>
    </div>
  );
}
