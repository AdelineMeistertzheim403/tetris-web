import {
  API_URL,
  authHeaders,
  isCommunityLevel,
  parseCommunityLevelsPayload,
  parseError,
  type PixelProtocolCommunityLevel,
} from "./shared";

export async function fetchPixelProtocolCommunityLevels(): Promise<PixelProtocolCommunityLevel[]> {
  const res = await fetch(`${API_URL}/pixel-protocol/community-levels`, {
    headers: authHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement niveaux joueurs Pixel Protocol"));
  }

  return parseCommunityLevelsPayload(await res.json());
}

export async function fetchPixelProtocolCommunityLevel(
  publishedId: number
): Promise<PixelProtocolCommunityLevel> {
  const res = await fetch(`${API_URL}/pixel-protocol/community-levels/${publishedId}`, {
    headers: authHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement niveau joueur Pixel Protocol"));
  }

  const data = (await res.json()) as { level?: unknown };
  if (isCommunityLevel(data.level)) return data.level;
  throw new Error("Niveau joueur invalide");
}

export async function publishPixelProtocolCommunityLevel(
  levelId: string
): Promise<PixelProtocolCommunityLevel> {
  const res = await fetch(`${API_URL}/pixel-protocol/community-levels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({ levelId }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur publication niveau Pixel Protocol"));
  }

  const data = (await res.json()) as { level?: unknown };
  if (isCommunityLevel(data.level)) return data.level;
  throw new Error("Publication invalide");
}

export async function togglePixelProtocolCommunityLevelLike(
  publishedId: number
): Promise<{ liked: boolean; likeCount: number }> {
  const res = await fetch(`${API_URL}/pixel-protocol/community-levels/${publishedId}/like`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur vote niveau Pixel Protocol"));
  }

  const data = (await res.json()) as { liked?: unknown; likeCount?: unknown };
  return {
    liked: Boolean(data.liked),
    likeCount: Number.isFinite(data.likeCount)
      ? Math.max(0, Math.floor(data.likeCount as number))
      : 0,
  };
}

export async function recordPixelProtocolCommunityLevelPlay(
  publishedId: number
): Promise<{ playCount: number }> {
  const res = await fetch(`${API_URL}/pixel-protocol/community-levels/${publishedId}/play`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur comptage partie niveau Pixel Protocol"));
  }

  const data = (await res.json()) as { playCount?: unknown };
  return {
    playCount: Number.isFinite(data.playCount)
      ? Math.max(0, Math.floor(data.playCount as number))
      : 0,
  };
}
