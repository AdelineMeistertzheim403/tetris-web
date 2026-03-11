import {
  API_URL,
  authHeaders,
  normalizeProgress,
  parseError,
  type PixelProtocolProgress,
  type SavePixelProtocolProgressPayload,
} from "./shared";

export async function fetchPixelProtocolProgress(): Promise<PixelProtocolProgress> {
  const res = await fetch(`${API_URL}/pixel-protocol/progress`, {
    headers: authHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement progression Pixel Protocol"));
  }

  return normalizeProgress(await res.json());
}

export async function savePixelProtocolProgress(
  payload: SavePixelProtocolProgressPayload
): Promise<PixelProtocolProgress> {
  const body: SavePixelProtocolProgressPayload = {};
  if (payload.highestLevel !== undefined) {
    body.highestLevel = Math.max(1, Math.floor(payload.highestLevel));
  }
  if (payload.currentLevel !== undefined) {
    body.currentLevel = Math.max(1, Math.floor(payload.currentLevel));
  }

  const res = await fetch(`${API_URL}/pixel-protocol/progress`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur sauvegarde progression Pixel Protocol"));
  }

  return normalizeProgress(await res.json());
}
