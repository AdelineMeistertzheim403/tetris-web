export default function RoguelikeIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="rogue-intro">
      <h1>ROGUELIKE RUN</h1>

      <p className="rogue-lore">
        Une seule vie.<br />
        Des choix permanents.<br />
        Jusqu’où irez-vous ?
      </p>

      <button className="rogue-start-btn" onClick={onStart}>
        ▶ COMMENCER LA RUN
      </button>
    </div>
  )
}
