import { TETROBOT_DASHBOARD_AVATAR_FALLBACKS } from "../../../tetrobots/data/tetrobotsContent";
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
  const {
    activeBot,
    anomalyFeedback,
    anomalyProgress,
    canReopenLatestEvent,
    chatLine,
    hasActiveAnomaly,
    relationEvent,
    relationSummary,
    speaker,
  } = chatbot;

  return (
    <section
      className={`dashboard-chatbot dashboard-chatbot--${speaker.id} dashboard-chatbot--level-${activeBot.state?.level ?? 1} dashboard-chatbot--mood-${activeBot.mood}${
        hasActiveAnomaly ? " dashboard-chatbot--anomaly" : ""
      }`}
      aria-live="polite"
    >
      <div
        className={`dashboard-chatbot__avatar-shell dashboard-chatbot__avatar-shell--${speaker.id} dashboard-chatbot__avatar-shell--${activeBot.mood}`}
      >
        <img
          src={speaker.avatar}
          alt={speaker.label}
          className="dashboard-chatbot__avatar"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src =
              speaker.id === "pixel"
                ? speaker.fallbackAvatar
                : TETROBOT_DASHBOARD_AVATAR_FALLBACKS[chatLine.bot];
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
          style={{ color: speaker.accent }}
        >
          {speaker.label}
          {speaker.showRelationData ? ` LVL ${activeBot.state?.level ?? 1}` : " // SIGNAL PIRATE"}
        </p>
        <p className="dashboard-chatbot__text">{chatLine.text}</p>
        {speaker.showRelationData ? (
          <>
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
          </>
        ) : (
          <p className="dashboard-chatbot__relation-summary dashboard-chatbot__relation-summary--pixel">
            Pixel parasite temporairement le canal pour injecter un fragment corrompu.
          </p>
        )}
        <div
          className={`dashboard-chatbot__anomaly-tools${
            hasActiveAnomaly ? " dashboard-chatbot__anomaly-tools--active" : ""
          }`}
        >
          <div className="dashboard-chatbot__anomaly-copy">
            <span className="dashboard-chatbot__anomaly-label">Journal des anomalies</span>
            <span className="dashboard-chatbot__anomaly-progress">
              {anomalyProgress.totalFound}/{anomalyProgress.totalCount} fragments ·{" "}
              {anomalyProgress.popFound}/{anomalyProgress.popCount} archives pop
            </span>
          </div>
          <div className="dashboard-chatbot__anomaly-actions">
            <button
              type="button"
              className={`dashboard-chatbot__anomaly-button${
                hasActiveAnomaly ? " dashboard-chatbot__anomaly-button--active" : ""
              }`}
              onClick={actions.analyzeAnomaly}
            >
              {hasActiveAnomaly ? "Analyser le fragment" : "Signaler une anomalie"}
            </button>
            <button
              type="button"
              className="dashboard-chatbot__anomaly-link"
              onClick={actions.openAnomalies}
            >
              Ouvrir le journal
            </button>
          </div>
        </div>
        {anomalyFeedback ? (
          <div
            className={`dashboard-chatbot__anomaly-feedback dashboard-chatbot__anomaly-feedback--${anomalyFeedback.tone}`}
          >
            {anomalyFeedback.text}
          </div>
        ) : null}
        <div className="dashboard-chatbot__actions">
          {speaker.showRelationData ? (
            <button
              type="button"
              className="dashboard-shortcut dashboard-chatbot__icon-action dashboard-chatbot__icon-action--relation"
              onClick={actions.openRelation}
              data-tooltip="Voir la relation complete de ce Tetrobot."
              aria-label="Voir la relation complete"
            >
              <DashboardActionIcon name="relation" />
            </button>
          ) : null}
          {speaker.showRelationData && canReopenLatestEvent ? (
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
