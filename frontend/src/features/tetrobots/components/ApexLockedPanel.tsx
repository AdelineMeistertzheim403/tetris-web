type ApexLockedPanelProps = {
  message: string;
  requirement: string;
  progressCurrent?: number;
  progressTarget?: number;
  progressStatus?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function ApexLockedPanel({
  message,
  requirement,
  progressCurrent = 0,
  progressTarget = 0,
  progressStatus,
  actionLabel,
  onAction,
}: ApexLockedPanelProps) {
  const hasProgress = progressTarget > 0;
  const percent = hasProgress
    ? Math.max(0, Math.min(100, (progressCurrent / Math.max(1, progressTarget)) * 100))
    : 0;

  return (
    <div className="tetrobots-lock">
      <p className="tetrobots-lock__eyebrow">Apex verrouille le canal</p>
      <h3>Apex ne souhaite plus te conseiller</h3>
      <p>{message}</p>
      <p className="tetrobots-lock__requirement">{requirement}</p>
      {hasProgress ? (
        <div className="tetrobots-challenge-progress">
          <div className="tetrobots-challenge-progress__meta">
            <span>Progression du defi</span>
            <strong>
              {Math.min(progressCurrent, progressTarget)}/{progressTarget}
              {progressStatus ? ` · ${progressStatus}` : ""}
            </strong>
          </div>
          <div className="tetrobots-challenge-progress__bar" aria-hidden="true">
            <span
              className="tetrobots-challenge-progress__fill"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      ) : null}
      {actionLabel && onAction ? (
        <button type="button" className="tetrobots-help-link" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
