import type { Impact } from "../model";

/** Collision AABB simple partagée par les phases joueur et dégâts. */
export function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Fabrique minimale d'effets d'impact pour le rendu du board. */
export function createImpact(
  id: number,
  x: number,
  y: number,
  type: Impact["type"],
  size: number,
  ttl = 0.3
): Impact {
  return { id, x, y, type, size, ttl };
}
