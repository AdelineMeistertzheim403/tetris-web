import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { useEffect, useState } from "react";
import { getLeaderboard, getMyScores } from "../../game/services/scoreService";
import type { GameMode } from "../../game/types/GameMode";
import "../../../styles/dashboard.scss";

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

type BrickfallLeaderboardRow = {
  userId: number | null;
  pseudo: string;
  wins: number;
  losses: number;
  architectGames: number;
  demolisherGames: number;
  architectWins: number;
  demolisherWins: number;
  rankScore: number;
  winRate: number;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logoutUser } = useAuth();
  const [scores, setScores] = useState<Array<UserScore | VersusRow | BrickfallLeaderboardRow>>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<GameMode>("CLASSIQUE");
  const [tab, setTab] = useState<"modes" | "scores">("modes");

  const handleLogout = async () => {
    // Déconnexion + retour à l'accueil.
    await logoutUser();
    navigate("/");
  };

  useEffect(() => {
    if (tab !== "scores") return;
    setLoading(true);
    async function fetchScores() {
      try {
        if (mode === "VERSUS" || mode === "ROGUELIKE_VERSUS") {
          // En modes PVP: on filtre les matchs où le joueur est impliqué.
          const data = await getLeaderboard(mode);
          const mine = (data as VersusRow[]).filter(
            (row) =>
              row.player1?.pseudo === user?.pseudo ||
              row.player2?.pseudo === user?.pseudo ||
              row.player1?.userId === user?.id ||
              row.player2?.userId === user?.id
          );
          setScores(mine);
        } else if (mode === "BRICKFALL_VERSUS") {
          const data = await getLeaderboard(mode);
          const mine = (data as BrickfallLeaderboardRow[]).filter(
            (row) => row.userId === user?.id || row.pseudo === user?.pseudo
          );
          setScores(mine);
        } else {
          // En solo: on récupère uniquement les scores du joueur.
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
  }, [mode, tab, user]);

  return (
    <div className="min-h-screen flex flex-col text-pink-300 font-['Press_Start_2P'] py-10 px-10">
      <div className="relative mb-8">
        {user ? (
          <p className="text-2xl md:text-3xl text-pink-400 text-center">
            Bienvenue <span className="text-yellow-300">{user.pseudo}</span> !
          </p>
        ) : (
          <p className="text-red-400 text-center">Utilisateur non trouvé</p>
        )}

        {user && (
          <button
            onClick={handleLogout}
            className="bg-pink-600 hover:bg-pink-500 px-4 py-2 rounded-lg text-white border-2 border-yellow-400 hover:scale-105 transition-transform shadow-[0_0_15px_#ff00ff] absolute right-0 top-0"
          >
            Se déconnecter
          </button>
        )}
      </div>

      <div className="flex gap-4 mb-8 justify-center">
        {(["modes", "scores"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`px-4 py-2 rounded-lg border-2 text-sm ${
              tab === item
                ? "bg-pink-600 border-pink-300 text-white"
                : "bg-black/40 border-pink-700 text-pink-300"
            }`}
          >
            {item === "modes" ? "Modes de jeux" : "Meilleurs scores"}
          </button>
        ))}
      </div>

      {tab === "modes" && (
        <div className="mode-card-grid">
          {[
            {
              title: "Classique",
              desc: "Le mode original pour scorer.",
              path: "/game",
              accent: "from-[#0b001a] to-[#1a0033]",
              image: "/Game_Mode/classique.png",
            },
            {
              title: "Sprint",
              desc: "Fais le meilleur temps sur 40 lignes.",
              path: "/sprint",
              accent: "from-[#001a12] to-[#003329]",
              image: "/Game_Mode/sprint.png",
            },
            {
              title: "Versus",
              desc: "Affronte d'autres joueurs.",
              path: "/versus",
              accent: "from-[#1a0010] to-[#33001f]",
              image: "/Game_Mode/versus.png",
            },
            {
              title: "Brickfall Versus",
              desc: "Tetris x casse-brique asymétrique.",
              path: "/brickfall-versus",
              accent: "from-[#00121a] to-[#00314a]",
              image: "/Game_Mode/brickfall.png",
            },
            {
              title: "Roguelike",
              desc: "Perks, mutations et synergies.",
              path: "/roguelike",
              accent: "from-[#12001a] to-[#2a003d]",
              image: "/Game_Mode/roguelike.png",
            },
            {
              title: "Roguelike Versus",
              desc: "Roguelike compétitif en 1v1.",
              path: "/roguelike-versus",
              accent: "from-[#0d1a1a] to-[#0c2b33]",
              image: "/Game_Mode/roguelike-versus.png",
            },
            {
              title: "Puzzle",
              desc: "Plateaux fixes et objectifs précis.",
              path: "/puzzle",
              accent: "from-[#1a1200] to-[#332400]",
              image: "/Game_Mode/puzzle.png",
            },
          ].map((modeCard) => (
            <button
              key={modeCard.title}
              onClick={() => navigate(modeCard.path)}
              className={`mode-card bg-gradient-to-b ${modeCard.accent}`}
            >
              <div className="mode-card__icon">
                <img
                  src={modeCard.image}
                  alt={modeCard.title}
                  className="mode-card__image"
                  loading="lazy"
                />
              </div>
              <div className="mode-card__content">
                <h3>{modeCard.title}</h3>
                <p>{modeCard.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {tab === "scores" && (
        <>
          <div className="mb-8">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as GameMode)}
              className="retro-select border-4 border-pink-500 bg-black text-yellow-300 px-6 py-3 rounded-xl cursor-pointer hover:shadow-[0_0_25px_#ff00ff] focus:outline-none focus:ring-4 focus:ring-pink-500/70 transition-all duration-300"
            >
              <option value="CLASSIQUE"> Mode Classique</option>
              <option value="SPRINT"> Mode Sprint</option>
              <option value="VERSUS"> Mode Versus</option>
              <option value="BRICKFALL_VERSUS"> Mode Brickfall Versus</option>
              <option value="ROGUELIKE_VERSUS"> Mode Roguelike Versus</option>
            </select>
          </div>

          {loading ? (
            <p className="text-yellow-400 mt-6">Chargement des scores...</p>
          ) : scores.length === 0 ? (
            <p className="text-gray-400 mt-6">Aucun score enregistré pour ce mode.</p>
          ) : (
            <div className="mt-2 w-full max-w-4xl">
              <h2 className="text-2xl text-yellow-400 mb-4 text-center">
                🏆 Tes 10 meilleurs scores — {mode}
              </h2>
              {mode === "BRICKFALL_VERSUS" ? (
                <table className="w-full border border-pink-500 rounded-lg bg-black bg-opacity-60 text-center bg-gradient-to-b from-[#0b001a] to-[#1a0033] shadow-[0_0_20px_#ff00ff]">
                  <thead>
                    <tr className="text-yellow-400 border-b border-pink-500">
                      <th className="py-2">#</th>
                      <th>Pseudo</th>
                      <th>V/D total</th>
                      <th>Wins Architecte</th>
                      <th>Wins Démolisseur</th>
                      <th>Rang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(scores as BrickfallLeaderboardRow[]).map((row, i) => (
                      <tr
                        key={`${row.userId ?? "anon"}-${row.pseudo}`}
                        className="hover:bg-pink-900/30 transition border-b border-pink-700"
                      >
                        <td className="py-2 text-pink-300">{i + 1}</td>
                        <td className="text-white font-bold">{row.pseudo}</td>
                        <td className="text-white">{row.wins}V / {row.losses}D</td>
                        <td className="text-cyan-300">{row.architectWins}</td>
                        <td className="text-green-300">{row.demolisherWins}</td>
                        <td className="text-yellow-300 font-bold">{row.rankScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : mode === "VERSUS" || mode === "ROGUELIKE_VERSUS" ? (
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
                      const isP1 =
                        row.player1?.pseudo === user?.pseudo ||
                        row.player1?.userId === user?.id;
                      const me = isP1 ? row.player1 : row.player2;
                      const opp = isP1 ? row.player2 : row.player1;
                      const outcome = row.winnerPseudo
                        ? row.winnerPseudo === me?.pseudo
                          ? "Victoire"
                          : "Défaite"
                        : "Égalité";
                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-pink-900/30 transition border-b border-pink-700"
                        >
                          <td className="py-2 text-pink-300">{i + 1}</td>
                          <td className="text-white font-bold">{opp?.pseudo ?? "?"}</td>
                          <td
                            className={
                              outcome === "Victoire"
                                ? "text-green-300"
                                : outcome === "Défaite"
                                  ? "text-red-300"
                                  : "text-yellow-300"
                            }
                          >
                            {outcome} {me ? `(${me.wins}V / ${me.losses}D)` : ""}
                          </td>
                          <td className="text-white">
                            {me?.score ?? 0} pts / {me?.lines ?? 0} lignes
                          </td>
                          <td className="text-xs text-gray-400">
                            {row.createdAt
                              ? new Date(row.createdAt).toLocaleDateString("fr-FR")
                              : "-"}
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
        </>
      )}
    </div>
  );
}
