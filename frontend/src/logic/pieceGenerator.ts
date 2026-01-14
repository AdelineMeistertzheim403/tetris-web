import { COLORS, SHAPES } from "./shapes";
import type { Piece } from "../types/Piece";

export function createPieceFromKey(key: string): Piece {
  const shape = SHAPES[key];
  const color = COLORS[key];

  return {
    shape,
    color,
    x: 3,
    y: 0,
    type: key,
  };
}

function shuffle<T>(array: T[], rng: () => number): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createBagGenerator(rng: () => number, initial?: string[]) {
  let bag: string[] = initial?.length ? [...initial] : [];

  const refill = () => {
    bag = shuffle(Object.keys(SHAPES), rng);
  };

  const next = (): Piece => {
    if (bag.length === 0) refill();
    const key = bag.shift() as string;
    return createPieceFromKey(key);
  };

  const pushSequence = (seq: string[]) => {
    bag.push(...seq);
  };

  const reset = () => {
    bag = [];
  };

  return { next, pushSequence, reset };
}
