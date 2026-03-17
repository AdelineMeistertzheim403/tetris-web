import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../../styles/pixel-protocol-editor.css";
import "../../../styles/pixel-protocol-editor-help.css";
import "../../../styles/brickfall-editor-help.css";

const HELP_UI_STORAGE_KEY = "brickfall-editor-help-ui-v2";
const HELP_SECTION_IDS = [
  "flow",
  "blocks",
  "actions",
  "hub",
  "troubleshooting",
] as const;

type HelpSectionId = (typeof HELP_SECTION_IDS)[number];
type HelpSectionState = Record<HelpSectionId, boolean>;

const HELP_SECTION_ICONS: Record<HelpSectionId, string> = {
  flow: "fa-route",
  blocks: "fa-cubes",
  actions: "fa-gamepad",
  hub: "fa-compass",
  troubleshooting: "fa-screwdriver-wrench",
};

const HELP_SECTION_TITLES: Record<HelpSectionId, string> = {
  flow: "Flux conseille",
  blocks: "Types de blocs",
  actions: "Actions principales",
  hub: "Hub et galerie joueurs",
  troubleshooting: "Depannage rapide",
};

const HELP_SECTION_KEYWORDS: Record<HelpSectionId, string[]> = {
  flow: ["ordre", "niveau", "jouer", "publier", "json"],
  blocks: ["normal", "armor", "bonus", "malus", "explosive", "cursed", "mirror"],
  actions: ["sauver", "nouveau", "export", "import", "jouer", "publier"],
  hub: ["hub", "galerie", "joueurs", "likes", "publie"],
  troubleshooting: ["erreur", "synchro", "import", "publier", "grise"],
};

const HELP_QUICK_LINKS: HelpSectionId[] = ["flow", "actions", "hub"];

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

export default function BrickfallEditorHelp() {
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
    <div className="pp-editor-help brickfall-editor-help font-['Press_Start_2P']">
      <div className="pp-editor-help-shell">
        <div className="pp-editor-help-head">
          <h1>Aide - Editeur Brickfall</h1>
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
              title="Retour editeur"
              aria-label="Retour editeur"
              onClick={() => navigate("/brickfall-editor")}
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
            <li>Cree un nouveau niveau puis donne-lui un id unique et un nom.</li>
            <li>Choisis un type de bloc, puis clique dans la grille pour placer.</li>
            <li>Utilise le meme type pour recliquer et supprimer une case.</li>
            <li>Teste ton niveau avec <strong>Jouer ce niveau</strong> avant export.</li>
            <li>Une fois le niveau termine en jeu, publie-le dans la galerie joueurs si tu veux le partager.</li>
            <li>Sauvegarde puis exporte en JSON pour partage ou versioning hors galerie.</li>
          </ol>
        </HelpSection>

        <HelpSection
          id="blocks"
          title={HELP_SECTION_TITLES.blocks}
          open={sections.blocks}
          highlighted={matchingSections.has("blocks")}
          onToggle={toggleSection}
        >
          <ul>
            <li><strong>normal</strong>: bloc standard.</li>
            <li><strong>armor</strong>: plus resistant avec 3 HP.</li>
            <li><strong>bonus</strong>: donne un effet positif.</li>
            <li><strong>malus</strong>: applique un effet negatif.</li>
            <li><strong>explosive</strong>: declenche une explosion.</li>
            <li><strong>cursed</strong>: bloc maudit a effet special.</li>
            <li><strong>mirror</strong>: bloc miroir avec rebond specifique.</li>
          </ul>
        </HelpSection>

        <HelpSection
          id="actions"
          title={HELP_SECTION_TITLES.actions}
          open={sections.actions}
          highlighted={matchingSections.has("actions")}
          onToggle={toggleSection}
        >
          <ul>
            <li><strong>Sauver</strong>: enregistre localement et tente la synchro BDD.</li>
            <li><strong>Nouveau</strong>: repart d'une grille vide.</li>
            <li><strong>Export JSON</strong>: telecharge le niveau actif.</li>
            <li><strong>Import JSON</strong>: fusionne des niveaux depuis un fichier.</li>
            <li><strong>Jouer ce niveau</strong>: lance un test direct du niveau actif.</li>
            <li><strong>Publier</strong>: disponible seulement si tu es connecte et que cette version exacte du niveau a deja ete terminee.</li>
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
            <li>Le hub Brickfall Solo reprend maintenant la meme presentation que Pixel Protocol avec campagne, niveaux custom et galerie joueurs.</li>
            <li>Un niveau publie apparait dans <strong>Niveaux joueurs</strong> et peut etre lance par les autres utilisateurs.</li>
            <li>Les autres joueurs peuvent liker ton niveau depuis la galerie ou apres avoir fini une partie dessus.</li>
            <li>Le hub et l'editeur signalent aussi si le niveau custom courant est deja publie.</li>
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
            <li>Si la synchro echoue, le niveau reste sauvegarde en local.</li>
            <li>Si un import echoue, verifie que le JSON respecte bien le format attendu.</li>
            <li>Si un id existe deja, l'import ou la sauvegarde mettra a jour ce niveau.</li>
            <li>Si le bouton <strong>Publier</strong> est grise, termine d'abord le niveau en jeu avec cette version exacte du layout.</li>
          </ul>
        </HelpSection>
      </div>
    </div>
  );
}
