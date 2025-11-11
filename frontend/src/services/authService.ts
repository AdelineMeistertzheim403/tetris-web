const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/auth";

// ✅ Connexion
export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) throw new Error("Échec de la connexion");
  const data = await res.json();

  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));

  return data.user;
}

export async function register(pseudo: string, email: string, password: string) {
  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pseudo, email, password }),
  });

  if (!res.ok) throw new Error("Échec de l'inscription");
  return res.json();
}


// ✅ Déconnexion
export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

// ✅ Vérifier si connecté
export function getCurrentUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

export function getToken() {
  return localStorage.getItem("token");
}
