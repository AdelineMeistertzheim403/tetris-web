const API_URL = import.meta.env.VITE_API_URL;
const AUTH_TOKEN_KEY = "tetris-auth-token";

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (!token) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return;
    }
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // no-op
  }
}

export function getAuthHeader(): HeadersInit {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Connexion: session cookie (credentials include).
export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  if (!res.ok) throw new Error("Échec de la connexion");
  const data = (await res.json()) as { user: any; token?: string };
  if (data.token) {
    setAuthToken(data.token);
  }

  return data.user;
}

// Inscription d'un nouvel utilisateur.
export async function register(pseudo: string, email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pseudo, email, password }),
    credentials: "include",
  });

  if (!res.ok) throw new Error("Échec de l'inscription");
  return res.json();
}

// Déconnexion (invalidate côté serveur).
export async function logout() {
  setAuthToken(null);
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });
}

// Récupère l'utilisateur courant (null si non authentifié).
export async function getCurrentUser() {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });
  if (res.status === 401 || res.status === 403) {
    setAuthToken(null);
    return null;
  }
  if (!res.ok) throw new Error("Erreur lors de la recuperation du profil");
  return res.json();
}
