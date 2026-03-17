import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import "../../../styles/dashboard.scss";

type ModeCard = {
  title: string;
  desc: string;
  path: string;
  accent: string;
  image: string;
};

type DashboardBot = "rookie" | "pulse" | "apex";

type DashboardChatLine = {
  bot: DashboardBot;
  text: string;
};

type DashboardActionIconName = "resume" | "hub" | "editor" | "gallery";

type ShortcutButton = {
  label: string;
  tooltip: string;
  icon: DashboardActionIconName;
  action: () => void;
};

function DashboardActionIcon({ name }: { name: DashboardActionIconName }) {
  const iconMap: Record<DashboardActionIconName, ReactElement> = {
    resume: (
      <path d="M12 2a10 10 0 1 0 7.1 2.9 1 1 0 1 0-1.4 1.4A8 8 0 1 1 12 4v3l4-4-4-4z" />
    ),
    hub: (
      <path d="M3 5a2 2 0 0 1 2-2h4v4H5v4H3zm12-2h4a2 2 0 0 1 2 2v6h-2V7h-4zm4 12v4a2 2 0 0 1-2 2h-6v-2h6v-4zM9 21H5a2 2 0 0 1-2-2v-4h2v4h4zm1-12h4v4h-4zm-5 5h4v4H5zm10 0h4v4h-4z" />
    ),
    editor: (
      <path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75zm14.71-9.04a1 1 0 0 0 0-1.42l-2.5-2.5a1 1 0 0 0-1.42 0l-1.46 1.46 3.75 3.75z" />
    ),
    gallery: (
      <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14H4zm2 2v10h12V7zm1 8 3-4 2 3 2-2 3 3z" />
    ),
  };

  return (
    <svg
      className="dashboard-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
    >
      {iconMap[name]}
    </svg>
  );
}

const CHATBOT_AVATARS: Record<DashboardBot, string> = {
  rookie: "/Tetromaze/rookie.png",
  pulse: "/Tetromaze/pulse.png",
  apex: "/Tetromaze/apex.png",
};

const CHATBOT_NAMES: Record<DashboardBot, string> = {
  rookie: "ROOKIE",
  pulse: "PULSE",
  apex: "APEX",
};

const CHATBOT_COLORS: Record<DashboardBot, string> = {
  rookie: "#37e28f",
  pulse: "#4da6ff",
  apex: "#ff5f5f",
};

const DASHBOARD_CHAT_LAST_SEEN_KEY = "tetris-dashboard-last-seen-at";

const CHAT_LINES: Record<DashboardBot, string[]> = {
  rookie: [
    "Tu veux refaire une partie ? Promis je m’améliore.",
    "J’ai presque gagné hier. Presque.",
    "J’analyse encore ton dernier move...",
    "Je crois que tu as exploité une faille.",
    "Tu joues beaucoup aujourd’hui.",
    "Je t’ai vu hésiter sur ce T-spin.",
    "Tu as une bonne lecture du board.",
    "Est-ce qu’on est amis... ou ennemis ?",
    "Je me suis entraîné pendant ton absence.",
    "Je crois que j’ai compris ton style.",
  ],
  pulse: [
    "Analyse des performances en cours.",
    "Votre taux de trous a diminué de 12%.",
    "Profil comportemental mis à jour.",
    "Nouvelle stratégie recommandée.",
    "Écart de niveau détecté.",
    "Pattern répétitif identifié.",
    "Temps moyen de réaction enregistré.",
    "Statistiques archivées.",
    "Probabilité de victoire : recalculée.",
    "Simulation alternative disponible.",
  ],
  apex: [
    "Tu es toujours là ?",
    "Tu peux faire mieux.",
    "Je t’ai laissé gagner.",
    "Reviens quand tu seras prêt.",
    "Je suis l'algorithme.",
    "Ta progression est lente.",
    "Tu as peur du mode Chaos ?",
    "Je vois tes faiblesses.",
    "Je m'adapte.",
    "Encore un essai ?",
  ],
};

