import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../services/authService";

export default function Register() {
  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      alert("Les mots de passe ne correspondent pas !");
      return;
    } else {
      try {
      await register(pseudo, email, password);
      navigate("/login");
    } catch (err) {
      setError("Erreur lors de l'inscription");
    }
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-120px)]">
      <form
        onSubmit={handleSubmit}
        className="retro-form w-[400px] flex flex-col gap-6"
      >
        <h2 className="text-center text-pink-400 text-xl tracking-wider">
          Inscription
        </h2>

        {/* Champ pseudo */}
        <div className="flex flex-col gap-2">
          <label htmlFor="pseudo">Pseudo</label>
          <input
            id="pseudo"
            type="text"
            placeholder="Votre pseudo"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            className="retro-input"
            required
          />
        </div>

        {/* Champ email */}
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

        {/* Champ mot de passe */}
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

        {/* Champ confirmation */}
        <div className="flex flex-col gap-2">
          <label htmlFor="confirm">Confirmer le mot de passe</label>
          <input
            id="confirm"
            type="password"
            placeholder="********"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="retro-input"
            required
          />
        </div>

        {/* Bouton d’inscription */}
        <button type="submit" className="retro-btn mt-4">
          S’inscrire
        </button>

        {/* Lien vers la page de connexion */}
        <p className="text-center text-sm text-pink-300 mt-2">
          Déjà un compte ?{" "}
          <Link to="/login" className="text-yellow-400 hover:text-pink-300">
            Connecte-toi
          </Link>
        </p>
      </form>
    </div>
  );
}
