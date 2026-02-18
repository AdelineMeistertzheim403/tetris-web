// Composant UI SidebarRight.tsx.
import ControlsPanel from "../../../../game/components/hud/ControlsPanel";

type Props = {
  bombs: number;
  timeFreezeCharges: number;
  chaosMode: boolean;
  paused: boolean;
  onTogglePause: () => void;
};

export default function SidebarRight({
  bombs,
  timeFreezeCharges,
  chaosMode,
  paused,
  onTogglePause,
}: Props) {
  return (
    <aside className="rogue-right">
      <ControlsPanel
        bombs={bombs}
        timeFreezeCharges={timeFreezeCharges}
        chaosMode={chaosMode}
        paused={paused}
        onTogglePause={onTogglePause}
      />
    </aside>
  );
}
