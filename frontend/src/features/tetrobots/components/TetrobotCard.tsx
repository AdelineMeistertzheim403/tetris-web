import type {
  ApexTrustState,
  BotMemoryEntry,
  BotMood,
  TetrobotId,
} from "../../achievements/hooks/useAchievements";

type TetrobotCardProps = {
  bot: TetrobotId;
  name: string;
  avatar: string;
  accent: string;
  level: number;
  xp: number;
  affinity: number;
  mood: BotMood;
  status: string;
  signature: string;
  thoughts: string;
  requirement: string;
  memories: BotMemoryEntry[];
  trustState?: ApexTrustState;
  isFocused?: boolean;
};

export default function TetrobotCard({
  bot,
  name,
  avatar,
  accent,
  level,
  xp,
  affinity,
  mood,
  status,
  signature,
  thoughts,
  requirement,
  memories,
  trustState,
  isFocused = false,
}: TetrobotCardProps) {
  return (
    <article
      id={`relation-${bot}`}
      className={`tetrobots-relation tetrobots-relation--${bot} tetrobots-relation--${mood}${
        isFocused ? " tetrobots-relation--focused" : ""
      }`}
    >
      <div className="tetrobots-relation__head">
        <img src={avatar} alt={name} className="tetrobots-relation__avatar" />
        <div>
          <p className="tetrobots-relation__eyebrow">Centre de liaison</p>
          <h2 style={{ color: accent }}>{name}</h2>
          <p className="tetrobots-relation__signature">{signature}</p>
        </div>
      </div>

      <div className="tetrobots-relation__stats">
        <div>
          <span>Niveau</span>
          <strong>{level}</strong>
        </div>
        <div>
          <span>XP</span>
          <strong>{xp}</strong>
        </div>
        <div>
          <span>Affinite</span>
          <strong>{affinity}</strong>
        </div>
        <div>
          <span>Humeur</span>
          <strong>{mood}</strong>
        </div>
      </div>

      <div className="tetrobots-relation__block">
        <h3>Statut relationnel</h3>
        <p>{status}</p>
      </div>

      <div className="tetrobots-relation__block">
        <h3>Ce qu'il pense de toi</h3>
        <p>{thoughts}</p>
      </div>

      {trustState ? (
        <div className="tetrobots-relation__block">
          <h3>Etat de confiance Apex</h3>
          <p>{trustState}</p>
        </div>
      ) : null}

      <div className="tetrobots-relation__block">
        <h3>Comment ameliorer la relation</h3>
        <p>{requirement}</p>
      </div>

      <div className="tetrobots-relation__block">
        <h3>Souvenirs marquants</h3>
        {memories.length ? (
          <ul className="tetrobots-relation__memories">
            {memories.slice(0, 3).map((memory) => (
              <li key={memory.id}>{memory.text}</li>
            ))}
          </ul>
        ) : (
          <p>Aucun souvenir marquant enregistre pour le moment.</p>
        )}
      </div>
    </article>
  );
}
