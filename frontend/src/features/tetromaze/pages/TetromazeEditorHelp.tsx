import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PATHS } from "../../../routes/paths";
import "../../../styles/pixel-protocol-editor.css";
import "../../../styles/pixel-protocol-editor-help.css";
import "../../../styles/tetromaze-editor-help.css";

const HELP_UI_STORAGE_KEY = "tetromaze-editor-help-ui-v2";
const HELP_SECTION_IDS = [
  "flow",
  "tools",
  "behaviors",
  "hub",
  "troubleshooting",
] as const;

type HelpSectionId = (typeof HELP_SECTION_IDS)[number];
type HelpSectionState = Record<HelpSectionId, boolean>;

const HELP_SECTION_ICONS: Record<HelpSectionId, string> = {
  flow: "fa-route",
  tools: "fa-toolbox",
  behaviors: "fa-robot",
  hub: "fa-compass",
  troubleshooting: "fa-screwdriver-wrench",
};

const HELP_SECTION_TITLES: Record<HelpSectionId, string> = {
  flow: "Flux conseille",
  tools: "Outils de la barre",
  behaviors: "Comportements utiles",
  hub: "Hub et galerie joueurs",
  troubleshooting: "Depannage rapide",
};

const HELP_SECTION_KEYWORDS: Record<HelpSectionId, string[]> = {
  flow: ["murs", "spawn", "maison", "power-up", "jouer", "publier"],
  tools: ["tetromino", "gomme", "spawn", "power-up", "teleporteur"],
  behaviors: ["survol", "bordures", "tetrobots", "import", "export", "publication"],
  hub: ["hub", "galerie", "joueurs", "likes", "publie"],
  troubleshooting: ["spawn", "bots", "teleporter", "publier", "niveau"],
};

const HELP_QUICK_LINKS: HelpSectionId[] = ["flow", "tools", "hub"];

