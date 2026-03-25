import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PATHS } from "../../../routes/paths";
import { useAuth } from "../../auth/context/AuthContext";
import {
  fetchTetromazeCommunityLevels,
  toggleTetromazeCommunityLevelLike,
  type TetromazeCommunityLevel,
} from "../services/tetromazeService";
import { TetromazeCommunityLevelCard } from "../components/TetromazeCommunityLevelCard";
import "../../../styles/pixel-protocol-hub.css";

export default function TetromazeCommunityHub() {
  const PAGE_SIZE = 12;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [communityLevels, setCommunityLevels] = useState<TetromazeCommunityLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"top" | "recent" | "mine">("top");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchTetromazeCommunityLevels()
      .then((levels) => {
        if (!cancelled) setCommunityLevels(levels);
      })
      .catch(() => {
        if (cancelled) return;
        setCommunityLevels([]);
        setError("Galerie joueurs indisponible.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleLike = async (level: TetromazeCommunityLevel) => {
    if (!user || level.isOwn) return;
    try {
      const result = await toggleTetromazeCommunityLevelLike(level.id);
      setCommunityLevels((current) =>
        [...current]
          .map((item) =>
            item.id === level.id
              ? { ...item, likedByMe: result.liked, likeCount: result.likeCount }
              : item
          )
          .sort((a, b) => b.likeCount - a.likeCount || b.id - a.id)
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vote impossible pour le moment.");
    }
  };

  const filteredLevels = useMemo(() => {
    const query = search.trim().toLowerCase();
    const next = communityLevels.filter((level) => {
      if (filter === "mine" && !level.isOwn) return false;
      if (!query) return true;
      return `${level.level.name ?? level.level.id} ${level.authorPseudo}`
        .toLowerCase()
        .includes(query);
    });

    next.sort((a, b) => {
      if (filter === "recent") {
        return (
          new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime() ||
          b.likeCount - a.likeCount
        );
      }
      return (
        b.likeCount - a.likeCount ||
        new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()
      );
    });

    return next;
  }, [communityLevels, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredLevels.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedLevels = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLevels.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredLevels]);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  return (
    <div className="pp-hub font-['Press_Start_2P']">
      <div className="pp-hub-shell">
        <h1 className="pp-hub-title">Tetromaze Joueurs</h1>
        <section className="panel pp-hub-card pp-hub-community">
          <div className="pp-hub-community-head">
            <h2 className="text-cyan-200">
              <i className="fa-solid fa-users-viewfinder" aria-hidden="true" /> Galerie communautaire
            </h2>
            <div className="pp-hub-stat">Niveaux: {filteredLevels.length}</div>
          </div>
          <div className="pp-hub-community-toolbar">
            <label className="pp-hub-search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nom ou auteur"
              />
            </label>
            <select value={filter} onChange={(event) => setFilter(event.target.value as "top" | "recent" | "mine")}>
              <option value="top">Plus likes</option>
              <option value="recent">Recents</option>
              <option value="mine">Mes niveaux</option>
            </select>
          </div>
          {loading && <div className="pp-hub-stat">Chargement...</div>}
          {error && <div className="pp-hub-stat text-yellow-300">{error}</div>}
          {!loading && filteredLevels.length === 0 && !error && (
            <div className="pp-hub-stat">Aucun niveau joueur publie pour le moment.</div>
          )}
          {pagedLevels.length > 0 && (
            <div className="pp-hub-community-list">
              {pagedLevels.map((level) => (
                <TetromazeCommunityLevelCard
                  key={level.id}
                  level={level}
                  canLike={Boolean(user)}
                  onPlay={(item) =>
                    navigate(`/tetromaze/play?community=${encodeURIComponent(item.id)}`)
                  }
                  onLike={(item) => void handleToggleLike(item)}
                />
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="pp-hub-pagination">
              <button className="pp-hub-btn" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                <i className="fa-solid fa-chevron-left" aria-hidden="true" /> Prec.
              </button>
              <div className="pp-hub-stat">Page {currentPage}/{totalPages}</div>
              <button className="pp-hub-btn" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                Suiv. <i className="fa-solid fa-chevron-right" aria-hidden="true" />
              </button>
            </div>
          )}
          <div className="pp-hub-divider pp-hub-stack">
            <button
              className="pp-hub-icon-btn pp-hub-icon-btn--secondary"
              title="Retour hub"
              aria-label="Retour hub"
              onClick={() => navigate(PATHS.tetromazeHub)}
            >
              <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
