import { COLORS, SHAPES } from "./shapes";
import type { Piece } from "../types/Piece";

// 7-bag generator
let currentBag: string[] = [];

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function refillBag() {
  currentBag = shuffle(Object.keys(SHAPES));
}

export function generateBagPiece(): Piece {
  if (currentBag.length === 0) {
    refillBag();
  }
  const key = currentBag.shift() as string;
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
