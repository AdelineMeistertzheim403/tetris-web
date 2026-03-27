type ApexLockedPanelProps = {
  message: string;
  requirement: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function ApexLockedPanel({
  message,
  requirement,
  actionLabel,
  onAction,
}: ApexLockedPanelProps) {
  return (
    <div className="tetrobots-lock">
      <p className="tetrobots-lock__eyebrow">Apex verrouille le canal</p>
      <h3>Apex ne souhaite plus te conseiller</h3>
      <p>{message}</p>
      <p className="tetrobots-lock__requirement">{requirement}</p>
      {actionLabel && onAction ? (
        <button type="button" className="tetrobots-help-link" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
