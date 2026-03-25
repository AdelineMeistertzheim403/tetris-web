import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export type EditorHelpSection = {
  id: string;
  title: string;
  icon: string;
  keywords: string[];
  content: ReactNode;
};

type EditorHelpPageProps = {
  title: string;
  storageKey: string;
  sections: readonly EditorHelpSection[];
  quickLinks: readonly string[];
  backPath: string;
  backLabel: string;
  className?: string;
};

type HelpSectionProps = {
  section: EditorHelpSection;
  open: boolean;
  highlighted?: boolean;
  onToggle: (id: string) => void;
};

function defaultHelpSectionState(sectionIds: readonly string[]) {
  return Object.fromEntries(sectionIds.map((id) => [id, false])) as Record<string, boolean>;
}

function readHelpSectionState(sectionIds: readonly string[], storageKey: string) {
  if (typeof window === "undefined") {
    return defaultHelpSectionState(sectionIds);
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return defaultHelpSectionState(sectionIds);
    }

    const parsed = JSON.parse(raw) as Record<string, boolean>;
    const defaults = defaultHelpSectionState(sectionIds);

    return Object.fromEntries(
      sectionIds.map((id) => [id, parsed[id] ?? defaults[id]])
    ) as Record<string, boolean>;
  } catch {
    return defaultHelpSectionState(sectionIds);
  }
}

function HelpSection({ section, open, highlighted = false, onToggle }: HelpSectionProps) {
  return (
    <details
      id={`help-${section.id}`}
      className={`panel pp-editor-help-card ${highlighted ? "is-highlighted" : ""}`}
      open={open}
    >
      <summary
        onClick={(event) => {
          event.preventDefault();
          onToggle(section.id);
        }}
      >
        <span className="pp-editor-help-card__summary-label">
          <i className={`fa-solid ${section.icon}`} aria-hidden="true" />
          {section.title}
        </span>
        <i
          className={`fa-solid ${open ? "fa-chevron-up" : "fa-chevron-down"}`}
          aria-hidden="true"
        />
      </summary>
      {open && <div className="pp-editor-help-card__body">{section.content}</div>}
    </details>
  );
}

export default function EditorHelpPage({
  title,
  storageKey,
  sections,
  quickLinks,
  backPath,
  backLabel,
  className,
}: EditorHelpPageProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const sectionIds = useMemo(() => sections.map(({ id }) => id), [sections]);
  const sectionsById = useMemo(
    () =>
      Object.fromEntries(sections.map((section) => [section.id, section])) as Record<
        string,
        EditorHelpSection
      >,
    [sections]
  );
  const [sectionState, setSectionState] = useState<Record<string, boolean>>(() =>
    readHelpSectionState(sectionIds, storageKey)
  );
  const [search, setSearch] = useState("");

  const matchingSections = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return new Set<string>();
    }

    return new Set(
      sections
        .filter(({ title: sectionTitle, keywords }) => {
          const haystack = `${sectionTitle} ${keywords.join(" ")}`.toLowerCase();
          return haystack.includes(query);
        })
        .map(({ id }) => id)
    );
  }, [search, sections]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(sectionState));
  }, [sectionState, storageKey]);

  useEffect(() => {
    if (!search.trim()) {
      return;
    }

    setSectionState((current) => {
      const next = { ...current };
      for (const id of sectionIds) {
        next[id] = matchingSections.has(id);
      }
      return next;
    });
  }, [matchingSections, search, sectionIds]);

  useEffect(() => {
    const hash = location.hash.replace(/^#/, "");
    if (!hash) {
      return;
    }

    const targetId = sectionIds.find((id) => id === hash || `help-${id}` === hash);
    if (!targetId) {
      return;
    }

    setSectionState((current) => ({
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
  }, [location.hash, sectionIds]);

  const replaceHash = (nextHash: string) => {
    if (typeof window === "undefined") {
      return;
    }

    window.history.replaceState(null, "", `${location.pathname}${nextHash}`);
  };

  const openSection = (id: string) => {
    setSectionState((current) => ({
      ...current,
      [id]: true,
    }));
    replaceHash(`#${id}`);
    window.setTimeout(() => {
      document.getElementById(`help-${id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  };

  const toggleSection = (id: string) => {
    setSectionState((current) => {
      const nextOpen = !current[id];
      replaceHash(nextOpen ? `#${id}` : "");
      return {
        ...current,
        [id]: nextOpen,
      };
    });
  };

  const setAllSections = (open: boolean) => {
    setSectionState(
      Object.fromEntries(sectionIds.map((id) => [id, open])) as Record<string, boolean>
    );
  };

  const rootClassName = ["pp-editor-help", className, "font-['Press_Start_2P']"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName}>
      <div className="pp-editor-help-shell">
        <div className="pp-editor-help-head">
          <h1>{title}</h1>
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
              title={backLabel}
              aria-label={backLabel}
              onClick={() => navigate(backPath)}
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
          {quickLinks.map((id) => {
            const section = sectionsById[id];
            if (!section) {
              return null;
            }

            return (
              <button
                key={id}
                type="button"
                className={`pp-editor-help-quick-link ${
                  sectionState[id] ? "is-active" : ""
                }`}
                onClick={() => openSection(id)}
              >
                <i className={`fa-solid ${section.icon}`} aria-hidden="true" />
                <span>{section.title}</span>
              </button>
            );
          })}
        </div>

        {sections.map((section) => (
          <HelpSection
            key={section.id}
            section={section}
            open={Boolean(sectionState[section.id])}
            highlighted={matchingSections.has(section.id)}
            onToggle={toggleSection}
          />
        ))}
      </div>
    </div>
  );
}