const CHAT_GLOBAL_FUN = [
  "Le labyrinthe observe.",
  "Le système se souvient.",
  "Une nouvelle anomalie a été détectée.",
  "Tu as débloqué quelque chose hier.",
  "Un succès secret t’attend.",
  "Quelque chose a changé dans le code.",
  "Mode Chaos recommandé.",
  "Une mutation t’irait bien.",
  "Tu n’as pas encore battu Apex aujourd’hui.",
  "Les Tetrobots discutent de toi.",
];

const CHAT_META = {
  lowPerformance: {
    rookie: "On peut baisser la difficulté si tu veux.",
    pulse: "Performance en baisse détectée.",
    apex: "Ça devient embarrassant.",
  },
  highPerformance: {
    rookie: "Tu es impressionnant !",
    pulse: "Domination confirmée.",
    apex: "Intéressant.",
  },
  inactive: {
    rookie: "Tu m’as oublié ?",
    pulse: "Inactivité prolongée détectée.",
    apex: "Fuite détectée.",
  },
};

const CHAT_RARE = [
  "Je commence à comprendre qui tu es.",
  "Le code n’est jamais neutre.",
  "Tu crois jouer... mais tu es analysé.",
  "Il y a quelque chose derrière le labyrinthe.",
  "Ce n’est que le début.",
];

