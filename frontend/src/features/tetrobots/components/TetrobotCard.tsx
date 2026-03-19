import { Link } from "react-router-dom";
import type {
  ApexTrustState,
  BotMemoryEntry,
  BotMood,
  TetrobotId,
} from "../../achievements/types/tetrobots";

export type TetrobotRelationProgressItem = {
  id: string;
  label: string;
  current: number;
  target: number;
  detail: string;
  stateLabel: string;
  actionLabel?: string;
  actionTo?: string;
  tone?: "neutral" | "warning" | "success";
};

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
  progressItems: TetrobotRelationProgressItem[];
  memories: BotMemoryEntry[];
  trustState?: ApexTrustState;
  isFocused?: boolean;
  highlightedGoalId?: string | null;
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
  progressItems,
  memories,
  trustState,
  isFocused = false,
  highlightedGoalId = null,
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

      <div className="tetrobots-relation__layout">
        <div className="tetrobots-relation__column tetrobots-relation__column--left">
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
        </div>

        <div className="tetrobots-relation__column tetrobots-relation__column--right">
          {progressItems.length ? (
            <div className="tetrobots-relation__block tetrobots-relation__block--progress">
              <h3>Progression relationnelle</h3>
              <div className="tetrobots-relation__progress">
                {progressItems.map((item) => {
                  const percent = item.target > 0
                    ? Math.max(0, Math.min(100, (item.current / item.target) * 100))
                    : 0;

                  return (
                    <div
                      key={item.id}
                      className={`tetrobots-relation__progress-item tetrobots-relation__progress-item--${
                        item.tone ?? "neutral"
                      }${highlightedGoalId === item.id ? " tetrobots-relation__progress-item--highlighted" : ""}`}
                    >
                      <div className="tetrobots-relation__progress-head">
                        <span>{item.label}</span>
                        <div className="tetrobots-relation__progress-meta">
                          <em className="tetrobots-relation__progress-state">{item.stateLabel}</em>
                          <strong>
                            {Math.min(item.current, item.target)}/{item.target}
                          </strong>
                        </div>
                      </div>
                      <div className="tetrobots-relation__progress-bar" aria-hidden="true">
                        <span style={{ width: `${percent}%` }} />
                      </div>
                      <p className="tetrobots-relation__progress-detail">{item.detail}</p>
                      {item.actionLabel && item.actionTo ? (
                        <Link to={item.actionTo} className="tetrobots-relation__progress-link">
                          {item.actionLabel}
                        </Link>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
