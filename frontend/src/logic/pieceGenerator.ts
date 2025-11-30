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

function refillBag(targetBag?: string[]) {
  if (targetBag && targetBag.length) {
    currentBag = [...targetBag];
  } else {
    currentBag = shuffle(Object.keys(SHAPES));
  }
}

export function generateBagPiece(externalBag?: string[]): Piece {
  if (externalBag && externalBag.length > 0) {
    return createPieceFromKey(externalBag.shift() as string);
  }

  if (currentBag.length === 0) {
    refillBag();
  }
  const key = currentBag.shift() as string;
  return createPieceFromKey(key);
}

function createPieceFromKey(key: string): Piece {
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
