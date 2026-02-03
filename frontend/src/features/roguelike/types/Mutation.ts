import type { MutationContext } from "./MutationContext";

export type Mutation = {
  id: string;
  name: string;
  description: string;
  stackable?: boolean;
  maxStacks?: number;
  icon: string;
  unique?: boolean;

  apply: (ctx: MutationContext) => void;
};
