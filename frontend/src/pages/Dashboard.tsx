import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logoutUser } = useAuth(); // ✅ lecture directe depuis le contexte

  const handleLogout = () => {
    logoutUser();
    navigate("/"); // redirection propre
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-black text-pink-300">
      <h1 className="text-3xl font-bold mb-4 text-yellow-400">
        Bienvenue sur ton Dashboard 🎮
      </h1>

      {user ? (
        <p className="text-lg mb-6">
          Connecté en tant que{" "}
          <span className="text-pink-400">{user.pseudo}</span>
        </p>
      ) : (
        <p className="text-red-400 mb-6">Utilisateur non trouvé</p>
      )}

      <button
        onClick={handleLogout}
        className="retro-btn bg-pink-600 hover:bg-pink-500 px-6 py-2 rounded-lg text-white"
      >
        Se déconnecter
      </button>
    </div>
  );
}
