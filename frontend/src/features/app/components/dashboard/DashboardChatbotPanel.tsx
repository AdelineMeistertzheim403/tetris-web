import { TETROBOT_DASHBOARD_AVATAR_FALLBACKS, TETROBOT_DASHBOARD_NAMES } from "../../../tetrobots/data/tetrobotsContent";
import { getRelationLabel } from "../../../tetrobots/logic/dashboardNarrative";
import type {
  DashboardChatbotActions,
  DashboardChatbotViewModel,
} from "../../logic/dashboardModels";
import { DashboardActionIcon } from "./DashboardActionIcon";

type DashboardChatbotPanelProps = {
  chatbot: DashboardChatbotViewModel;
  actions: DashboardChatbotActions;
  userPseudo?: string;
};

export function DashboardChatbotPanel({
  chatbot,
  actions,
  userPseudo,
}: DashboardChatbotPanelProps) {
  const { activeBot, canReopenLatestEvent, chatLine, relationEvent, relationSummary } = chatbot;

  return (
    <section
      className={`dashboard-chatbot dashboard-chatbot--${chatLine.bot} dashboard-chatbot--level-${activeBot.state?.level ?? 1} dashboard-chatbot--mood-${activeBot.mood}`}
      aria-live="polite"
    >
      <div
        className={`dashboard-chatbot__avatar-shell dashboard-chatbot__avatar-shell--${chatLine.bot} dashboard-chatbot__avatar-shell--${activeBot.mood}`}
      >
        <img
          src={activeBot.avatar}
          alt={TETROBOT_DASHBOARD_NAMES[chatLine.bot]}
          className="dashboard-chatbot__avatar"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = TETROBOT_DASHBOARD_AVATAR_FALLBACKS[chatLine.bot];
          }}
          loading="lazy"
        />
      </div>
      <div className="dashboard-chatbot__body">
        {userPseudo ? (
          <p className="dashboard-chatbot__welcome">
            Bienvenue <span>{userPseudo}</span> !
          </p>
        ) : (
          <p className="dashboard-chatbot__welcome">Bienvenue pilote !</p>
        )}
        <p
          className="dashboard-chatbot__name"
          style={{ color: activeBot.accentColor }}
        >
          {TETROBOT_DASHBOARD_NAMES[chatLine.bot]} LVL {activeBot.state?.level ?? 1}
        </p>
        <p className="dashboard-chatbot__text">{chatLine.text}</p>
        <div className="dashboard-chatbot__meta">
          <span>XP {activeBot.state?.xp ?? 0}</span>
          <span>Affinite {activeBot.affinity}</span>
          <span>{getRelationLabel(activeBot.mood)}</span>
          <span>{activeBot.state?.unlockedTraits.length ?? 0} traits</span>
        </div>
        <p className="dashboard-chatbot__relation-summary">{relationSummary}</p>
        {relationEvent ? (
          <div className={`dashboard-chatbot__event dashboard-chatbot__event--${relationEvent.tone}`}>
            <span className="dashboard-chatbot__event-label">{relationEvent.label}</span>
            <p>{relationEvent.text}</p>
          </div>
        ) : null}
        <div className="dashboard-chatbot__actions">
          <button
            type="button"
            className="dashboard-shortcut dashboard-chatbot__icon-action dashboard-chatbot__icon-action--relation"
            onClick={actions.openRelation}
            data-tooltip="Voir la relation complete de ce Tetrobot."
            aria-label="Voir la relation complete"
          >
            <DashboardActionIcon name="relation" />
          </button>
          {canReopenLatestEvent ? (
            <button
              type="button"
              className="dashboard-shortcut dashboard-chatbot__icon-action dashboard-chatbot__icon-action--message"
              onClick={actions.openLatestEvent}
              data-tooltip="Rouvrir la derniere scene relationnelle recente."
              aria-label="Rouvrir le dernier message"
            >
              <DashboardActionIcon name="message" />
            </button>
          ) : null}
          <button
            type="button"
            className="dashboard-shortcut dashboard-chatbot__icon-action dashboard-chatbot__icon-action--help"
            onClick={actions.openHelp}
            data-tooltip="Comprendre l'XP, l'affinite, l'humeur et les defis des Tetrobots."
            aria-label="Comprendre les Tetrobots"
          >
            <DashboardActionIcon name="help" />
          </button>
        </div>
      </div>
    </section>
  );
}