function defaultHelpSectionState(): HelpSectionState {
  return Object.fromEntries(HELP_SECTION_IDS.map((id) => [id, false])) as HelpSectionState;
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

type HelpSectionProps = {
  id: HelpSectionId;
  title: string;
  open: boolean;
  highlighted?: boolean;
  onToggle: (id: HelpSectionId) => void;
  children: ReactNode;
};

function HelpSection({ id, title, open, highlighted = false, onToggle, children }: HelpSectionProps) {
  return (
    <details
      id={`help-${id}`}
      className={`panel pp-editor-help-card ${highlighted ? "is-highlighted" : ""}`}
      open={open}
    >
      <summary
        onClick={(event) => {
          event.preventDefault();
          onToggle(id);
        }}
      >
        <span className="pp-editor-help-card__summary-label">
          <i className={`fa-solid ${HELP_SECTION_ICONS[id]}`} aria-hidden="true" />
          {title}
        </span>
        <i
          className={`fa-solid ${open ? "fa-chevron-up" : "fa-chevron-down"}`}
          aria-hidden="true"
        />
      </summary>
      {open && <div className="pp-editor-help-card__body">{children}</div>}
    </details>
  );
}

export default function TetromazeEditorHelp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sections, setSections] = useState<HelpSectionState>(() => readHelpSectionState());
  const [search, setSearch] = useState("");

  const matchingSections = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return new Set<HelpSectionId>();
    return new Set(
      HELP_SECTION_IDS.filter((id) => {
        const haystack = `${HELP_SECTION_TITLES[id]} ${HELP_SECTION_KEYWORDS[id].join(" ")}`
          .toLowerCase();
        return haystack.includes(query);
      })
    );
  }, [search]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(HELP_UI_STORAGE_KEY, JSON.stringify(sections));
  }, [sections]);

  useEffect(() => {
    if (!search.trim()) return;
    setSections((current) => {
      const next = { ...current };
      for (const id of HELP_SECTION_IDS) {
        next[id] = matchingSections.has(id);
      }
      return next;
    });
  }, [search, matchingSections]);

  useEffect(() => {
    const hash = location.hash.replace(/^#/, "");
    if (!hash) return;
    const targetId = HELP_SECTION_IDS.find((id) => id === hash || `help-${id}` === hash);
    if (!targetId) return;
    setSections((current) => ({
      ...current,
      [targetId]: true,
    }));
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
      if (typeof window !== "undefined") {
        const nextHash = nextOpen ? `#${id}` : "";
        window.history.replaceState(null, "", `${location.pathname}${nextHash}`);
      }
      return {
        ...current,
        [id]: nextOpen,
      };
    });
  };

  const setAllSections = (open: boolean) => {
    setSections(
      Object.fromEntries(HELP_SECTION_IDS.map((id) => [id, open])) as HelpSectionState
    );
  };

  return (
    <div className="pp-editor-help tetromaze-editor-help font-['Press_Start_2P']">
      <div className="pp-editor-help-shell">
        <div className="pp-editor-help-head">
          <h1>Aide - Editeur Tetromaze</h1>
          <div className="pp-editor-help-head__actions">
            <button
              type="button"
              className="pp-editor-icon-btn pp-editor-icon-btn--info"
              title="Tout ouvrir"
              aria-label="Tout ouvrir"
              onClick={() => setAllSections(true)}
            >
              <i className="fa-solid fa-angles-down" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="pp-editor-icon-btn pp-editor-icon-btn--info"
              title="Tout fermer"
              aria-label="Tout fermer"
              onClick={() => setAllSections(false)}
            >
              <i className="fa-solid fa-angles-up" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="pp-editor-icon-btn"
              title="Retour hub"
              aria-label="Retour hub"
              onClick={() => navigate(PATHS.tetromazeHub)}
            >
              <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="pp-editor-help-search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une section"
            aria-label="Rechercher une section d'aide"
          />
          {search.trim() && (
            <span className="pp-editor-help-search__count">
              {matchingSections.size} section{matchingSections.size > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="pp-editor-help-quick-links" aria-label="Acces rapides">
          {HELP_QUICK_LINKS.map((id) => (
            <button
              key={id}
              type="button"
              className={`pp-editor-help-quick-link ${sections[id] ? "is-active" : ""}`}
              onClick={() => {
                setSections((current) => ({
                  ...current,
                  [id]: true,
                }));
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

        <HelpSection
          id="flow"
          title={HELP_SECTION_TITLES.flow}
          open={sections.flow}
          highlighted={matchingSections.has("flow")}
          onToggle={toggleSection}
        >
          <ol>
            <li>Commence par dessiner les murs avec l'outil <strong>Tetromino</strong>.</li>
            <li>Place le spawn joueur puis la maison des tetrobots.</li>
            <li>Configure le nombre de Rookie, Pulse et Apex, puis applique.</li>
            <li>Ajoute les power-ups et les teleporteurs.</li>
            <li>Sauve le niveau puis lance-le avec <strong>Jouer ce niveau</strong>.</li>
            <li>Quand tu as termine le niveau en jeu, publie-le dans la galerie joueurs si tu veux le partager.</li>
          </ol>
        </HelpSection>

        <HelpSection
          id="tools"
          title={HELP_SECTION_TITLES.tools}
          open={sections.tools}
          highlighted={matchingSections.has("tools")}
          onToggle={toggleSection}
        >
          <ul>
            <li><strong>Tetromino murs</strong>: place des murs selon la piece et la rotation.</li>
            <li><strong>Gomme sol</strong>: remet une case en couloir.</li>
            <li><strong>Spawn joueur</strong>: position de depart du joueur.</li>
            <li><strong>Maison tetrobots</strong>: place la zone de spawn des bots.</li>
            <li><strong>Power-up</strong>: pose le power-up selectionne sur la case.</li>
            <li><strong>Teleporteur</strong>: configure une paire A/B, jusqu'a trois paires.</li>
          </ul>
        </HelpSection>

        <HelpSection
          id="behaviors"
          title={HELP_SECTION_TITLES.behaviors}
          open={sections.behaviors}
          highlighted={matchingSections.has("behaviors")}
          onToggle={toggleSection}
        >
          <ul>
            <li>Le survol sur la grille previsualise les cases qui seront modifiees.</li>
            <li>Les bordures exterieures restent toujours des murs.</li>
            <li>Le compteur de tetrobots respecte la limite globale de 12.</li>
            <li>Import et Export JSON permettent de partager et versionner tes niveaux.</li>
            <li>La publication communautaire demande une connexion et un clear valide de la version courante du niveau.</li>
          </ul>
        </HelpSection>

        <HelpSection
          id="hub"
          title={HELP_SECTION_TITLES.hub}
          open={sections.hub}
          highlighted={matchingSections.has("hub")}
          onToggle={toggleSection}
        >
          <ul>
            <li>Le hub Tetromaze reprend maintenant la meme logique que Pixel Protocol avec campagne, custom, galerie joueurs et acces rapide a l'editeur.</li>
            <li>Un niveau publie apparait dans <strong>Niveaux joueurs</strong> et peut etre relance directement depuis le hub ou la galerie.</li>
            <li>Les autres joueurs peuvent liker ton niveau depuis la galerie communautaire ou apres l'avoir termine.</li>
            <li>L'editeur affiche aussi si le niveau courant est deja publie et combien de likes il a recus.</li>
          </ul>
        </HelpSection>

        <HelpSection
          id="troubleshooting"
          title={HELP_SECTION_TITLES.troubleshooting}
          open={sections.troubleshooting}
          highlighted={matchingSections.has("troubleshooting")}
          onToggle={toggleSection}
        >
          <ul>
            <li>Si un niveau ne se lance pas, verifie qu'il contient un spawn joueur valide.</li>
            <li>Si les bots semblent mal places, repositionne la maison puis reapplique les tetrobots.</li>
            <li>Si un teleporter ne marche pas, verifie que les deux extremites A et B existent.</li>
            <li>Si <strong>Publier</strong> reste indisponible, joue et termine d'abord cette version exacte du niveau.</li>
          </ul>
        </HelpSection>
      </div>
    </div>
  );
}
