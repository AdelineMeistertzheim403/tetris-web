import type { Mutation } from "../types/Mutation";

type ActiveMutationState = {
  id: string;
  stacks: number;
};

export function generateMutationChoices(
  allMutations: Mutation[],
  count: number,
  activeMutations: ActiveMutationState[],
  rng: () => number
): Mutation[] {
  // Filtre les mutations proposées selon l'état actif (unique/stackable).
  const pool = allMutations.filter((mutation) => {
    const active = activeMutations.find((m) => m.id === mutation.id);
    if (!active) return true;

    if (mutation.unique) return false;

    if (mutation.stackable) {
      const maxStacks = mutation.maxStacks ?? Number.POSITIVE_INFINITY;
      return active.stacks < maxStacks;
    }

    return false;
  });

  const available = [...pool];
  const result: Mutation[] = [];

  // Tirage simple sans doublon dans la sélection.
  while (result.length < count && available.length > 0) {
    const index = Math.floor(rng() * available.length);
    const [picked] = available.splice(index, 1);
    result.push(picked);
  }

  return result;
}
