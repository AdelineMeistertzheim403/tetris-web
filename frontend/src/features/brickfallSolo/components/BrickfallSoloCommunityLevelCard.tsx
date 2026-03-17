import type { BrickfallSoloCommunityLevel } from "../services/brickfallSoloService";

type Props = {
  level: BrickfallSoloCommunityLevel;
  canLike: boolean;
  onPlay: (level: BrickfallSoloCommunityLevel) => void;
  onLike: (level: BrickfallSoloCommunityLevel) => void;
};

export function BrickfallSoloCommunityLevelCard({
  level,
  canLike,
  onPlay,
  onLike,
}: Props) {
  return (
    <article className="pp-hub-community-card">
      <div className="pp-hub-community-meta">
        <strong>{level.level.name}</strong>
        <span>{level.authorPseudo}</span>
        <span>{level.likeCount} like{level.likeCount > 1 ? "s" : ""}</span>
        <span>Blocs: {level.level.bricks.length}</span>
        <span>Boss: {level.level.boss ? "oui" : "non"}</span>
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
