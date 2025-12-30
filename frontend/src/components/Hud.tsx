type HudProps = {
  score?: number
  lines?: number
  level?: number
}

export default function Hud({
  score = 0,
  lines = 0,
  level = 1,
}: HudProps) {
  return (
    <div className="hud">
      <HudItem label="SCORE" value={score} />
      <HudItem label="LIGNES" value={lines} />
      <HudItem label="NIVEAU" value={level} />
    </div>
  )
}

function HudItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="hud-item">
      <span className="hud-label">{label}</span>
      <span className="hud-value">{value}</span>
    </div>
  )
}
