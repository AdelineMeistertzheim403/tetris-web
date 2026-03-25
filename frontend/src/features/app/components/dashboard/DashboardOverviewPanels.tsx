import type {
  DashboardCampaignProgress,
  DashboardFocusItem,
  DashboardModeCard,
  DashboardQuickResume,
  DashboardShortcut,
} from "../../logic/dashboardOverview";
import { DashboardActionIcon } from "./DashboardActionIcon";

type DashboardResumePanelProps = {
  quickResume: DashboardQuickResume;
  onOpenPath: (path: string) => void;
};

type DashboardModesPanelProps = {
  modeCards: DashboardModeCard[];
  onOpenMode: (path: string) => void;
};

type DashboardFocusPanelProps = {
  achievementFocus: DashboardFocusItem[];
};

type DashboardProgressPanelProps = {
  campaignProgress: DashboardCampaignProgress;
};

type DashboardActivityPanelProps = {
  recentActivity: string[];
};

type DashboardShortcutPanelProps = {
  eyebrow: string;
  title: string;
  panelClassName: string;
  shortcuts: DashboardShortcut[];
  onOpenShortcut: (path: string) => void;
};

export function DashboardResumePanel({
  quickResume,
  onOpenPath,
}: DashboardResumePanelProps) {
  return (
    <section className="dashboard-resume">
      <div className="dashboard-resume__copy">
        <p className="dashboard-panel__eyebrow">Action rapide</p>
        <h2>Reprendre la ou tu t'es arrete</h2>
        <p className="dashboard-resume__title">{quickResume.title}</p>
        <p className="dashboard-resume__text">{quickResume.detail}</p>
      </div>
      <div className="dashboard-resume__actions">
        <button
          className="dashboard-cta dashboard-cta--primary"
          onClick={() => onOpenPath(quickResume.primaryPath)}
          data-tooltip="Relancer directement ton dernier point de reprise."
          aria-label="Reprendre la progression"
        >
          <DashboardActionIcon name="resume" />
        </button>
        <button
          className="dashboard-cta"
          onClick={() => onOpenPath(quickResume.secondaryPath)}
          data-tooltip="Ouvrir le hub correspondant pour choisir une autre entree."
          aria-label="Voir le hub"
        >
          <DashboardActionIcon name="hub" />
        </button>
      </div>
    </section>
  );
}

export function DashboardModesPanel({
  modeCards,
  onOpenMode,
}: DashboardModesPanelProps) {
  return (
    <section className="dashboard-panel dashboard-panel--modes">
      <p className="dashboard-panel__eyebrow">Modes</p>
      <h2>Choisir une destination</h2>
      <div className="mode-card-grid mode-card-grid--dashboard">
        {modeCards.map((modeCard) => (
          <button
            key={modeCard.title}
            onClick={() => onOpenMode(modeCard.path)}
            className={`mode-card mode-card--dashboard mode-card--dashboard-${modeCard.variant} bg-gradient-to-b ${modeCard.accent}`}
          >
            <div className="mode-card__icon">
              <img
                src={modeCard.image}
                alt={modeCard.title}
                className="mode-card__image"
                loading="lazy"
              />
            </div>
            <div className="mode-card__content">
              <h3>{modeCard.title}</h3>
              <p>{modeCard.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export function DashboardFocusPanel({
  achievementFocus,
}: DashboardFocusPanelProps) {
  return (
    <section className="dashboard-panel dashboard-panel--focus">
      <p className="dashboard-panel__eyebrow">Succes en progression</p>
      <h2>Ce que tu peux viser maintenant</h2>
      <div className="dashboard-focus-list">
        {achievementFocus.map((item) => (
          <div key={item.label} className="dashboard-focus-card">
            <div className="dashboard-focus-card__top">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
            <p>{item.hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DashboardProgressPanel({
  campaignProgress,
}: DashboardProgressPanelProps) {
  return (
    <section className="dashboard-panel dashboard-panel--progress">
      <p className="dashboard-panel__eyebrow">Progression</p>
      <h2>Etat des campagnes</h2>
      <div className="dashboard-progress-list">
        <div className="dashboard-progress-item">
          <span>Mode Tetris</span>
          <strong>Hub central disponible</strong>
        </div>
        <div className="dashboard-progress-item">
          <span>Brickfall Solo</span>
          <strong>Niveau {campaignProgress.brickfallLevel}</strong>
        </div>
        <div className="dashboard-progress-item">
          <span>Tetromaze</span>
          <strong>
            Niveau {campaignProgress.tetromaze.currentLevel} / max{" "}
            {campaignProgress.tetromaze.highestLevel}
          </strong>
        </div>
        <div className="dashboard-progress-item">
          <span>Pixel Protocol</span>
          <strong>
            Niveau {campaignProgress.pixelProtocol.currentLevel} / max{" "}
            {campaignProgress.pixelProtocol.highestLevel}
          </strong>
        </div>
      </div>
    </section>
  );
}

export function DashboardActivityPanel({
  recentActivity,
}: DashboardActivityPanelProps) {
  return (
    <section className="dashboard-panel dashboard-panel--activity">
      <p className="dashboard-panel__eyebrow">Activite recente</p>
      <h2>Derniers signaux</h2>
      <div className="dashboard-activity-list">
        {recentActivity.map((item) => (
          <div key={item} className="dashboard-activity-item">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

export function DashboardShortcutPanel({
  eyebrow,
  title,
  panelClassName,
  shortcuts,
  onOpenShortcut,
}: DashboardShortcutPanelProps) {
  return (
    <section className={panelClassName}>
      <p className="dashboard-panel__eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <div className="dashboard-shortcuts">
        {shortcuts.map((shortcut) => (
          <button
            key={shortcut.label}
            className="dashboard-shortcut dashboard-shortcut--wide"
            onClick={() => onOpenShortcut(shortcut.path)}
            data-tooltip={shortcut.tooltip}
            aria-label={shortcut.label}
          >
            <DashboardActionIcon name={shortcut.icon} />
            <span>{shortcut.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
