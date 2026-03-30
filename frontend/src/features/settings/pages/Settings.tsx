import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PIECE_COLORS,
  DEFAULT_UI_COLORS,
  useSettings,
} from "../context/SettingsContext";
import {
  DashboardEditorContent,
  type DashboardEditorSection,
} from "../../app/components/dashboard/DashboardEditorContent";
import { DashboardScene } from "../../app/components/dashboard/DashboardScene";
import type { TetrominoType } from "../types/Settings";
import {
  CONTROL_MODE_DESCRIPTIONS,
  CONTROL_MODE_LABELS,
  STANDALONE_CONTROL_MODE_ORDER,
  TETRIS_CONTROL_MODE_ORDER,
  formatKeyLabel,
  getControlActionLabel,
  getControlActionOrder,
  getModeKeyBindings,
  normalizeKey,
  type ControlSettingsMode,
  type TetrisControlMode,
} from "../../game/utils/controls";
import "../../../styles/settings.css";

type SettingsTabId = "controls" | "accessibility" | "dashboard";
type DashboardTabId = Extract<DashboardEditorSection, "widgets" | "layout">;
type ControlsCategoryId = "TETRIS" | Exclude<ControlSettingsMode, TetrisControlMode>;

const SETTINGS_TABS: Array<{ id: SettingsTabId; label: string; description: string }> = [
  {
    id: "controls",
    label: "Controles",
    description: "Touches et raccourcis de jeu.",
  },
  {
    id: "accessibility",
    label: "Accessibilites",
    description: "Confort visuel, animations et couleurs.",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Widgets affiches et disposition.",
  },
];

const DASHBOARD_SUB_TABS: Array<{
  id: DashboardTabId;
  label: string;
  description: string;
}> = [
  {
    id: "widgets",
    label: "Widgets",
    description: "Choisir les widgets affiches.",
  },
  {
    id: "layout",
    label: "Disposition",
    description: "Placer et redimensionner les widgets.",
  },
];

const TETRIS_CONTROLS_SUB_TABS = TETRIS_CONTROL_MODE_ORDER.map((mode) => ({
  id: mode,
  label: CONTROL_MODE_LABELS[mode],
  description: CONTROL_MODE_DESCRIPTIONS[mode],
}));

const CONTROLS_CATEGORY_TABS: Array<{
  id: ControlsCategoryId;
  label: string;
  description: string;
}> = [
  {
    id: "TETRIS",
    label: "Mode Tetris",
    description: "Classique, Sprint, Versus, Roguelike et Puzzle.",
  },
  ...STANDALONE_CONTROL_MODE_ORDER.map((mode) => ({
    id: mode,
    label: CONTROL_MODE_LABELS[mode],
    description: CONTROL_MODE_DESCRIPTIONS[mode],
  })),
];

const PIECE_ORDER: TetrominoType[] = ["I", "O", "T", "S", "Z", "L", "J"];

const UI_COLOR_FIELDS: { key: keyof typeof DEFAULT_UI_COLORS; label: string }[] = [
  { key: "accent", label: "Accent principal" },
  { key: "accentSecondary", label: "Accent secondaire" },
  { key: "accentWarm", label: "Accent chaud" },
  { key: "panelBg", label: "Fond des panneaux" },
  { key: "boardBg", label: "Fond du plateau" },
  { key: "boardBorder", label: "Bordure du plateau" },
  { key: "text", label: "Texte principal" },
  { key: "muted", label: "Texte atténué" },
];

