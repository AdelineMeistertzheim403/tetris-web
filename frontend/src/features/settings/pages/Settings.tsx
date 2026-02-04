import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PIECE_COLORS,
  DEFAULT_UI_COLORS,
  useSettings,
} from "../context/SettingsContext";
import type { ControlAction } from "../../game/types/Controls";
import type { TetrominoType } from "../types/Settings";
import {
  DEFAULT_KEY_BINDINGS,
  controlActionLabels,
  formatKeyLabel,
  normalizeKey,
} from "../../game/utils/controls";
import "../../../styles/settings.css";

const ACTION_ORDER: ControlAction[] = [
  "left",
  "right",
  "down",
  "rotate",
  "harddrop",
  "hold",
  "bomb",
  "freeze",
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
    updateKeyBindings,
    updateUiColors,
    updatePieceColors,
    toggleReducedMotion,
    toggleReducedNeon,
    resetSettings,
  } = useSettings();

  const [listeningAction, setListeningAction] = useState<ControlAction | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  const keyBindings = settings.keyBindings;

  const listeningLabel = useMemo(() => {
    // Libellé affiché lorsque l'on attend une touche.
    if (!listeningAction) return null;
    return controlActionLabels[listeningAction];
  }, [listeningAction]);

  useEffect(() => {
    if (!listeningAction) return;

    const handler = (event: KeyboardEvent) => {
      // Capture de la touche pour remapper une action.
      if (event.key === "Escape") {
        setListeningAction(null);
        setKeyError(null);
        return;
      }
      if (event.key === "Tab") return;

      event.preventDefault();

      const normalized = normalizeKey(event.key);
      const conflict = Object.entries(keyBindings).find(
        ([action, key]) => key === normalized && action !== listeningAction
      );

      if (conflict) {
        // Empêche les doublons de touches entre actions.
        setKeyError(
          `La touche ${formatKeyLabel(normalized)} est déjà utilisée pour ${
            controlActionLabels[conflict[0] as ControlAction]
          }.`
        );
        return;
      }

      // Mise à jour persistée dans le contexte settings.
      updateKeyBindings({ [listeningAction]: normalized });
      setListeningAction(null);
      setKeyError(null);
    };

    window.addEventListener("keydown", handler, { passive: false });
    return () => window.removeEventListener("keydown", handler);
  }, [keyBindings, listeningAction, updateKeyBindings]);

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div>
          <h1>Paramètres</h1>
          <p>Personnalise tes touches, l’accessibilité et les couleurs.</p>
        </div>
        <button className="retro-btn" onClick={resetSettings}>
          Réinitialiser tout
        </button>
      </header>

      <section className="settings-section">
        <div className="section-title">
          <h2>Contrôles</h2>
          <p>Choisis les touches qui te conviennent.</p>
        </div>
        <div className="settings-card">
          <div className="keybind-grid">
            {ACTION_ORDER.map((action) => (
              <div key={action} className="keybind-row">
                <div className="keybind-label">{controlActionLabels[action]}</div>
                <div className="keybind-key">
                  {formatKeyLabel(keyBindings[action])}
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

          {listeningLabel && (
            <div className="keybind-hint">
              En attente d’une touche pour <strong>{listeningLabel}</strong>.
              <span>Échap pour annuler.</span>
            </div>
          )}
          {keyError && <div className="keybind-error">{keyError}</div>}

          <div className="settings-actions">
            <button
              className="retro-btn"
              onClick={() => updateKeyBindings(DEFAULT_KEY_BINDINGS)}
            >
              Réinitialiser les touches
            </button>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="section-title">
          <h2>Accessibilité</h2>
          <p>Réduis les animations et les effets lumineux.</p>
        </div>
        <div className="settings-card">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => toggleReducedMotion(e.target.checked)}
            />
            <span>Désactiver les animations</span>
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.reducedNeon}
              onChange={(e) => toggleReducedNeon(e.target.checked)}
            />
            <span>Désactiver les effets néon</span>
          </label>
        </div>
      </section>

      <section className="settings-section">
        <div className="section-title">
          <h2>Couleurs de l’interface</h2>
          <p>Adapte la palette visuelle du jeu.</p>
        </div>
        <div className="settings-card">
          <div className="color-grid">
            {UI_COLOR_FIELDS.map(({ key, label }) => (
              <label key={key} className="color-row">
                <span>{label}</span>
                <input
                  type="color"
                  value={settings.uiColors[key]}
                  onChange={(e) => updateUiColors({ [key]: e.target.value })}
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
      </section>

      <section className="settings-section">
        <div className="section-title">
          <h2>Couleurs des formes</h2>
          <p>Choisis une couleur pour chaque tétrimino.</p>
        </div>
        <div className="settings-card">
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
                  onChange={(e) => updatePieceColors({ [piece]: e.target.value })}
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
      </section>

      <section className="settings-section">
        <div className="section-title">
          <h2>Profil rapide</h2>
          <p>Restaurer les réglages d’origine en un clic.</p>
        </div>
        <div className="settings-card settings-card--center">
          <button className="retro-btn" onClick={resetSettings}>
            Restaurer les réglages par défaut
          </button>
          <div className="settings-note">
            Valeurs par défaut: fl?ches pour gauche,
             couleurs classiques et effets néon actifs.
          </div>
        </div>
      </section>
    </div>
  );
}
