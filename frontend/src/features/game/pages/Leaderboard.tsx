import { useEffect, useState } from "react";
import { getLeaderboard } from "../services/scoreService";
import type { GameMode } from "../types/GameMode";

type LeaderboardEntry = {
  id: number;
  value: number;
  level: number;
  lines: number;
  mode?: GameMode;
  user?: { pseudo?: string };
};

type VersusRow = {
  id: number;
  matchId?: string | null;
  winnerPseudo?: string | null;
  player1: { pseudo: string; score: number; lines: number; wins: number; losses: number };
  player2: { pseudo: string; score: number; lines: number; wins: number; losses: number };
};

export default function Leaderboard() {
  // Ce leaderboard agrège plusieurs modes, d'où le format de ligne variable.
  const [scores, setScores] = useState<Array<LeaderboardEntry | VersusRow>>([]);
  const [mode, setMode] = useState<GameMode>("CLASSIQUE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rechargement quand le mode change.
  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        setError(null);
        // Évite de mapper d'anciennes données d'un autre mode.
        setScores([]);
        // Le backend renvoie un format spécifique selon le mode.
        const data = await getLeaderboard(mode);
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
          onChange={(e) => setMode(e.target.value as GameMode)}
          className="retro-select bg-black border-2 border-pink-500 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400"
        >
          <option value="CLASSIQUE"> Mode Classique</option>
          <option value="SPRINT"> Mode Sprint</option>
          <option value="VERSUS"> Mode Versus</option>
        </select>
      </div>

      {/* États d’affichage */}
      {loading ? (
        <p className="text-pink-400">Chargement...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : scores.length === 0 ? (
        <p className="text-gray-400">Aucun score enregistré pour ce mode</p>
      ) : mode === "VERSUS" ? (
        <table className="border border-pink-500 rounded-lg w-[90%] bg-black bg-opacity-50 bg-gradient-to-b from-[#0b001a] to-[#1a0033] shadow-lg">
          <thead>
            <tr className="text-yellow-400">
              <th className="py-2">#</th>
              <th>Joueur 1</th>
              <th>Joueur 2</th>
              <th>Vainqueur</th>
              <th>Victoires / Défaites</th>
            </tr>
          </thead>
          <tbody>
            {(scores as VersusRow[])
              .filter((row) => row?.player1 && row?.player2)
              .map((row, i) => (
                <tr key={row.id} className="hover:bg-pink-900 transition border-t border-pink-500/30">
                  <td className="py-2">{i + 1}</td>
                  <td>
                    <div className="font-semibold">{row.player1?.pseudo ?? "Joueur 1"}</div>
                    <div className="text-xs text-gray-300">
                      {row.player1?.score ?? 0} pts / {row.player1?.lines ?? 0} lignes
                    </div>
                  </td>
                  <td>
                    <div className="font-semibold">{row.player2?.pseudo ?? "Joueur 2"}</div>
                    <div className="text-xs text-gray-300">
                      {row.player2?.score ?? 0} pts / {row.player2?.lines ?? 0} lignes
                    </div>
                  </td>
                  <td className="text-green-300 font-bold">
                    {row.winnerPseudo ?? "Égalité"}
                  </td>
                  <td className="text-sm text-white">
                    J1: {row.player1?.wins ?? 0}V / {row.player1?.losses ?? 0}D | J2: {row.player2?.wins ?? 0}V / {row.player2?.losses ?? 0}D
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
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
            {(scores as LeaderboardEntry[]).map((s, i) => (
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
