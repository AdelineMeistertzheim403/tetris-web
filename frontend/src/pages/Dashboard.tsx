import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { getMyScores } from "../services/scoreService";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logoutUser } = useAuth(); // ✅ lecture directe depuis le contexte
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    logoutUser();
    navigate("/"); // redirection propre
  };

  useEffect(() => {
  async function fetchScores() {
    try {
      const data = await getMyScores();
      // On garde les 10 meilleurs
      const sorted = data.sort((a: any, b: any) => b.value - a.value).slice(0, 10);
      setScores(sorted);
    } catch (err) {
      console.error("Erreur de chargement des scores:", err);
    } finally {
      setLoading(false);
    }
  }

  fetchScores();
}, []);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-black text-pink-300">
      {user ? (
        <p className="text-lg mb-6">
            <h1 className="text-3xl font-bold mb-4 text-yellow-400">
        Bienvenue {user.pseudo} 
      </h1>
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

      {loading ? (
  <p className="text-yellow-400 mt-6">Chargement des scores...</p>
) : scores.length === 0 ? (
  <p className="text-gray-400 mt-6">Aucun score enregistré pour l’instant.</p>
) : (
  <div className="mt-10 w-[80%] max-w-3xl ">
    <h2 className="text-2xl text-yellow-400 mb-4 text-center">🏆 Tes 10 meilleurs scores</h2>
    <table className="w-full border border-pink-500 rounded-lg bg-black bg-opacity-60 text-center bg-gradient-to-b from-[#0b001a] to-[#1a0033]">
      <thead>
        <tr className="text-yellow-400 border-b border-pink-500">
          <th className="py-2">#</th>
          <th>Score</th>
          <th>Niveau</th>
          <th>Lignes</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        {scores.map((s, i) => (
          <tr
            key={s.id}
            className="hover:bg-pink-900 transition border-b border-pink-700"
          >
            <td className="py-2 text-pink-300">{i + 1}</td>
            <td className="text-white font-bold">{s.value}</td>
            <td>{s.level}</td>
            <td>{s.lines}</td>
            <td className="text-sm text-gray-400">
              {new Date(s.createdAt).toLocaleDateString("fr-FR")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
    </div>
  );
}
