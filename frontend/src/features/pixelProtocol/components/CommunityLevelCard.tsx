import type { PixelProtocolCommunityLevel } from "../services/pixelProtocolService";

type CommunityLevelCardProps = {
  level: PixelProtocolCommunityLevel;
  compact?: boolean;
  canLike: boolean;
  onPlay: (level: PixelProtocolCommunityLevel) => void;
  onDetail?: (level: PixelProtocolCommunityLevel) => void;
  onLike: (level: PixelProtocolCommunityLevel) => void;
};

export function CommunityLevelCard({
  level,
  compact = false,
  canLike,
  onPlay,
  onDetail,
  onLike,
}: CommunityLevelCardProps) {
  return (
    <article className={`pp-hub-community-card${compact ? " pp-hub-community-card--compact" : ""}`}>
      <div className="pp-hub-community-meta">
        <strong>{level.level.name}</strong>
        <span>{level.authorPseudo}</span>
        <span>{level.likeCount} like{level.likeCount > 1 ? "s" : ""}</span>
        {!compact && (
          <>
            <span>Monde: {level.level.world}</span>
            <span>Orbs requises: {level.level.requiredOrbs}</span>
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
        {onDetail && (
          <button
            className="pp-hub-icon-btn"
            title="Voir le detail"
            aria-label="Voir le detail"
            onClick={() => onDetail(level)}
          >
            <i className="fa-solid fa-circle-info" aria-hidden="true" />
          </button>
        )}
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
