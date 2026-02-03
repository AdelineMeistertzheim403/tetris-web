import seedrandom from "seedrandom";

export type RNG = () => number;

export function createRng(seed: string): RNG {
  const rng = seedrandom(seed);
  return () => rng();
}
