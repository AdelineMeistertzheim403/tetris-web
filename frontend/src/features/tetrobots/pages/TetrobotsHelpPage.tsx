import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import {
  BOT_LEVEL_XP_BANDS,
  MOOD_AFFINITY_BANDS,
} from "../../achievements/lib/tetrobotProgressionLogic";
import {
  getActiveApexChallenge,
  getApexChallengeActionLabel,
  getApexChallengeActionTarget,
} from "../logic/apexTrustEngine";
import TetrobotsSectionNav from "../components/TetrobotsSectionNav";
import "../../../styles/tetrobots.css";

const HELP_UI_STORAGE_KEY = "tetrobots-help-ui-v1";
const HELP_SECTION_IDS = [
  "system",
  "xp",
  "affinity",
  "mood",
  "memory",
  "apex",
] as const;

type HelpSectionId = (typeof HELP_SECTION_IDS)[number];
type HelpSectionState = Record<HelpSectionId, boolean>;

const HELP_SECTION_ICONS: Record<HelpSectionId, string> = {
  system: "fa-microchip",
  xp: "fa-star",
  affinity: "fa-heart",
  mood: "fa-face-smile",
  memory: "fa-brain",
  apex: "fa-triangle-exclamation",
};

const HELP_SECTION_TITLES: Record<HelpSectionId, string> = {
  system: "Fonctionnement general",
  xp: "Gagner de l'XP",
  affinity: "Faire monter ou baisser l'affinite",
  mood: "Comprendre les humeurs",
  memory: "Memoire long terme",
  apex: "Refus d'Apex et defis",
};

const XP_RULES = [
  {
    bot: "Rookie",
    gain: [
      "jouer regulierement",
      "revenir apres des echecs",
      "faire des sessions utiles meme courtes",
    ],
  },
  {
    bot: "Pulse",
    gain: [
      "ameliorer des stats mesurables",
      "gagner plus souvent",
      "corriger des erreurs identifiees",
    ],
  },
  {
    bot: "Apex",
    gain: [
      "tester des modes exigeants",
      "travailler ton mode faible",
      "assumer des choix difficiles au lieu du confort",
    ],
  },
];

const AFFINITY_RULES = [
  {
    bot: "Rookie",
    positive: ["regularite", "perseverance", "retour apres echec"],
    negative: ["abandon rapide", "rage quit", "session sans intention"],
  },
  {
    bot: "Pulse",
    positive: ["progression visible", "correction methodique", "lecture des patterns"],
    negative: ["repetition des memes erreurs", "jeu brouillon", "absence d'analyse"],
  },
  {
    bot: "Apex",
    positive: ["travail du point faible", "courage", "discipline"],
    negative: ["zone de confort", "esquive du mode faible", "fuite du challenge"],
  },
];

const APEX_STATES = [
  { state: "open", trigger: "aucune alerte forte detectee" },
  { state: "warning", trigger: "3 rage quit ou plus en memoire long terme" },
  { state: "cold", trigger: "evasion repetitive de Roguelike ou Puzzle" },
  { state: "refusing", trigger: "affinite Apex strictement sous -60" },
] as const;

function defaultHelpSectionState(): HelpSectionState {
  return Object.fromEntries(HELP_SECTION_IDS.map((id) => [id, id === "system"])) as HelpSectionState;
}

function readHelpSectionState(): HelpSectionState {
  if (typeof window === "undefined") return defaultHelpSectionState();
  try {
    const raw = window.localStorage.getItem(HELP_UI_STORAGE_KEY);
    if (!raw) return defaultHelpSectionState();
    const parsed = JSON.parse(raw) as Partial<HelpSectionState>;
    const defaults = defaultHelpSectionState();
    return Object.fromEntries(
      HELP_SECTION_IDS.map((id) => [id, parsed[id] ?? defaults[id]])
    ) as HelpSectionState;
  } catch {
    return defaultHelpSectionState();
  }
}

