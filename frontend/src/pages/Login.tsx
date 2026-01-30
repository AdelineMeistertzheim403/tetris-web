import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import { saveAchievementStats } from "../services/achievementService";
import { useAuth } from "../context/AuthContext";
import { useAchievements } from "../hooks/useAchievements";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setUser } = useAuth(); // ✅ accès au contexte
  const { checkAchievements, updateStats } = useAchievements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const loggedUser = await login(email, password); // 🔹 récupère le user
      setUser(loggedUser); // ✅ met à jour le contexte global
      const today = new Date().toISOString().slice(0, 10);
      const next = updateStats((prev) => {
        const uniqueDays = new Set(prev.loginDays);
        uniqueDays.add(today);
        return {
          ...prev,
          loginDays: Array.from(uniqueDays),
        };
      });
      checkAchievements({
        custom: {
          login_days_7: next.loginDays.length >= 7,
          login_days_30: next.loginDays.length >= 30,
        },
      });
      saveAchievementStats(next.loginDays).catch(() => {
        // silent fallback to localStorage
      });
      navigate("/dashboard");
    } catch (err) {
      setError("Email ou mot de passe invalide");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-120px)]">
      <form
        onSubmit={handleSubmit}
        className="retro-form w-[400px] flex flex-col gap-6"
      >
        <h2 className="text-center text-pink-400 text-xl tracking-wider">
          Connexion
        </h2>

        <div className="flex flex-col gap-2">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="Votre e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="retro-input"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="retro-input"
            required
          />
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button type="submit" className="retro-btn mt-4">
          Se connecter
        </button>

        <p className="text-center text-sm text-pink-300 mt-2">
          Pas encore de compte ?{" "}
          <Link to="/register" className="text-yellow-400 hover:text-pink-300">
            Inscris-toi
          </Link>
        </p>
      </form>
    </div>
  );
}
