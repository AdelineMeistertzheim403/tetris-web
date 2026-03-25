const API_URL = import.meta.env.VITE_API_URL;
const AUTH_TOKEN_KEY = "tetris-auth-token";
let currentUserRequest: Promise<any> | null = null;
let currentUserCache: any = undefined;

function getNoStoreHeaders(headers: HeadersInit = {}): HeadersInit {
  return {
    "Cache-Control": "no-cache, no-store, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
    ...headers,
  };
}

export class AuthApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
  }
}

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
      currentUserCache = null;
      currentUserRequest = null;
      return;
    }
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    currentUserCache = undefined;
    currentUserRequest = null;
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
    cache: "no-store",
    headers: getNoStoreHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new AuthApiError("Trop de tentatives, reessaie dans quelques minutes.", 429);
    }
    if (res.status === 401 || res.status === 403) {
      throw new AuthApiError("Email ou mot de passe invalide.", res.status);
    }
    throw new AuthApiError("Echec de la connexion.", res.status);
  }
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
    cache: "no-store",
    headers: getNoStoreHeaders({ "Content-Type": "application/json" }),
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
    cache: "no-store",
    headers: getNoStoreHeaders({
      ...getAuthHeader(),
    }),
    credentials: "include",
  });
}

// Récupère l'utilisateur courant (null si non authentifié).
export async function getCurrentUser() {
  if (currentUserCache !== undefined) {
    return currentUserCache;
  }

  if (!currentUserRequest) {
    currentUserRequest = fetch(`${API_URL}/auth/me`, {
      cache: "no-store",
      headers: getNoStoreHeaders({
        ...getAuthHeader(),
      }),
      credentials: "include",
    })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          setAuthToken(null);
          currentUserCache = null;
          return null;
        }
        if (!res.ok) throw new Error("Erreur lors de la recuperation du profil");
        const user = await res.json();
        currentUserCache = user;
        return user;
      })
      .finally(() => {
        currentUserRequest = null;
      });
  }

  return currentUserRequest;
}
