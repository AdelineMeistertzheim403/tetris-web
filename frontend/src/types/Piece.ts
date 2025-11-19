export interface Piece {
  shape: number[][];
  color: string;
  x: number;
  y: number;
  type: string;
  ghost?: boolean;
}
