import type { Perk } from "../types/Perk";

export default function PerksPanel({ perks }: { perks: Perk[] }) {
  return (
    <div className="panel">
      <h3>PERKS</h3>

      {perks.length === 0 ? (
        <p style={{ opacity: 0.6 }}>Aucun perk actif</p>
      ) : (
        <ul className="perk-list">
          {perks.map(perk => (
            <li key={perk.id} className={`perk-item ${perk.rarity}`}>
              <strong>{perk.name}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}