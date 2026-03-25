import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { getLeaderboard, getMyScores } from "../../game/services/scoreService";
import type { GameMode } from "../../game/types/GameMode";
import { PATHS } from "../../../routes/paths";
import "../../../styles/dashboard.scss";

type ModeCard = {
  title: string;
  desc: string;
  path: string;
  accent: string;
  image: string;
};

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

export default function TetrisHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"modes" | "scores">("modes");
  const [scores, setScores] = useState<Array<UserScore | VersusRow>>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<GameMode>("CLASSIQUE");
  const [showVersusChoice, setShowVersusChoice] = useState(false);
  const [showRoguelikeVersusChoice, setShowRoguelikeVersusChoice] = useState(false);

  const tetrisModes: ModeCard[] = [
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
      title: "Roguelike",
      desc: "Perks, mutations et synergies.",
      path: "/roguelike",
      accent: "from-[#12001a] to-[#2a003d]",
      image: "/Game_Mode/roguelike.png",
    },
    {
      title: "Puzzle",
      desc: "Plateaux fixes et objectifs précis.",
      path: "/puzzle",
      accent: "from-[#1a1200] to-[#332400]",
      image: "/Game_Mode/puzzle.png",
    },
    {
      title: "Versus",
      desc: "Affronte d'autres joueurs.",
      path: "/versus",
      accent: "from-[#1a0010] to-[#33001f]",
      image: "/Game_Mode/versus.png",
    },
    {
      title: "Roguelike Versus",
      desc: "Roguelike compétitif en 1v1.",
      path: "/roguelike-versus",
      accent: "from-[#0d1a1a] to-[#0c2b33]",
      image: "/Game_Mode/roguelike-versus.png",
    },
  ];

  useEffect(() => {
    if (tab !== "scores") return;
    setLoading(true);

    async function fetchScores() {
      try {
        if (mode === "VERSUS" || mode === "ROGUELIKE_VERSUS") {
          const data = await getLeaderboard(mode);
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
          const sorted =
            mode === "SPRINT"
              ? data.sort((a: UserScore, b: UserScore) => a.value - b.value)
              : data.sort((a: UserScore, b: UserScore) => b.value - a.value);
          setScores(sorted.slice(0, 10));
        }
      } catch (err) {
        console.error("Erreur de chargement des scores Tetris:", err);
      } finally {
        setLoading(false);
      }
    }

    void fetchScores();
  }, [mode, tab, user]);

  return (
    <div className="dashboard-mode-shell dashboard-mode-shell--tetris min-h-screen text-pink-300 font-['Press_Start_2P'] py-10 px-10">
      <div className="dashboard-mode-head">
        <div>
          <p className="dashboard-mode-eyebrow">Hub arcade</p>
          <h1 className="dashboard-mode-title">Arcade Tetris</h1>
          <p className="dashboard-mode-subtitle">
            Retrouve ici les modes Tetris purs: score, vitesse, puzzle et affrontement.
          </p>
        </div>
        <button
          type="button"
          className="dashboard-mode-back"
          onClick={() => navigate(PATHS.dashboard)}
        >
          Retour dashboard
        </button>
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
            {item === "modes" ? "Modes Tetris" : "Meilleurs scores"}
          </button>
        ))}
      </div>

      {tab === "modes" && (
        <div className="mode-card-grid mode-card-grid--tetris-hub">
          {tetrisModes.map((modeCard) => (
            <button
              key={modeCard.title}
              onClick={() => {
                if (modeCard.path === "/versus") {
                  setShowVersusChoice(true);
                  return;
                }
                if (modeCard.path === "/roguelike-versus") {
                  setShowRoguelikeVersusChoice(true);
                  return;
                }
                navigate(modeCard.path);
              }}
              className={`mode-card mode-card--tetris bg-gradient-to-b ${modeCard.accent}`}
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
          <div className="mb-8 flex justify-center">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as GameMode)}
              className="retro-select border-4 border-pink-500 bg-black text-yellow-300 px-6 py-3 rounded-xl cursor-pointer hover:shadow-[0_0_25px_#ff00ff] focus:outline-none focus:ring-4 focus:ring-pink-500/70 transition-all duration-300"
            >
              <option value="CLASSIQUE"> Mode Classique</option>
              <option value="SPRINT"> Mode Sprint</option>
              <option value="VERSUS"> Mode Versus</option>
              <option value="ROGUELIKE_VERSUS"> Mode Roguelike Versus</option>
            </select>
          </div>

          {loading ? (
            <p className="text-yellow-400 mt-6 text-center">Chargement des scores...</p>
          ) : scores.length === 0 ? (
            <p className="text-gray-400 mt-6 text-center">Aucun score enregistré pour ce mode.</p>
          ) : (
            <div className="mt-2 w-full max-w-4xl mx-auto">
              <h2 className="text-2xl text-yellow-400 mb-4 text-center">
                Tes 10 meilleurs scores - {mode}
              </h2>
              {mode === "VERSUS" || mode === "ROGUELIKE_VERSUS" ? (
                <table className="w-full border border-pink-500 rounded-lg bg-black bg-opacity-60 text-center bg-gradient-to-b from-[#0b001a] to-[#1a0033] shadow-[0_0_20px_#ff00ff]">
                  <thead>
                    <tr className="text-yellow-400 border-b border-pink-500">
                      <th className="py-2">#</th>
                      <th>Joueur 1</th>
                      <th>Joueur 2</th>
                      <th>Score</th>
                      <th>Lignes</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(scores as VersusRow[]).map((row, i) => (
                      <tr
                        key={row.id}
                        className="hover:bg-pink-900/30 transition border-b border-pink-700"
                      >
                        <td className="py-2 text-pink-300">{i + 1}</td>
                        <td className="text-white">{row.player1?.pseudo}</td>
                        <td className="text-white">{row.player2?.pseudo}</td>
                        <td className="text-white font-bold">
                          {row.player1?.score} - {row.player2?.score}
                        </td>
                        <td className="text-cyan-200">
                          {row.player1?.lines} - {row.player2?.lines}
                        </td>
                        <td className="text-xs text-gray-400">
                          {row.createdAt
                            ? new Date(row.createdAt).toLocaleDateString("fr-FR")
                            : "-"}
                        </td>
                      </tr>
                    ))}
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

      {showVersusChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-xl rounded-xl border-2 border-pink-500 bg-[#130212] p-6 text-left shadow-[0_0_20px_#ff00ff]">
            <h2 className="text-xl text-yellow-300 mb-4">Mode Versus</h2>
            <p className="text-sm text-gray-200 mb-6">
              Choisis ton type de duel avant de lancer la partie.
            </p>
            <div className="flex flex-col gap-3">
              <button
                className="retro-btn text-left"
                onClick={() => {
                  setShowVersusChoice(false);
                  navigate(`${PATHS.versus}?queue=bot`);
                }}
              >
                Solo vs Tetrobots
              </button>
              <button
                className="retro-btn text-left"
                onClick={() => {
                  setShowVersusChoice(false);
                  navigate(`${PATHS.versus}?queue=pvp`);
                }}
              >
                Joueur vs Joueur
              </button>
              <button
                className="retro-btn text-left"
                onClick={() => setShowVersusChoice(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {showRoguelikeVersusChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-xl rounded-xl border-2 border-pink-500 bg-[#130212] p-6 text-left shadow-[0_0_20px_#ff00ff]">
            <h2 className="text-xl text-yellow-300 mb-4">Mode Roguelike Versus</h2>
            <p className="text-sm text-gray-200 mb-6">
              Choisis ton type de duel avant de lancer la partie.
            </p>
            <div className="flex flex-col gap-3">
              <button
                className="retro-btn text-left"
                onClick={() => {
                  setShowRoguelikeVersusChoice(false);
                  navigate(`${PATHS.roguelikeVersus}?queue=bot`);
                }}
              >
                Solo vs Tetrobots
              </button>
              <button
                className="retro-btn text-left"
                onClick={() => {
                  setShowRoguelikeVersusChoice(false);
                  navigate(`${PATHS.roguelikeVersus}?queue=pvp`);
                }}
              >
                Joueur vs Joueur
              </button>
              <button
                className="retro-btn text-left"
                onClick={() => setShowRoguelikeVersusChoice(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
