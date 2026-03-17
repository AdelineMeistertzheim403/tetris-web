import type { TetromazeCommunityLevel } from "../services/tetromazeService";

type TetromazeCommunityLevelCardProps = {
  level: TetromazeCommunityLevel;
  compact?: boolean;
  canLike: boolean;
  onPlay: (level: TetromazeCommunityLevel) => void;
  onLike: (level: TetromazeCommunityLevel) => void;
};

export function TetromazeCommunityLevelCard({
  level,
  compact = false,
  canLike,
  onPlay,
  onLike,
}: TetromazeCommunityLevelCardProps) {
  return (
    <article className={`pp-hub-community-card${compact ? " pp-hub-community-card--compact" : ""}`}>
      <div className="pp-hub-community-meta">
        <strong>{level.level.name ?? level.level.id}</strong>
        <span>{level.authorPseudo}</span>
        <span>{level.likeCount} like{level.likeCount > 1 ? "s" : ""}</span>
        {!compact && (
          <>
            <span>Grille: {level.level.grid[0]?.length ?? 0}x{level.level.grid.length}</span>
            <span>Tetrobots: {(level.level.botKinds ?? []).length}</span>
          </>
        )}
      </div>
      <div className="pp-hub-community-actions">
        <button
          className="pp-hub-icon-btn"
          title="Jouer ce niveau"
          aria-label="Jouer ce niveau"
          onClick={() => onPlay(level)}
        >
          <i className="fa-solid fa-play" aria-hidden="true" />
        </button>
        <button
          className={`pp-hub-icon-btn pp-hub-btn--like ${level.likedByMe ? "is-liked" : ""}`}
          title={level.isOwn ? "Ton niveau" : level.likedByMe ? "Retirer like" : "Liker ce niveau"}
          aria-label={level.isOwn ? "Ton niveau" : level.likedByMe ? "Retirer like" : "Liker ce niveau"}
          disabled={!canLike || level.isOwn}
          onClick={() => onLike(level)}
        >
          <i
            className={`fa-solid ${level.likedByMe ? "fa-heart-crack" : "fa-heart"}`}
            aria-hidden="true"
          />
        </button>
      </div>
    </article>
  );
}