export default function Settings() {
  const {
    settings,
    updateModeKeyBinding,
    updateUiColors,
    updatePieceColors,
    toggleReducedMotion,
    toggleReducedNeon,
    resetModeKeyBindings,
    resetSettings,
  } = useSettings();

  const [activeTab, setActiveTab] = useState<SettingsTabId>("controls");
  const [controlsCategory, setControlsCategory] = useState<ControlsCategoryId>("TETRIS");
  const [selectedTetrisMode, setSelectedTetrisMode] =
    useState<TetrisControlMode>("CLASSIQUE");
  const [dashboardTab, setDashboardTab] = useState<DashboardTabId>("widgets");
  const [listeningAction, setListeningAction] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  const controlsMode: ControlSettingsMode =
    controlsCategory === "TETRIS" ? selectedTetrisMode : controlsCategory;
  const keyBindings = useMemo(
    () => getModeKeyBindings(settings, controlsMode),
    [controlsMode, settings.keyBindings, settings.modeKeyBindings]
  );
  const actionOrder = useMemo(() => getControlActionOrder(controlsMode), [controlsMode]);
  const listeningLabel = useMemo(() => {
    if (!listeningAction) return null;
    return getControlActionLabel(controlsMode, listeningAction);
  }, [controlsMode, listeningAction]);

  useEffect(() => {
    setListeningAction(null);
    setKeyError(null);
  }, [controlsMode]);

  useEffect(() => {
    if (!listeningAction) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setListeningAction(null);
        setKeyError(null);
        return;
      }
      if (event.key === "Tab") return;

      event.preventDefault();

      const normalized = normalizeKey(event.key);
      const conflict = actionOrder.find(
        (action) =>
          action !== listeningAction &&
          keyBindings[action as keyof typeof keyBindings] === normalized
      );

      if (conflict) {
        setKeyError(
          `La touche ${formatKeyLabel(normalized)} est deja utilisee pour ${getControlActionLabel(
            controlsMode,
            conflict
          )}.`
        );
        return;
      }

      updateModeKeyBinding(controlsMode, listeningAction, normalized);
      setListeningAction(null);
      setKeyError(null);
    };

    window.addEventListener("keydown", handler, { passive: false });
    return () => window.removeEventListener("keydown", handler);
  }, [actionOrder, controlsMode, keyBindings, listeningAction, updateModeKeyBinding]);

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div>
          <h1>Paramètres</h1>
        </div>
        <button className="retro-btn" onClick={resetSettings}>
          Réinitialiser tout
        </button>
      </header>

      <div className="settings-tabs" role="tablist" aria-label="Sections des paramètres">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`settings-tab${activeTab === tab.id ? " is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.label}</span>
            <small>{tab.description}</small>
          </button>
        ))}
      </div>

      <section className="settings-section">
        {activeTab === "controls" ? (
          <div className="settings-controls-tab">
            <div className="settings-subtabs" role="tablist" aria-label="Categories de controles">
              {CONTROLS_CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={controlsCategory === tab.id}
                  className={`settings-subtab${controlsCategory === tab.id ? " is-active" : ""}`}
                  onClick={() => setControlsCategory(tab.id)}
                >
                  <span>{tab.label}</span>
                  <small>{tab.description}</small>
                </button>
              ))}
            </div>

            {controlsCategory === "TETRIS" ? (
              <>
                <div className="settings-subtabs__heading">Variantes Tetris</div>
                <div
                  className="settings-subtabs settings-subtabs--compact"
                  role="tablist"
                  aria-label="Variantes du mode Tetris"
                >
                  {TETRIS_CONTROLS_SUB_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={selectedTetrisMode === tab.id}
                      className={`settings-subtab${
                        selectedTetrisMode === tab.id ? " is-active" : ""
                      }`}
                      onClick={() => setSelectedTetrisMode(tab.id)}
                    >
                      <span>{tab.label}</span>
                      <small>{tab.description}</small>
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            <div className="settings-card">
              <div className="settings-subsection">
                <h3>{CONTROL_MODE_LABELS[controlsMode]}</h3>
                <p className="settings-subsection__hint">
                  {CONTROL_MODE_DESCRIPTIONS[controlsMode]}
                </p>

                <div className="keybind-grid">
                  {actionOrder.map((action) => (
                    <div key={action} className="keybind-row">
                      <div className="keybind-label">
                        {getControlActionLabel(controlsMode, action)}
                      </div>
                      <div className="keybind-key">
                        {formatKeyLabel(keyBindings[action as keyof typeof keyBindings])}
                      </div>
                      <button
                        className={`retro-btn keybind-btn ${
                          listeningAction === action ? "is-listening" : ""
                        }`}
                        onClick={() => {
                          setKeyError(null);
                          setListeningAction(action);
                        }}
                      >
                        {listeningAction === action ? "Appuie sur une touche" : "Changer"}
                      </button>
                    </div>
                  ))}
                </div>

                {listeningLabel ? (
                  <div className="keybind-hint">
                    En attente d’une touche pour <strong>{listeningLabel}</strong>.
                    <span>Echap pour annuler.</span>
                  </div>
                ) : null}
                {keyError ? <div className="keybind-error">{keyError}</div> : null}

                <div className="settings-actions">
                  <button
                    className="retro-btn"
                    onClick={() => resetModeKeyBindings(controlsMode)}
                  >
                    Reinitialiser les touches de ce mode
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "accessibility" ? (
          <div className="settings-accessibility">
            <div className="settings-card">
              <div className="settings-subsection">
                <h3>Accessibilité</h3>
                <p className="settings-subsection__hint">
                  Réduis les animations et les effets lumineux de l’interface.
                </p>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={settings.reducedMotion}
                    onChange={(event) => toggleReducedMotion(event.target.checked)}
                  />
                  <span>Désactiver les animations</span>
                </label>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={settings.reducedNeon}
                    onChange={(event) => toggleReducedNeon(event.target.checked)}
                  />
                  <span>Désactiver les effets néon</span>
                </label>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-subsection">
                <h3>Couleurs de l’interface</h3>
                <p className="settings-subsection__hint">
                  Adapte la palette visuelle globale du jeu.
                </p>
                <div className="color-grid">
                  {UI_COLOR_FIELDS.map(({ key, label }) => (
                    <label key={key} className="color-row">
                      <span>{label}</span>
                      <input
                        type="color"
                        value={settings.uiColors[key]}
                        onChange={(event) => updateUiColors({ [key]: event.target.value })}
                      />
                    </label>
                  ))}
                </div>
                <div className="settings-actions">
                  <button
                    className="retro-btn"
                    onClick={() => updateUiColors(DEFAULT_UI_COLORS)}
                  >
                    Réinitialiser la palette
                  </button>
                </div>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-subsection">
                <h3>Couleurs des formes</h3>
                <p className="settings-subsection__hint">
                  Choisis une couleur pour chaque tétrimino.
                </p>
                <div className="piece-grid">
                  {PIECE_ORDER.map((piece) => (
                    <label key={piece} className="piece-row">
                      <span className="piece-label">{piece}</span>
                      <span
                        className="piece-preview"
                        style={{ background: settings.pieceColors[piece] }}
                      />
                      <input
                        type="color"
                        value={settings.pieceColors[piece]}
                        onChange={(event) =>
                          updatePieceColors({ [piece]: event.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="settings-actions">
                  <button
                    className="retro-btn"
                    onClick={() => updatePieceColors(DEFAULT_PIECE_COLORS)}
                  >
                    Réinitialiser les couleurs
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "dashboard" ? (
          <div className="settings-dashboard-tab">
            <div className="settings-subtabs" role="tablist" aria-label="Sous-sections dashboard">
              {DASHBOARD_SUB_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={dashboardTab === tab.id}
                  className={`settings-subtab${dashboardTab === tab.id ? " is-active" : ""}`}
                  onClick={() => setDashboardTab(tab.id)}
                >
                  <span>{tab.label}</span>
                  <small>{tab.description}</small>
                </button>
              ))}
            </div>

            <DashboardScene showOverlays={false} embedded>
              {({ renderWidget }) => (
                <DashboardEditorContent
                  renderWidget={renderWidget}
                  compact
                  section={dashboardTab}
                />
              )}
            </DashboardScene>
          </div>
        ) : null}
      </section>
    </div>
  );
}
