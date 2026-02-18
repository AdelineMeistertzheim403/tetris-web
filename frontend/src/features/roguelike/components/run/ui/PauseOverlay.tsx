// Composant UI PauseOverlay.tsx.
type Props = {
  show: boolean;
  onResume: () => void;
};

export default function PauseOverlay({ show, onResume }: Props) {
  if (!show) return null;
  return (
    <div className="rogue-pause-overlay" role="status" aria-live="polite">
      <div className="rogue-pause-card">
        <p>Jeu en pause</p>
        <button onClick={onResume}>Reprendre</button>
      </div>
    </div>
  );
}
