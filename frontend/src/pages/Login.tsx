import { useState } from "react";
import { Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ email, password });
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
