const API_URL = import.meta.env.VITE_API_URL;

// Connexion: session cookie (credentials include).
export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  if (!res.ok) throw new Error("Échec de la connexion");
  const data = await res.json();

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
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

// Récupère l'utilisateur courant (null si non authentifié).
export async function getCurrentUser() {
  const res = await fetch(`${API_URL}/auth/me`, {
    credentials: "include",
  });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error("Erreur lors de la recuperation du profil");
  return res.json();
}