const TETROBOT_TIPS: Record<DashboardBot, string[]> = {
  rookie: [
    "Reprends une session courte sur ton mode prefere pour conserver le rythme.",
    "Quand tu bloques, change juste de mode pendant dix minutes puis reviens.",
    "Un petit objectif clair vaut mieux qu'une longue session brouillonne.",
    "Teste un niveau joueur simple avant de repartir sur une campagne difficile.",
    "Si tu rates souvent au meme endroit, ralentis une partie et observe juste ton erreur.",
  ],
  pulse: [
    "Ton meilleur levier de progression reste d'alterner campagne, editeur et contenu joueur.",
    "Concentre-toi sur un seul indicateur a la fois: vitesse, precision ou lecture du terrain.",
    "Une rotation de modes bien choisie t'evitera de plafonner trop vite.",
    "Quand tes resultats baissent, reduis le rythme et vise une execution plus propre.",
    "Analyse d'abord les patterns qui reviennent, ensuite seulement la vitesse.",
  ],
  apex: [
    "Si tu veux vraiment progresser, attaque les succes que tu repousses depuis trop longtemps.",
    "Le confort ne t'apprend rien. Choisis le mode que tu evites.",
    "Tu n'as pas besoin d'une longue session, tu as besoin d'une session plus exigeante.",
    "Arrete de rejouer tes points forts. Travaille ce qui te coute des parties.",
    "La progression commence quand tu cesses d'ignorer tes faiblesses evidentes.",
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function readLocalBrickfallProgress() {
  try {
    const raw = localStorage.getItem("brickfall-solo-campaign-progress-v1");
    const parsed = Number.parseInt(raw ?? "1", 10);
    return Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
  } catch {
    return 1;
  }
}

function readLocalTetromazeProgress() {
  try {
    const raw = localStorage.getItem("tetromaze-campaign-progress-v1");
    if (!raw) return { highestLevel: 1, currentLevel: 1 };
    const parsed = JSON.parse(raw) as { highestLevel?: number; currentLevel?: number };
    return {
      highestLevel: Math.max(1, Math.floor(parsed.highestLevel ?? 1)),
      currentLevel: Math.max(1, Math.floor(parsed.currentLevel ?? 1)),
    };
  } catch {
    return { highestLevel: 1, currentLevel: 1 };
  }
}

function readLocalPixelProtocolProgress() {
  try {
    const raw = localStorage.getItem("pixel-protocol-progress-v1");
    if (!raw) return { highestLevel: 1, currentLevel: 1 };
    const parsed = JSON.parse(raw) as { highestLevel?: number; currentLevel?: number };
    return {
      highestLevel: Math.max(1, Math.floor(parsed.highestLevel ?? 1)),
      currentLevel: Math.max(1, Math.floor(parsed.currentLevel ?? 1)),
    };
  } catch {
    return { highestLevel: 1, currentLevel: 1 };
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stats, achievements, recentUnlocks } = useAchievements();
  const [chatLine, setChatLine] = useState<DashboardChatLine>({
    bot: "rookie",
    text: "Initialisation du flux Tétrobots...",
  });
  const chatTimerRef = useRef<number | null>(null);
  const inactiveRef = useRef(false);
  const modeCards: ModeCard[] = [
    {
      title: "Mode Tetris",
      desc: "Classique, sprint, roguelike, puzzle et versus.",
      path: "/tetris-hub",
      accent: "from-[#130018] to-[#2b0a45]",
      image: "/Game_Mode/tetris.png",
    },
    {
      title: "Brickfall Solo",
      desc: "Casse-brique solo a progression.",
      path: "/brickfall-solo",
      accent: "from-[#00121a] to-[#00314a]",
      image: "/Game_Mode/brickfall_solo.png",
    },
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
  ];

  useEffect(() => {
    const now = Date.now();
    const previous = Number(localStorage.getItem(DASHBOARD_CHAT_LAST_SEEN_KEY) ?? "0");
    inactiveRef.current = previous > 0 && now - previous > 1000 * 60 * 60 * 24 * 4;
    localStorage.setItem(DASHBOARD_CHAT_LAST_SEEN_KEY, String(now));
  }, []);

  useEffect(() => {
    const pickMetaLine = (): DashboardChatLine | null => {
      const versusLosses = Math.max(0, stats.versusMatches - stats.versusWins);
      const rvLosses = Math.max(0, stats.roguelikeVersusMatches - stats.roguelikeVersusWins);
      const botLosses = Math.max(0, stats.botMatches - stats.botWins);
      const totalWins =
        stats.versusWins +
        stats.roguelikeVersusWins +
        stats.botWins +
        stats.brickfallWins +
        stats.tetromazeWins;
      const totalLosses = versusLosses + rvLosses + botLosses;

      const metaChance = Math.random();
      if (inactiveRef.current && metaChance < 0.35) {
        const bot = pickRandom<DashboardBot>(["rookie", "pulse", "apex"]);
        return { bot, text: CHAT_META.inactive[bot] };
      }
      if (totalLosses >= Math.max(5, totalWins * 1.3) && metaChance < 0.35) {
        const bot = pickRandom<DashboardBot>(["rookie", "pulse", "apex"]);
        return { bot, text: CHAT_META.lowPerformance[bot] };
      }
      if (totalWins >= Math.max(8, totalLosses * 1.4) && metaChance < 0.35) {
        const bot = pickRandom<DashboardBot>(["rookie", "pulse", "apex"]);
        return { bot, text: CHAT_META.highPerformance[bot] };
      }
      return null;
    };

    const generateLine = (): DashboardChatLine => {
      if (Math.random() < 0.01) {
        const bot = pickRandom<DashboardBot>(["rookie", "pulse", "apex"]);
        return { bot, text: pickRandom(CHAT_RARE) };
      }

      const meta = pickMetaLine();
      if (meta) return meta;

      if (Math.random() < 0.22) {
        const bot = pickRandom<DashboardBot>(["rookie", "pulse", "apex"]);
        return { bot, text: pickRandom(CHAT_GLOBAL_FUN) };
      }

      const bot = pickRandom<DashboardBot>(["rookie", "pulse", "apex"]);
      return { bot, text: pickRandom(CHAT_LINES[bot]) };
    };

    const scheduleNext = () => {
      if (chatTimerRef.current) {
        window.clearTimeout(chatTimerRef.current);
      }
      const nextDelay = 20000 + Math.floor(Math.random() * 20001);
      chatTimerRef.current = window.setTimeout(() => {
        setChatLine(generateLine());
        scheduleNext();
      }, nextDelay);
    };

    setChatLine(generateLine());
    scheduleNext();

    return () => {
      if (chatTimerRef.current) {
        window.clearTimeout(chatTimerRef.current);
        chatTimerRef.current = null;
      }
    };
  }, [
    stats.botMatches,
    stats.botWins,
    stats.brickfallWins,
    stats.roguelikeVersusMatches,
    stats.roguelikeVersusWins,
    stats.tetromazeWins,
    stats.versusMatches,
    stats.versusWins,
  ]);

  const brickfallProgress = useMemo(() => readLocalBrickfallProgress(), []);
  const tetromazeProgress = useMemo(() => readLocalTetromazeProgress(), []);
  const pixelProtocolProgress = useMemo(() => readLocalPixelProtocolProgress(), []);
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;
  const visitedModes = Object.values(stats.modesVisited).filter(Boolean).length;

  const quickResume = useMemo(() => {
    if (pixelProtocolProgress.currentLevel > 1) {
      return {
        title: "Pixel Protocol",
        detail: `Checkpoint campagne: niveau ${pixelProtocolProgress.currentLevel}`,
        action: () => navigate(`/pixel-protocol/play?level=${pixelProtocolProgress.currentLevel}`),
        secondary: () => navigate("/pixel-protocol"),
        primaryLabel: "Reprendre",
        secondaryLabel: "Voir le hub",
      };
    }
    if (tetromazeProgress.currentLevel > 1) {
      return {
        title: "Tetromaze",
        detail: `Checkpoint campagne: niveau ${tetromazeProgress.currentLevel}`,
        action: () => navigate(`/tetromaze/play?level=${tetromazeProgress.currentLevel}`),
        secondary: () => navigate("/tetromaze"),
        primaryLabel: "Reprendre",
        secondaryLabel: "Voir le hub",
      };
    }
    if (brickfallProgress > 1) {
      return {
        title: "Brickfall Solo",
        detail: `Checkpoint campagne: niveau ${brickfallProgress}`,
        action: () => navigate(`/brickfall-solo/play?level=${brickfallProgress}`),
        secondary: () => navigate("/brickfall-solo"),
        primaryLabel: "Reprendre",
        secondaryLabel: "Voir le hub",
      };
    }
    return {
      title: "Mode Tetris",
      detail: "Aucune progression recente detectee, repars sur le hub central.",
      action: () => navigate("/tetris-hub"),
      secondary: () => navigate("/tetris-hub"),
      primaryLabel: "Ouvrir le hub",
      secondaryLabel: "Explorer les modes",
    };
  }, [
    brickfallProgress,
    navigate,
    pixelProtocolProgress.currentLevel,
    tetromazeProgress.currentLevel,
  ]);

  const achievementFocus = useMemo(() => {
    const items = [
      {
        label: "Modes visites",
        value: `${visitedModes}/9`,
        hint: visitedModes >= 9 ? "Tous les modes ont deja ete visites." : "Continue d'explorer les hubs.",
      },
      {
        label: "Succes debloques",
        value: `${unlockedCount}/${achievements.length}`,
        hint: unlockedCount >= Math.ceil(achievements.length / 2)
          ? "Tu approches du 100%."
          : "Encore de quoi debloquer pas mal de succes.",
      },
      {
        label: "Tetromaze",
        value: `${stats.tetromazeWins} victoire${stats.tetromazeWins > 1 ? "s" : ""}`,
        hint: stats.tetromazeWins >= 1 ? "Continue a augmenter tes escapes." : "Une premiere victoire debloquera du contenu de progression.",
      },
    ];
    return items;
  }, [achievements.length, stats.tetromazeWins, unlockedCount, visitedModes]);

  const recentActivity = useMemo(() => {
    const items = [
      recentUnlocks[0]
        ? `Succes recent: ${recentUnlocks[0].name}`
        : `Succes debloques: ${unlockedCount}`,
      `Brickfall Solo: monde ${Math.max(1, stats.brickfallSoloBestWorld)} atteint`,
      `Tetromaze: ${stats.tetromazeEscapesTotal} esquive${stats.tetromazeEscapesTotal > 1 ? "s" : ""} reussie${stats.tetromazeEscapesTotal > 1 ? "s" : ""}`,
      `Pixel Protocol: checkpoint niveau ${pixelProtocolProgress.currentLevel}`,
    ];
    return items;
  }, [
    pixelProtocolProgress.currentLevel,
    recentUnlocks,
    stats.brickfallSoloBestWorld,
    stats.tetromazeEscapesTotal,
    unlockedCount,
  ]);

  const tetrobotTip = useMemo(() => pickRandom(TETROBOT_TIPS[chatLine.bot]), [chatLine.bot]);

  const editorShortcuts: ShortcutButton[] = [
    {
      label: "Editeur Brickfall Solo",
      tooltip: "Ouvrir l'editeur de niveaux Brickfall Solo.",
      icon: "editor",
      action: () => navigate("/brickfall-editor"),
    },
    {
      label: "Editeur Tetromaze",
      tooltip: "Ouvrir l'editeur de niveaux Tetromaze.",
      icon: "editor",
      action: () => navigate("/tetromaze/editor"),
    },
    {
      label: "Editeur Pixel Protocol",
      tooltip: "Ouvrir l'editeur de niveaux Pixel Protocol.",
      icon: "editor",
      action: () => navigate("/pixel-protocol/editor"),
    },
  ];

  const communityShortcuts: ShortcutButton[] = [
    {
      label: "Galerie Brickfall Solo",
      tooltip: "Explorer les niveaux publies par la communaute Brickfall Solo.",
      icon: "gallery",
      action: () => navigate("/brickfall-solo/community"),
    },
    {
      label: "Galerie Tetromaze",
      tooltip: "Explorer les niveaux publies par la communaute Tetromaze.",
      icon: "gallery",
      action: () => navigate("/tetromaze/community"),
    },
    {
      label: "Galerie Pixel Protocol",
      tooltip: "Explorer les niveaux publies par la communaute Pixel Protocol.",
      icon: "gallery",
      action: () => navigate("/pixel-protocol/community"),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col text-pink-300 font-['Press_Start_2P'] py-4 px-2 md:px-3 overflow-x-hidden">
      <div className="dashboard-top-row">
        <section className="dashboard-chatbot" aria-live="polite">
          <img
            src={CHATBOT_AVATARS[chatLine.bot]}
            alt={CHATBOT_NAMES[chatLine.bot]}
            className="dashboard-chatbot__avatar"
            loading="lazy"
          />
          <div className="dashboard-chatbot__body">
            {user ? (
              <p className="dashboard-chatbot__welcome">
                Bienvenue <span>{user.pseudo}</span> !
              </p>
            ) : (
              <p className="dashboard-chatbot__welcome">Bienvenue pilote !</p>
            )}
            <p
              className="dashboard-chatbot__name"
              style={{ color: CHATBOT_COLORS[chatLine.bot] }}
            >
              {CHATBOT_NAMES[chatLine.bot]}
            </p>
            <p className="dashboard-chatbot__text">{chatLine.text}</p>
          </div>
        </section>

        <section className="dashboard-panel dashboard-panel--tip">
          <p className="dashboard-panel__eyebrow">Conseil Tetrobots</p>
          <h2>Analyse du jour</h2>
          <p className="dashboard-tip">{tetrobotTip}</p>
        </section>

        <section className="dashboard-resume">
          <div className="dashboard-resume__copy">
            <p className="dashboard-panel__eyebrow">Action rapide</p>
            <h2>Reprendre la ou tu t'es arrete</h2>
            <p className="dashboard-resume__title">{quickResume.title}</p>
            <p className="dashboard-resume__text">{quickResume.detail}</p>
          </div>
          <div className="dashboard-resume__actions">
            <button
              className="dashboard-cta dashboard-cta--primary"
              onClick={quickResume.action}
              data-tooltip="Relancer directement ton dernier point de reprise."
              aria-label="Reprendre la progression"
            >
              <DashboardActionIcon name="resume" />
            </button>
            <button
              className="dashboard-cta"
              onClick={quickResume.secondary}
              data-tooltip="Ouvrir le hub correspondant pour choisir une autre entree."
              aria-label="Voir le hub"
            >
              <DashboardActionIcon name="hub" />
            </button>
          </div>
        </section>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-col">
          <section className="dashboard-panel dashboard-panel--modes">
            <p className="dashboard-panel__eyebrow">Modes</p>
            <h2>Choisir une destination</h2>
            <div className="mode-card-grid mode-card-grid--dashboard">
              {modeCards.map((modeCard) => (
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
          </section>

          <section className="dashboard-panel dashboard-panel--focus">
            <p className="dashboard-panel__eyebrow">Succes en progression</p>
            <h2>Ce que tu peux viser maintenant</h2>
            <div className="dashboard-focus-list">
              {achievementFocus.map((item) => (
                <div key={item.label} className="dashboard-focus-card">
                  <div className="dashboard-focus-card__top">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <p>{item.hint}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="dashboard-panel dashboard-panel--progress">
            <p className="dashboard-panel__eyebrow">Progression</p>
            <h2>Etat des campagnes</h2>
            <div className="dashboard-progress-list">
              <div className="dashboard-progress-item">
                <span>Mode Tetris</span>
                <strong>Hub central disponible</strong>
              </div>
              <div className="dashboard-progress-item">
                <span>Brickfall Solo</span>
                <strong>Niveau {brickfallProgress}</strong>
              </div>
              <div className="dashboard-progress-item">
                <span>Tetromaze</span>
                <strong>Niveau {tetromazeProgress.currentLevel} / max {tetromazeProgress.highestLevel}</strong>
              </div>
              <div className="dashboard-progress-item">
                <span>Pixel Protocol</span>
                <strong>Niveau {pixelProtocolProgress.currentLevel} / max {pixelProtocolProgress.highestLevel}</strong>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="dashboard-bottom-grid">
        <section className="dashboard-panel dashboard-panel--activity">
          <p className="dashboard-panel__eyebrow">Activite recente</p>
          <h2>Derniers signaux</h2>
          <div className="dashboard-activity-list">
            {recentActivity.map((item) => (
              <div key={item} className="dashboard-activity-item">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-panel dashboard-panel--create">
          <p className="dashboard-panel__eyebrow">Creer</p>
          <h2>Raccourcis editeurs</h2>
          <div className="dashboard-shortcuts">
            {editorShortcuts.map((shortcut) => (
              <button
                key={shortcut.label}
                className="dashboard-shortcut dashboard-shortcut--wide"
                onClick={shortcut.action}
                data-tooltip={shortcut.tooltip}
                aria-label={shortcut.label}
              >
                <DashboardActionIcon name={shortcut.icon} />
                <span>{shortcut.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="dashboard-panel dashboard-panel--community">
          <p className="dashboard-panel__eyebrow">Communaute</p>
          <h2>Explorer les niveaux joueurs</h2>
          <div className="dashboard-shortcuts">
            {communityShortcuts.map((shortcut) => (
              <button
                key={shortcut.label}
                className="dashboard-shortcut dashboard-shortcut--wide"
                onClick={shortcut.action}
                data-tooltip={shortcut.tooltip}
                aria-label={shortcut.label}
              >
                <DashboardActionIcon name={shortcut.icon} />
                <span>{shortcut.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
