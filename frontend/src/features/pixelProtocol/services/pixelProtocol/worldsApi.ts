import type { WorldTemplate } from "../../types";
import {
  API_URL,
  authHeaders,
  isWorldTemplate,
  parseError,
  parseWorldTemplatesPayload,
} from "./shared";

export async function fetchPixelProtocolWorldTemplates(): Promise<WorldTemplate[]> {
  const res = await fetch(`${API_URL}/pixel-protocol/world-templates`, {
    headers: authHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement mondes custom Pixel Protocol"));
  }

  return parseWorldTemplatesPayload(await res.json());
}

export async function savePixelProtocolWorldTemplate(world: WorldTemplate): Promise<WorldTemplate> {
  const res = await fetch(`${API_URL}/pixel-protocol/world-templates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({ world }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur sauvegarde monde custom Pixel Protocol"));
  }

  const data = (await res.json()) as { world?: unknown };
  return isWorldTemplate(data.world) ? data.world : world;
}

export async function deletePixelProtocolWorldTemplate(templateId: string): Promise<void> {
  const res = await fetch(`${API_URL}/pixel-protocol/world-templates/${encodeURIComponent(templateId)}`, {
    method: "DELETE",
    headers: authHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur suppression monde custom Pixel Protocol"));
  }
}
