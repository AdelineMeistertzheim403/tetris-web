// Utilitaires purs reutilisables pour ce module.
export type ScoreLike = number | string | bigint;

export function formatScore(score: ScoreLike, locale = "fr-FR"): string {
  try {
    if (typeof score === "bigint") return score.toLocaleString(locale);
    if (typeof score === "number") {
      return BigInt(Math.round(score)).toLocaleString(locale);
    }
    const trimmed = score.trim();
    if (!trimmed) return "0";
    return BigInt(trimmed).toLocaleString(locale);
  } catch {
    const fallback = typeof score === "number" ? score : Number(score);
    if (Number.isFinite(fallback)) {
      return Math.round(fallback).toLocaleString(locale);
    }
    return String(score);
  }
}
