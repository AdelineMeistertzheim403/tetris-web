import { TETROBOT_DASHBOARD_NAMES } from "../../../tetrobots/data/tetrobotsContent";
import {
  formatTraitLabel,
  getRelationLabel,
} from "../../../tetrobots/logic/dashboardNarrative";
import type { DashboardTipViewModel } from "../../logic/dashboardModels";

type DashboardTipPanelProps = {
  tip: DashboardTipViewModel;
};

export function DashboardTipPanel({
  tip,
}: DashboardTipPanelProps) {
  const { activeBot, levelUpNotice, tetrobotTip } = tip;

  return (
    <section
      className={`dashboard-panel dashboard-panel--tip dashboard-panel--tip-${activeBot.bot} dashboard-panel--tip-level-${activeBot.state?.level ?? 1} dashboard-panel--tip-mood-${activeBot.mood}`}
    >
      <p className="dashboard-panel__eyebrow">Conseil Tetrobots</p>
      <h2>Analyse du jour</h2>
      <p className="dashboard-tip__bot" style={{ color: activeBot.accentColor }}>
        {TETROBOT_DASHBOARD_NAMES[activeBot.bot]} · niveau {activeBot.state?.level ?? 1}
      </p>
      <p className="dashboard-tip__mood">
        Humeur: {getRelationLabel(activeBot.mood)} · affinite {activeBot.affinity}
      </p>
      <p className="dashboard-tip">{tetrobotTip}</p>
      <div className="dashboard-tip__traits">
        {(activeBot.state?.unlockedTraits.length
          ? activeBot.state.unlockedTraits
          : ["bootSequence"]
        ).map((trait) => (
          <span key={trait} className="dashboard-tip__trait">
            {formatTraitLabel(trait)}
          </span>
        ))}
      </div>
      {levelUpNotice ? (
        <div className="dashboard-tip__levelup">
          {levelUpNotice.message}
        </div>
      ) : null}
    </section>
  );
}
