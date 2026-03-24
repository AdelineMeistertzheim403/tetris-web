import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthApiError, login } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import { PATHS } from "../../../routes/paths";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth(); // accès au contexte auth global
  const { recordLoginDay } = useAchievements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);

    try {
      // Auth + mise à jour du contexte global.
      const loggedUser = await login(email, password);
      setUser(loggedUser);
      recordLoginDay();
      navigate(PATHS.dashboard);
    } catch (err) {
      if (err instanceof AuthApiError) {
        setError(err.message);
      } else {
        setError("Impossible de se connecter pour le moment.");
      }
    } finally {
      setIsSubmitting(false);
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

        <button type="submit" className="retro-btn mt-4" disabled={isSubmitting}>
          {isSubmitting ? "Connexion..." : "Se connecter"}
        </button>

        <p className="text-center text-sm text-pink-300 mt-2">
          Pas encore de compte ?{" "}
          <Link to={PATHS.register} className="text-yellow-400 hover:text-pink-300">
            Inscris-toi
          </Link>
        </p>
      </form>
    </div>
  );
}