function HelpSection({
  id,
  open,
  onToggle,
  children,
}: {
  id: HelpSectionId;
  open: boolean;
  onToggle: (id: HelpSectionId) => void;
  children: ReactNode;
}) {
  return (
    <details id={`help-${id}`} className="tetrobots-help-card" open={open}>
      <summary
        onClick={(event) => {
          event.preventDefault();
          onToggle(id);
        }}
      >
        <span className="tetrobots-help-card__summary-label">
          <i className={`fa-solid ${HELP_SECTION_ICONS[id]}`} aria-hidden="true" />
          {HELP_SECTION_TITLES[id]}
        </span>
        <i
          className={`fa-solid ${open ? "fa-chevron-up" : "fa-chevron-down"}`}
          aria-hidden="true"
        />
      </summary>
      {open ? <div className="tetrobots-help-card__body">{children}</div> : null}
    </details>
  );
}

export default function TetrobotsHelpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stats, recordTetrobotEvent, acceptActiveTetrobotChallenge } = useAchievements();
  const challenge = getActiveApexChallenge(stats.activeTetrobotChallenge);
  const challengeActionLabel = getApexChallengeActionLabel(challenge);
  const challengeActionTarget = getApexChallengeActionTarget(challenge);
  const [sections, setSections] = useState<HelpSectionState>(() => readHelpSectionState());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(HELP_UI_STORAGE_KEY, JSON.stringify(sections));
  }, [sections]);

  useEffect(() => {
    const hash = location.hash.replace(/^#/, "");
    if (!hash) return;
    const targetId = HELP_SECTION_IDS.find((id) => id === hash || `help-${id}` === hash);
    if (!targetId) return;
    setSections((current) => ({ ...current, [targetId]: true }));
    const timer = window.setTimeout(() => {
      document.getElementById(`help-${targetId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  const toggleSection = (id: HelpSectionId) => {
    setSections((current) => {
      const nextOpen = !current[id];
      if (nextOpen) {
        const bot =
          id === "apex" ? "apex" : id === "memory" ? "pulse" : "rookie";
        recordTetrobotEvent({ type: "tip_read", bot });
      }
      if (typeof window !== "undefined") {
        const nextHash = nextOpen ? `#${id}` : "";
        window.history.replaceState(null, "", `${location.pathname}${nextHash}`);
      }
      return { ...current, [id]: nextOpen };
    });
  };

  const setAllSections = (open: boolean) => {
    setSections(
      Object.fromEntries(HELP_SECTION_IDS.map((id) => [id, open])) as HelpSectionState
    );
  };

  const handleChallengeAction = () => {
    if (!challengeActionTarget) return;
    if (challenge?.status === "offered") {
      acceptActiveTetrobotChallenge();
    }
    navigate(challengeActionTarget);
  };

  return (
    <main className="tetrobots-page">
      <header className="tetrobots-hero">
        <p className="tetrobots-kicker">AIDE</p>
        <h1>GUIDE DES TETROBOTS</h1>
        <p>
          Comprends comment les Tetrobots evoluent, ce qui leur fait gagner de l&apos;XP,
          comment leur affinite change, et pourquoi Apex peut parfois te couper le canal.
        </p>
      </header>

      <TetrobotsSectionNav isLoggedIn={Boolean(user)} />

      <section className="tetrobots-help">
        <div className="tetrobots-help__toolbar">
          <p className="tetrobots-kicker">RUBRIQUES</p>
          <div className="tetrobots-help__toolbar-actions">
            <button
              type="button"
              className="tetrobots-help__icon-btn"
              title="Tout ouvrir"
              aria-label="Tout ouvrir"
              onClick={() => setAllSections(true)}
            >
              <i className="fa-solid fa-angles-down" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="tetrobots-help__icon-btn"
              title="Tout fermer"
              aria-label="Tout fermer"
              onClick={() => setAllSections(false)}
            >
              <i className="fa-solid fa-angles-up" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="tetrobots-help__quick-links" aria-label="Acces rapides">
          {HELP_SECTION_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`tetrobots-help__quick-link ${sections[id] ? "is-active" : ""}`}
              onClick={() => {
                setSections((current) => ({ ...current, [id]: true }));
                if (typeof window !== "undefined") {
                  window.history.replaceState(null, "", `${location.pathname}#${id}`);
                }
                window.setTimeout(() => {
                  document.getElementById(`help-${id}`)?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }, 50);
              }}
            >
              <i className={`fa-solid ${HELP_SECTION_ICONS[id]}`} aria-hidden="true" />
              <span>{HELP_SECTION_TITLES[id]}</span>
            </button>
          ))}
        </div>

        <HelpSection id="system" open={sections.system} onToggle={toggleSection}>
          <p className="tetrobots-kicker">SYSTEME</p>
          <ul>
            <li>Chaque bot a un niveau, de l&apos;XP, une affinite et une humeur.</li>
            <li>Leur progression suit tes vraies habitudes de jeu, pas seulement ta derniere partie.</li>
            <li>Ils memorisent des erreurs recurrentes, des retours apres echec et des comportements d&apos;evitement.</li>
            <li>Le dashboard et le centre de liaison affichent ensuite leurs reactions, conseils et souvenirs.</li>
          </ul>
          <div className="tetrobots-help__matrix">
            <div className="tetrobots-help__rule">
              <h3>Seuils de niveau</h3>
              <ul>
                {BOT_LEVEL_XP_BANDS.map((band) => (
                  <li key={band.level}>
                    niveau {band.level}: {band.minXp} XP
                    {band.maxXpExclusive === null ? " et plus" : ` a ${band.maxXpExclusive - 1} XP`}
                  </li>
                ))}
              </ul>
            </div>
            <div className="tetrobots-help__rule">
              <h3>Traits debloques</h3>
              <ul>
                <li>Rookie: niveau 2 `contextualTips`, niveau 4 `errorDetection`</li>
                <li>Pulse: niveau 3 `performanceAnalysis`, niveau 5 `deepOptimization`</li>
                <li>Apex: niveau 2 `provocation`, niveau 5 `hardcoreCoach`</li>
              </ul>
            </div>
          </div>
        </HelpSection>

        <HelpSection id="xp" open={sections.xp} onToggle={toggleSection}>
          <p className="tetrobots-kicker">XP</p>
          {XP_RULES.map((rule) => (
            <div key={rule.bot} className="tetrobots-help__rule">
              <h3>{rule.bot}</h3>
              <ul>
                {rule.gain.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </HelpSection>

        <HelpSection id="affinity" open={sections.affinity} onToggle={toggleSection}>
          <p className="tetrobots-kicker">AFFINITE</p>
          <p>
            L&apos;affinite est bornee entre `-100` et `100`. Chaque bot reagit a des evenements
            differents, avec des gains et pertes fixes.
          </p>
          {AFFINITY_RULES.map((rule) => (
            <div key={rule.bot} className="tetrobots-help__rule">
              <h3>{rule.bot}</h3>
              <p>Fait gagner:</p>
              <ul>
                {rule.positive.map((item) => (
                  <li key={`${rule.bot}-pos-${item}`}>{item}</li>
                ))}
              </ul>
              <p>Fait perdre:</p>
              <ul>
                {rule.negative.map((item) => (
                  <li key={`${rule.bot}-neg-${item}`}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
          <div className="tetrobots-help__rule">
            <h3>Valeurs appliquees</h3>
            <ul>
              <li>Rookie: `play_regularly` `+5`, `rage_quit` `-10`</li>
              <li>Pulse: `improve_stat` `+10`, `repeat_mistake` `-5`</li>
              <li>Apex: `challenge_yourself` `+15`, `avoid_weakness` `-15`</li>
            </ul>
          </div>
        </HelpSection>

        <HelpSection id="mood" open={sections.mood} onToggle={toggleSection}>
          <p className="tetrobots-kicker">HUMEUR</p>
          <div className="tetrobots-help__matrix">
            <div className="tetrobots-help__rule">
              <h3>Seuils d&apos;humeur</h3>
              <ul>
                {MOOD_AFFINITY_BANDS.map((band) => (
                  <li key={band.mood}>
                    `{band.mood}`: {band.minAffinity}
                    {band.maxAffinityExclusive === null
                      ? " et plus"
                      : ` a ${band.maxAffinityExclusive - 1}`}{" "}
                    d&apos;affinite
                  </li>
                ))}
              </ul>
            </div>
            <div className="tetrobots-help__rule">
              <h3>Lecture rapide</h3>
              <ul>
                <li>`angry`: le bot est agace, plus sec, parfois plus dur.</li>
                <li>`neutral`: il observe encore ou reste prudent.</li>
                <li>`friendly`: il commence a soutenir et guider plus clairement.</li>
                <li>`respect`: tu as gagne une vraie forme de confiance.</li>
              </ul>
            </div>
          </div>
        </HelpSection>

        <HelpSection id="memory" open={sections.memory} onToggle={toggleSection}>
          <p className="tetrobots-kicker">MEMOIRE</p>
          <ul>
            <li>tes erreurs qui reviennent souvent</li>
            <li>les modes que tu evites trop longtemps</li>
            <li>tes progressions nettes et tes come-backs</li>
            <li>tes sessions courageuses ou au contraire tes fuites</li>
          </ul>
          <div className="tetrobots-help__matrix">
            <div className="tetrobots-help__rule">
              <h3>Consistance</h3>
              <p>
                Elle mesure ta stabilite globale. Pulse s&apos;en sert pour distinguer une vraie
                progression d&apos;une simple bonne run.
              </p>
              <ul>
                <li>base: taux de victoire global</li>
                <li>penalite: toutes les erreurs agregees</li>
                <li>formule: `winrate * 100 - totalMistakes * 1.5`, borne entre `0` et `100`</li>
              </ul>
            </div>
            <div className="tetrobots-help__rule">
              <h3>Courage</h3>
              <p>
                Il mesure ta part de sessions dans les modes les plus exigeants. Apex y est tres
                sensible.
              </p>
              <ul>
                <li>modes comptes: `ROGUELIKE`, `ROGUELIKE_VERSUS`, `PUZZLE`</li>
                <li>plus leur part monte, plus le score monte</li>
                <li>formule: `(sessions exigeantes / sessions totales) * 100`, borne entre `0` et `100`</li>
              </ul>
            </div>
            <div className="tetrobots-help__rule">
              <h3>Discipline</h3>
              <p>
                C&apos;est un score de fiabilite long terme. Il resume si tu progresses proprement,
                sans te disperser ni repeter trop d&apos;erreurs.
              </p>
              <ul>
                <li>`45%` consistance</li>
                <li>`25%` courage</li>
                <li>`30%` resistance a la repetition des erreurs</li>
                <li>
                  formule: `consistance * 0.45 + courage * 0.25 + (100 - repeat_mistake_delta * 10) * 0.3`
                </li>
              </ul>
            </div>
          </div>
        </HelpSection>

        <HelpSection id="apex" open={sections.apex} onToggle={toggleSection}>
          <div className="tetrobots-help__apex-block">
            <p className="tetrobots-kicker">APEX</p>
            <ul>
              <li>si ton affinite avec lui tombe trop bas</li>
              <li>si tu evites trop longtemps ton mode faible</li>
              <li>si tu quittes les sessions avant d&apos;affronter la vraie contrainte</li>
            </ul>
            <p>
              Quand ca arrive, Apex peut proposer un defi temporaire. Si tu l&apos;acceptes et que tu
              le completes sans fuir, tu recuperes de l&apos;affinite, de l&apos;XP et il peut rouvrir le canal.
            </p>
            <div className="tetrobots-help__rule">
              <h3>Etats du canal Apex</h3>
              <ul>
                {APEX_STATES.map((item) => (
                  <li key={item.state}>
                    `{item.state}`: {item.trigger}
                  </li>
                ))}
              </ul>
            </div>
            {challenge ? (
              <div className="tetrobots-help__challenge">
                <h3>Defi actif detecte</h3>
                <p>{challenge.title}</p>
                <p>{challenge.description}</p>
                <p>
                  Etat: {challenge.status} · progression {challenge.progress}/{challenge.targetCount}
                </p>
                {challengeActionLabel && challengeActionTarget ? (
                  <button
                    type="button"
                    className="tetrobots-help-link"
                    onClick={handleChallengeAction}
                  >
                    {challengeActionLabel}
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="tetrobots-help__challenge">
                <h3>Defi temporaire</h3>
                <p>
                  Aucun defi actif pour l&apos;instant. Si Apex verrouille le canal, surveille le dashboard:
                  une mini scene peut proposer d&apos;accepter son epreuve.
                </p>
              </div>
            )}
          </div>
        </HelpSection>
      </section>
    </main>
  );
}
