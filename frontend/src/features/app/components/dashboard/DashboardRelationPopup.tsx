import { TETROBOT_DASHBOARD_NAMES } from "../../../tetrobots/data/tetrobotsContent";
import type {
  DashboardRelationChoice,
} from "../../../tetrobots/logic/dashboardNarrative";
import type { DashboardRelationOverlayViewModel } from "../../logic/dashboardModels";

type DashboardRelationPopupProps = {
  relationOverlay: DashboardRelationOverlayViewModel;
  onChoice: (choice: DashboardRelationChoice) => void;
  onClose: () => void;
};

export function DashboardRelationPopup({
  relationOverlay,
  onChoice,
  onClose,
}: DashboardRelationPopupProps) {
  const { popup: relationPopup, scene: relationScene, choices: relationChoices } = relationOverlay;

  if (!relationPopup) return null;

  return (
    <aside
      className={`dashboard-relation-popup dashboard-relation-popup--${relationPopup.tone} dashboard-relation-popup--${relationPopup.bot}`}
      aria-live="polite"
    >
      <div className="dashboard-relation-popup__head">
        <p className="dashboard-relation-popup__eyebrow">
          {TETROBOT_DASHBOARD_NAMES[relationPopup.bot]} · {relationPopup.label}
        </p>
        <button
          type="button"
          className="dashboard-relation-popup__close"
          onClick={onClose}
          aria-label="Fermer l'evenement relationnel"
        >
          ×
        </button>
      </div>
      <div className="dashboard-relation-popup__scene">
        {relationScene.map((line, index) => (
          <div
            key={`${relationPopup.id}-${index}`}
            className={`dashboard-relation-popup__line dashboard-relation-popup__line--${line.speaker}`}
          >
            <span className="dashboard-relation-popup__speaker">
              {line.speaker === "system" ? "SYSTEME" : TETROBOT_DASHBOARD_NAMES[line.speaker]}
            </span>
            <p>{line.text}</p>
          </div>
        ))}
      </div>
      <div className="dashboard-relation-popup__actions">
        {relationChoices.map((choice) => (
          <button
            key={`${relationPopup.id}-${choice.label}`}
            type="button"
            className={`dashboard-relation-popup__action${
              choice.action === "open_relation"
                ? " dashboard-relation-popup__action--primary"
                : ""
            }`}
            onClick={() => onChoice(choice)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </aside>
  );
}
