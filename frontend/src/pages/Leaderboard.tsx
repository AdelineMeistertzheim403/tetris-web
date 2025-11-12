import { useEffect, useState } from "react";
import { getLeaderboard } from "../services/scoreService";

export default function Leaderboard() {
  const [scores, setScores] = useState<any[]>([]);
  const [mode, setMode] = useState<"CLASSIQUE" | "SPRINT">("CLASSIQUE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔁 Rechargement quand le mode change
  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        setError(null);
        const data = await getLeaderboard(mode); // ✅ on lui passe le mode
        setScores(data);
      } catch (err) {
        console.error(err);
        setError("Erreur lors du chargement du classement 😢");
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [mode]);

  return (
    <div className="flex flex-col items-center text-center mt-20 text-pink-400">
      <h1 className="text-3xl text-yellow-400 mb-6">🏆 Classement</h1>

      {/* Sélecteur de mode */}
      <div className="mb-6">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "CLASSIQUE" | "SPRINT")}
          className="retro-select bg-black border-2 border-pink-500 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400"
        >
          <option value="CLASSIQUE"> Mode Classique</option>
          <option value="SPRINT"> Mode Sprint</option>
        </select>
      </div>

      {/* États d’affichage */}
      {loading ? (
        <p className="text-pink-400">Chargement...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : scores.length === 0 ? (
        <p className="text-gray-400">Aucun score enregistré pour ce mode</p>
      ) : (
        <table className="border border-pink-500 rounded-lg w-[60%] bg-black bg-opacity-50 bg-gradient-to-b from-[#0b001a] to-[#1a0033] shadow-lg">
          <thead>
            <tr className="text-yellow-400">
              <th className="py-2">#</th>
              <th>Joueur</th>
              <th>
                {mode === "SPRINT" ? "Temps (s)" : "Score"}
              </th>
              {mode === "CLASSIQUE" && <th>Niveau</th>}
              <th>Lignes</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s, i) => (
              <tr
                key={s.id}
                className="hover:bg-pink-900 transition border-t border-pink-500/30"
              >
                <td className="py-2">{i + 1}</td>
                <td>{s.user?.pseudo ?? "Anonyme"}</td>
                <td>{s.value}</td>
                {mode === "CLASSIQUE" && <td>{s.level}</td>}
                <td>{s.lines}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
