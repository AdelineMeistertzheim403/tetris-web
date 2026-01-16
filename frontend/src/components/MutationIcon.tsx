import type { ActiveMutationRuntime } from "./RoguelikeRun";

type Props = {
  mutation: ActiveMutationRuntime;
};

export default function MutationIcon({ mutation }: Props) {
  const src = mutation.icon ? `/${mutation.icon}.png` : "/vite.svg";

  return (
    <div className="perk-icon">
      <img src={src} alt={mutation.name} className="perk-icon-img" />
      {mutation.stacks > 1 && (
        <span className="mutation-stack-badge">x{mutation.stacks}</span>
      )}
    </div>
  );
}
