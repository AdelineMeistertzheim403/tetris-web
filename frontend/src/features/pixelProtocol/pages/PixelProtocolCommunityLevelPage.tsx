import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import {
  fetchPixelProtocolCommunityLevel,
  togglePixelProtocolCommunityLevelLike,
  type PixelProtocolCommunityLevel,
} from "../services/pixelProtocolService";
import { CommunityLevelCard } from "../components/CommunityLevelCard";
import "../../../styles/pixel-protocol-hub.css";

export default function PixelProtocolCommunityLevelPage() {
  const navigate = useNavigate();
  const { publishedId } = useParams();
  const { user } = useAuth();
  const { checkAchievements, updateStats } = useAchievements();
  const [level, setLevel] = useState<PixelProtocolCommunityLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = Number.parseInt(publishedId ?? "", 10);
    if (!Number.isFinite(id) || id <= 0) {
      setError("Identifiant invalide.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchPixelProtocolCommunityLevel(id)
      .then((data) => {
        if (cancelled) return;
        setLevel(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Niveau joueur introuvable");
        setLevel(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [publishedId]);

  const handleLike = async () => {
    if (!user || !level || level.isOwn) return;
    try {
      const result = await togglePixelProtocolCommunityLevelLike(level.id);
      if (result.liked && !level.likedByMe) {
        const next = updateStats((prev) => ({
          ...prev,
          counters: {
            ...prev.counters,
            likes_given: (prev.counters.likes_given ?? 0) + 1,
          },
        }));
        checkAchievements({
          mode: "PIXEL_PROTOCOL",
          counters: {
            likes_given: next.counters.likes_given,
          },
        });
      }
      setLevel({
        ...level,
        likedByMe: result.liked,
        likeCount: result.likeCount,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vote impossible");
    }
  };

  return (
    <div className="pp-hub font-['Press_Start_2P']">
      <div className="pp-hub-shell">
        <h1 className="pp-hub-title">Detail niveau joueur</h1>
        <section className="panel pp-hub-card pp-hub-community pp-hub-community-detail">
          {loading && <div className="pp-hub-stat">Chargement...</div>}
          {error && <div className="pp-hub-stat text-yellow-300">{error}</div>}
          {!loading && level && (
            <>
              <CommunityLevelCard
                level={level}
                compact
                canLike={Boolean(user)}
                onPlay={(item) =>
                  navigate(`/pixel-protocol/play?community=${encodeURIComponent(item.id)}`)
                }
                onLike={() => void handleLike()}
              />
              <div className="pp-hub-community-meta">
                <span>Auteur: {level.authorPseudo}</span>
                <span>ID public: {level.id}</span>
                <span>Monde: {level.level.world}</span>
                <span>Likes: {level.likeCount}</span>
                <span>Orbs requises: {level.level.requiredOrbs}</span>
                <span>Plateformes: {level.level.platforms.length}</span>
                <span>Checkpoints: {level.level.checkpoints.length}</span>
                <span>Ennemis: {level.level.enemies.length}</span>
              </div>
              <div className="pp-hub-divider pp-hub-stack">
                <button
                  className="pp-hub-icon-btn pp-hub-icon-btn--secondary"
                  title="Retour galerie"
                  aria-label="Retour galerie"
                  onClick={() => navigate("/pixel-protocol/community")}
                >
                  <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
