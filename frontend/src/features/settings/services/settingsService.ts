import { getAuthHeader } from "../../auth/services/authService";
import type { Settings } from "../types/Settings";

const API_URL = import.meta.env.VITE_API_URL;

type SettingsResponse = {
  settings?: Settings | null;
};

const parseError = async (res: Response, fallback: string) => {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
};

export async function fetchUserSettings(): Promise<Settings | null> {
  const res = await fetch(`${API_URL}/auth/settings`, {
    method: "GET",
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement parametres utilisateur"));
  }

  const data = (await res.json()) as SettingsResponse;
  return data.settings ?? null;
}

export async function saveUserSettings(settings: Settings): Promise<void> {
  const res = await fetch(`${API_URL}/auth/settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    credentials: "include",
    body: JSON.stringify({ settings }),
  });

  if (res.status === 401 || res.status === 403) return;
  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur sauvegarde parametres utilisateur"));
  }
}
