import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { getLeaderboard, getMyScores } from "../services/scoreService";
import type { GameMode } from "../types/GameMode";

type UserScore = {
  id: number;
  value: number;
  level: number;
  lines: number;
  createdAt: string;
  mode: GameMode;
};

type VersusRow = {
  id: number;
  matchId?: string | null;
  winnerPseudo?: string | null;
  player1: { pseudo: string; score: number; lines: number; wins: number; losses: number; userId?: number | null };
  player2: { pseudo: string; score: number; lines: number; wins: number; losses: number; userId?: number | null };
  createdAt?: string;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logoutUser } = useAuth();
  const [scores, setScores] = useState<Array<UserScore | VersusRow>>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<GameMode>("CLASSIQUE");

  const handleLogout = async () => {
    await logoutUser();
    navigate("/");
  };

  useEffect(() => {
    async function fetchScores() {
      try {
        if (mode === "VERSUS") {
          const data = await getLeaderboard("VERSUS");
          const mine = (data as VersusRow[]).filter(
            (row) =>
              row.player1?.pseudo === user?.pseudo ||
              row.player2?.pseudo === user?.pseudo ||
              row.player1?.userId === user?.id ||
              row.player2?.userId === user?.id
          );
          setScores(mine);
        } else {
          const data = await getMyScores(mode);
          // tri différent selon le mode
          const sorted =
            mode === "SPRINT"
              ? data.sort((a: any, b: any) => a.value - b.value) // plus rapide = mieux
              : data.sort((a: any, b: any) => b.value - a.value);
          setScores(sorted.slice(0, 10));
        }
      } catch (err) {
        console.error("Erreur de chargement des scores:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchScores();
  }, [mode, user]);

  return (
    <div className="min-h-screen flex flex-col items-center  text-pink-300 font-['Press_Start_2P'] py-10">
      {/* Titre */}
      <h1 className="text-3xl text-yellow-400 mb-4 drop-shadow-[0_0_15px_#ff00ff]">
         Tableau de bord
      </h1>

      {/* Pseudo */}
      {user ? (
        <p className="text-xl mb-8 text-pink-400">
          Bienvenue <span className="text-yellow-300">{user.pseudo}</span> !
        </p>
      ) : (
        <p className="text-red-400 mb-6">Utilisateur non trouvé</p>
      )}

      {/* Boutons */}
      <div className="flex gap-6 mb-10">
        <button
          onClick={handleLogout}
          className="bg-pink-600 hover:bg-pink-500 px-6 py-2 rounded-lg text-white border-2 border-yellow-400 hover:scale-105 transition-transform shadow-[0_0_15px_#ff00ff]"
        >
           Se déconnecter
        </button>
      </div>

      {/* Sélecteur de mode */}
      <div className="mb-8">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as GameMode)}
          className="retro-select border-4 border-pink-500 bg-black text-yellow-300 px-6 py-3 rounded-xl cursor-pointer hover:shadow-[0_0_25px_#ff00ff] focus:outline-none focus:ring-4 focus:ring-pink-500/70 transition-all duration-300"
        >
          <option value="CLASSIQUE"> Mode Classique</option>
          <option value="SPRINT"> Mode Sprint</option>
          <option value="VERSUS"> Mode Versus</option>
        </select>
      </div>

      {/* Scores */}
      {loading ? (
        <p className="text-yellow-400 mt-6">Chargement des scores...</p>
      ) : scores.length === 0 ? (
        <p className="text-gray-400 mt-6">Aucun score enregistré pour ce mode.</p>
      ) : (
        <div className="mt-6 w-[80%] max-w-3xl ">
          <h2 className="text-2xl text-yellow-400 mb-4 text-center">
            🏆 Tes 10 meilleurs scores — {mode}
          </h2>
          {mode === "VERSUS" ? (
            <table className="w-full border border-pink-500 rounded-lg bg-black bg-opacity-60 text-center bg-gradient-to-b from-[#0b001a] to-[#1a0033] shadow-[0_0_20px_#ff00ff]">
              <thead>
                <tr className="text-yellow-400 border-b border-pink-500">
                  <th className="py-2">#</th>
                  <th>Adversaire</th>
                  <th>Résultat</th>
                  <th>Score / Lignes</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {(scores as VersusRow[]).map((row, i) => {
                  const isP1 = row.player1?.pseudo === user?.pseudo || row.player1?.userId === user?.id;
                  const me = isP1 ? row.player1 : row.player2;
                  const opp = isP1 ? row.player2 : row.player1;
                  const outcome = row.winnerPseudo
                    ? row.winnerPseudo === me?.pseudo
                      ? "Victoire"
                      : "Défaite"
                    : "Égalité";
                  return (
                    <tr key={row.id} className="hover:bg-pink-900/30 transition border-b border-pink-700">
                      <td className="py-2 text-pink-300">{i + 1}</td>
                      <td className="text-white font-bold">{opp?.pseudo ?? "?"}</td>
                      <td className={outcome === "Victoire" ? "text-green-300" : outcome === "Défaite" ? "text-red-300" : "text-yellow-300"}>
                        {outcome} {me ? `(${me.wins}V / ${me.losses}D)` : ""}
                      </td>
                      <td className="text-white">
                        {me?.score ?? 0} pts / {me?.lines ?? 0} lignes
                      </td>
                      <td className="text-xs text-gray-400">
                        {row.createdAt ? new Date(row.createdAt).toLocaleDateString("fr-FR") : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full border border-pink-500 rounded-lg bg-black bg-opacity-60 text-center bg-gradient-to-b from-[#0b001a] to-[#1a0033] shadow-[0_0_20px_#ff00ff]">
              <thead>
                <tr className="text-yellow-400 border-b border-pink-500">
                  <th className="py-2">#</th>
                  <th>{mode === "SPRINT" ? "Temps (s)" : "Score"}</th>
                  {mode === "CLASSIQUE" && <th>Niveau</th>}
                  <th>Lignes</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {(scores as UserScore[]).map((s, i) => (
                  <tr
                    key={s.id}
                    className="hover:bg-pink-900/30 transition border-b border-pink-700"
                  >
                    <td className="py-2 text-pink-300">{i + 1}</td>
                    <td className="text-white font-bold">
                      {mode === "SPRINT" ? `${s.value}s` : s.value}
                    </td>
                    {mode === "CLASSIQUE" && <td>{s.level}</td>}
                    <td>{s.lines}</td>
                    <td className="text-xs text-gray-400">
                      {new Date(s.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
