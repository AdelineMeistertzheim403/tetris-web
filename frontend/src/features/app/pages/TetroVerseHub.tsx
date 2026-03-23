import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyScores } from "../../game/services/scoreService";
import type { GameMode } from "../../game/types/GameMode";
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

export default function TetroVerseHub() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"modes" | "scores">("modes");
  const [scores, setScores] = useState<UserScore[]>([]);
  const [loading, setLoading] = useState(false);

  const tetroVerseModes: ModeCard[] = [
    {
      title: "Tetromaze",
      desc: "Pacman-like neon contre les Tetrobots.",
      path: "/tetromaze",
      accent: "from-[#070f24] to-[#1b2b56]",
      image: "/Game_Mode/tetromaze.png",
    },
    {
      title: "Pixel Protocol",
      desc: "Platformer Tetroverse: saute, hack et collecte des Data-Orbs.",
      path: "/pixel-protocol",
      accent: "from-[#061429] to-[#153f5d]",
      image: "/Game_Mode/pixel_protocole.png",
    },
    {
      title: "Pixel Invasion",
      desc: "Shooter arcade Tetroverse avec scrap grid et boss Apex.",
      path: "/pixel-invasion",
      accent: "from-[#081425] to-[#173d63]",
      image: "/Game_Mode/pixel_invasion.png",
    },
  ];

  useEffect(() => {
    if (tab !== "scores") return;
    setLoading(true);

    async function fetchScores() {
      try {
        const data = await getMyScores("PIXEL_INVASION");
        const sorted = data.sort((a: UserScore, b: UserScore) => b.value - a.value);
        setScores(sorted.slice(0, 10));
      } catch (err) {
        console.error("Erreur de chargement des scores Pixel Invasion:", err);
      } finally {
        setLoading(false);
      }
    }

    void fetchScores();
  }, [tab]);

  return (
    <div className="dashboard-mode-shell dashboard-mode-shell--tetroverse min-h-screen text-pink-300 font-['Press_Start_2P'] py-10 px-10">
      <div className="dashboard-mode-head">
        <div>
          <p className="dashboard-mode-eyebrow">Hub narratif</p>
          <h1 className="dashboard-mode-title">Tetro-Verse</h1>
          <p className="dashboard-mode-subtitle">
            Entre dans la zone Tetro-Verse: exploration, plateformes et invasion des Tetrobots.
          </p>
        </div>
        <button
          type="button"
          className="dashboard-mode-back"
          onClick={() => navigate("/dashboard")}
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
                ? "bg-cyan-500 border-cyan-200 text-slate-950"
                : "bg-black/40 border-cyan-700 text-cyan-200"
            }`}
          >
            {item === "modes" ? "Modes Tetro-Verse" : "Scores Pixel Invasion"}
          </button>
        ))}
      </div>

      {tab === "modes" && (
        <div className="mode-card-grid mode-card-grid--tetris-hub">
          {tetroVerseModes.map((modeCard) => (
            <button
              key={modeCard.title}
              onClick={() => navigate(modeCard.path)}
              className={`mode-card mode-card--tetroverse bg-gradient-to-b ${modeCard.accent}`}
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
          {loading ? (
            <p className="text-cyan-200 mt-6 text-center">Chargement des scores...</p>
          ) : scores.length === 0 ? (
            <p className="text-slate-300 mt-6 text-center">
              Aucun score Pixel Invasion enregistre.
            </p>
          ) : (
            <div className="mt-2 w-full max-w-4xl mx-auto">
              <h2 className="text-2xl text-cyan-200 mb-4 text-center">
                Tes 10 meilleurs scores - Pixel Invasion
              </h2>
              <table className="w-full border border-cyan-400 rounded-lg bg-black/60 text-center bg-gradient-to-b from-[#04101d] to-[#0d2540] shadow-[0_0_24px_rgba(64,220,255,0.28)]">
                <thead>
                  <tr className="text-cyan-200 border-b border-cyan-500">
                    <th className="py-2">#</th>
                    <th>Score</th>
                    <th>Vague</th>
                    <th>Lignes</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((s, i) => (
                    <tr
                      key={s.id}
                      className="hover:bg-cyan-900/20 transition border-b border-cyan-900/70"
                    >
                      <td className="py-2 text-cyan-300">{i + 1}</td>
                      <td className="text-white font-bold">{s.value}</td>
                      <td className="text-white">{s.level}</td>
                      <td className="text-cyan-100">{s.lines}</td>
                      <td className="text-xs text-slate-300">
                        {new Date(s.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
