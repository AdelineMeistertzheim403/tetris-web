import type { ActiveMutationRuntime } from "../run/RoguelikeRun";
import { mutationIconPath } from "../../../../shared/utils/assetPaths";

type Props = {
  mutation: ActiveMutationRuntime;
};

export default function MutationIcon({ mutation }: Props) {
  const src = mutation.icon ? mutationIconPath(mutation.icon) : "/vite.svg";

  return (
    <div className="perk-icon">
      <img src={src} alt={mutation.name} className="perk-icon-img" />
      {mutation.stacks > 1 && (
        <span className="mutation-stack-badge">x{mutation.stacks}</span>
      )}
    </div>
  );
}
