import { Link } from "react-router-dom";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSettings } from "../../../settings/context/SettingsContext";
import {
  DASHBOARD_FIXED_WIDGET_IDS,
  DASHBOARD_OPTIONAL_WIDGET_IDS,
  DASHBOARD_WIDGET_DEFINITION_MAP,
  createDefaultDashboardSettings,
  normalizeDashboardSettings,
  type DashboardWidgetId,
  type DashboardWidgetLayout,
} from "../../logic/dashboardWidgets";
import { DashboardWidgetGrid } from "./DashboardWidgetGrid";
import { PATHS } from "../../../../routes/paths";

function serializeWidgets(widgets: Record<DashboardWidgetId, DashboardWidgetLayout>) {
  return JSON.stringify(widgets);
}

export type DashboardEditorSection = "all" | "widgets" | "layout";

type DashboardEditorContentProps = {
  renderWidget: (widgetId: DashboardWidgetId) => ReactNode;
  compact?: boolean;
  showStandaloneLinks?: boolean;
  section?: DashboardEditorSection;
};

export function DashboardEditorContent({
  renderWidget,
  compact = false,
  showStandaloneLinks = false,
  section = "all",
}: DashboardEditorContentProps) {
  const { settings, updateDashboardSettings } = useSettings();
  const [draftWidgets, setDraftWidgets] = useState(settings.dashboard.widgets);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraftWidgets(settings.dashboard.widgets);
  }, [settings.dashboard.widgets]);

  const hasChanges = useMemo(
    () => serializeWidgets(draftWidgets) !== serializeWidgets(settings.dashboard.widgets),
    [draftWidgets, settings.dashboard.widgets]
  );

  const updateWidgetVisibility = (widgetId: DashboardWidgetId, visible: boolean) => {
    setDraftWidgets((prev) =>
      normalizeDashboardSettings({
        widgets: {
          ...prev,
          [widgetId]: {
            ...prev[widgetId],
            visible,
          },
        },
      }).widgets
    );
    setSaveMessage(null);
  };

  const handleSave = () => {
    updateDashboardSettings({ widgets: draftWidgets });
    setSaveMessage("Disposition sauvegardee.");
  };

  const handleReset = () => {
    setDraftWidgets(createDefaultDashboardSettings().widgets);
    setSaveMessage(null);
  };

  const statusMessage = saveMessage
    ? saveMessage
    : hasChanges
      ? "Modifications non sauvegardees."
      : "Disposition synchronisee avec le dashboard.";
  const editorTitle =
    section === "widgets"
      ? "Choisis les widgets affiches"
      : section === "layout"
        ? "Ajuste la disposition"
        : "Organise ton dashboard";
  const editorHint =
    section === "widgets"
      ? "Active uniquement les widgets que tu veux voir apparaitre sur le dashboard."
      : section === "layout"
        ? "Glisse les widgets visibles pour les reordonner, redimensionne-les puis enregistre la disposition."
        : "Glisse les widgets pour les reordonner, redimensionne-les puis enregistre la disposition quand elle te convient.";

  const visibilityPanel = (
    <>
      <div className="dashboard-editor__section">
        <p className="dashboard-panel__eyebrow">Widgets fixes</p>
        <h2>Zones toujours visibles</h2>
        <div className="dashboard-editor__list">
          {DASHBOARD_FIXED_WIDGET_IDS.map((widgetId) => {
            const definition = DASHBOARD_WIDGET_DEFINITION_MAP[widgetId];
            return (
              <div key={widgetId} className="dashboard-editor__item">
                <div>
                  <strong>{definition.label}</strong>
                  <p>{definition.description}</p>
                </div>
                <span className="dashboard-widget__badge">Fixe</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="dashboard-editor__section">
        <p className="dashboard-panel__eyebrow">Widgets optionnels</p>
        <h2>Affichage</h2>
        <div className="dashboard-editor__list">
          {DASHBOARD_OPTIONAL_WIDGET_IDS.map((widgetId) => {
            const definition = DASHBOARD_WIDGET_DEFINITION_MAP[widgetId];
            return (
              <label
                key={widgetId}
                className="dashboard-editor__item dashboard-editor__item--toggle"
              >
                <div>
                  <strong>{definition.label}</strong>
                  <p>{definition.description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={draftWidgets[widgetId].visible}
                  onChange={(event) =>
                    updateWidgetVisibility(widgetId, event.target.checked)
                  }
                />
              </label>
            );
          })}
        </div>
      </div>

      <div className="dashboard-editor__section">
        <p className="dashboard-panel__eyebrow">Etat</p>
        <p className="dashboard-editor__status">{statusMessage}</p>
      </div>
    </>
  );

  const layoutPanel = (
    <>
      <div className="dashboard-panel dashboard-editor__helper">
        <p className="dashboard-panel__eyebrow">Disposition</p>
        <h2>Organisation des widgets</h2>
        <p className="dashboard-editor__status">
          Deplace les widgets visibles et ajuste leur taille. L'affichage des widgets se regle dans
          le sous-onglet Widgets.
        </p>
      </div>
      <div className="dashboard-editor__canvas">
        <DashboardWidgetGrid
          widgets={draftWidgets}
          renderWidget={renderWidget}
          editable
          onWidgetsChange={(next) => {
            setDraftWidgets(next);
            setSaveMessage(null);
          }}
        />
      </div>
    </>
  );

  return (
    <div
      className={`dashboard-layout-shell dashboard-editor-shell${
        compact ? " dashboard-editor-shell--compact" : ""
      }`}
    >
      <header className="dashboard-editor__header">
        <div>
          <p className="dashboard-layout__eyebrow">Dashboard Editor</p>
          <h1 className="dashboard-editor__title">{editorTitle}</h1>
          <p className="dashboard-layout__hint">{editorHint}</p>
        </div>
        <div className="dashboard-editor__header-actions">
          {showStandaloneLinks ? (
            <>
              <Link to={PATHS.settings} className="retro-btn">
                Retour parametres
              </Link>
              <Link to={PATHS.dashboard} className="retro-btn">
                Voir le dashboard
              </Link>
            </>
          ) : null}
          <button type="button" className="retro-btn" onClick={handleReset}>
            Reinitialiser
          </button>
          <button
            type="button"
            className="retro-btn"
            onClick={handleSave}
            disabled={!hasChanges}
          >
            Sauvegarder la disposition
          </button>
        </div>
      </header>

      {section === "all" ? (
        <div className="dashboard-editor">
          <aside className="dashboard-editor__sidebar dashboard-panel">{visibilityPanel}</aside>
          {layoutPanel}
        </div>
      ) : null}

      {section === "widgets" ? (
        <div className="dashboard-editor__solo">
          <div className="dashboard-panel dashboard-editor__solo-panel">{visibilityPanel}</div>
        </div>
      ) : null}

      {section === "layout" ? (
        <div className="dashboard-editor__solo dashboard-editor__solo--layout">{layoutPanel}</div>
      ) : null}
    </div>
  );
}
